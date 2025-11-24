# Vercel Deployment Guide

## Overview

This document outlines configuration, limitations, and troubleshooting for deploying the Estágios Dashboard to Vercel.

## Configuration

### Function Timeouts

Configured in `vercel.json`:

```json
{
  "functions": {
    "app/api/ai/parse-job/route.ts": {
      "maxDuration": 120
    },
    "app/api/ai/generate-resume/route.ts": {
      "maxDuration": 120
    }
  }
}
```

**Important:** 120-second timeout requires **Vercel Pro plan or higher**.

### Pricing Tier Limitations

| Plan             | Max Function Duration | Price     |
| ---------------- | --------------------- | --------- |
| **Hobby (Free)** | 10 seconds            | Free      |
| **Pro**          | 300 seconds (5 min)   | $20/month |
| **Enterprise**   | 900 seconds (15 min)  | Custom    |

**Current Configuration:** Requires **Pro plan** for AI features (Job Parser and Resume Generator take 30-120 seconds).

### Environment Variables

Required in Vercel Dashboard → Settings → Environment Variables:

```env
GOOGLE_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SHOW_TEST_DATA=false
```

**Production Safety:**

- Always set `NEXT_PUBLIC_SHOW_TEST_DATA=false` in production
- Never commit API keys to version control

## Puppeteer Configuration

### Serverless Chromium

The app uses `@sparticuz/chromium` for PDF generation in serverless environments:

```typescript
// lib/ai/pdf-generator.ts detects environment automatically
if (process.env.VERCEL === "1") {
  // Use @sparticuz/chromium (serverless-compatible)
} else {
  // Use local puppeteer (development)
}
```

**How it works:**

1. Detects Vercel environment via `VERCEL=1` env var
2. Uses `@sparticuz/chromium` for serverless Chrome binary
3. Falls back to local `puppeteer` for development

### Bundle Size Optimization

`@sparticuz/chromium` adds ~50MB to deployment but is required for PDF generation in serverless.

**Alternative:** If bundle size is a concern, consider external PDF rendering services (see Alternatives section).

## Common Deployment Issues

### Issue 1: Function Timeout (504 Gateway Timeout)

**Symptoms:**

```
POST /api/ai/parse-job
Status: 504 Gateway Timeout
```

**Causes:**

1. Function exceeds 10s on Hobby plan
2. Function exceeds configured `maxDuration`
3. Cold start adds 2-5 seconds

**Solutions:**

- Upgrade to Pro plan for 120s timeout
- Optimize LLM prompts to reduce token count
- Implement client-side retry with exponential backoff

### Issue 2: Chrome Not Found (Puppeteer)

**Symptoms:**

```
Error: Could not find Chrome (ver. 142.0.7444.175)
```

**Cause:** Using `puppeteer` instead of `puppeteer-core` + `@sparticuz/chromium`

**Solution:** ✅ Already fixed in `lib/ai/pdf-generator.ts`

### Issue 3: Rate Limits (429 Too Many Requests)

**Symptoms:**

```
POST /api/ai/parse-job
Status: 429 Too Many Requests
```

**Cause:** Gemini API free tier limits exceeded:

- 15 requests/minute
- 1M tokens/day

**Solutions:**

- Wait for rate limit window to reset (shown in error response)
- Upgrade to Gemini paid tier (https://ai.google.dev/pricing)
- Implement client-side rate limiting

### Issue 4: Memory Limit Exceeded

**Symptoms:**

```
Error: JavaScript heap out of memory
```

**Cause:** Puppeteer rendering large PDFs exceeds 1GB memory limit (Hobby) or 3GB (Pro)

**Solutions:**

- Reduce PDF complexity (fewer images, simpler layouts)
- Use external PDF rendering service (see Alternatives)
- Upgrade to Enterprise plan (10GB memory)

## Monitoring and Debugging

### Function Logs

Access logs in Vercel Dashboard:

1. Go to Deployments → Select deployment
2. Click "View Function Logs"
3. Filter by function path (e.g., `/api/ai/parse-job`)

### Performance Metrics

Key metrics to monitor:

- **Duration:** Target <60s for Pro plan
- **Memory:** Target <1GB for Hobby, <3GB for Pro
- **Cold Start:** Typically 2-5s, optimize by reducing bundle size

### Debug Mode

Enable debug logs by setting environment variable:

```env
NODE_ENV=development
```

**Warning:** Never use `development` mode in production (leaks internal errors).

## Alternatives for Cost Optimization

### Option 1: External PDF Service

Replace Puppeteer with external API:

- **PDFShift** (https://pdfshift.io) - $10/month for 500 PDFs
- **HTML to PDF API** (https://htmlpdfapi.com) - $9/month for 1000 PDFs
- **CloudConvert** (https://cloudconvert.com) - Pay-as-you-go

**Pros:**

- No Puppeteer bundle (~50MB smaller)
- No memory concerns
- Faster cold starts

**Cons:**

- External dependency
- Additional API key to manage
- Potential latency

### Option 2: Hybrid Approach

Use Vercel for API routes, external hosting for PDF generation:

- Deploy Next.js app to Vercel
- Deploy Puppeteer worker to Railway/Render ($5/month)
- Call worker via internal API

**Pros:**

- Keep AI features on Vercel
- Offload heavy PDF work
- Lower Vercel tier needed

**Cons:**

- More complex architecture
- Additional hosting cost

### Option 3: Downgrade to Hobby + Reduce Features

If budget is tight:

1. Remove Resume Generator (PDF) feature
2. Keep Job Parser (lightweight, <10s)
3. Stay on Hobby plan

**Tradeoff:** Lose AI resume personalization, keep job parsing.

## Cost Calculator

### Scenario 1: Low Usage (Hobby Plan)

**Assumptions:**

- 100 job parses/month
- No resume generation (requires Pro)
- Average 2s per request

**Cost:** $0/month (Vercel Hobby + Gemini Free Tier)

### Scenario 2: Moderate Usage (Pro Plan)

**Assumptions:**

- 500 job parses/month
- 100 resumes generated/month
- Average 30s per request

**Cost:**

- Vercel Pro: $20/month
- Gemini (within free tier): $0/month
- **Total:** $20/month

### Scenario 3: High Usage (Pro Plan + Paid Gemini)

**Assumptions:**

- 2000 job parses/month
- 500 resumes generated/month
- Exceeds Gemini free tier (1M tokens/day)

**Cost:**

- Vercel Pro: $20/month
- Gemini Tier 1 (~3M tokens/month): ~$15/month
- **Total:** $35/month

## Deployment Checklist

Before deploying to production:

- [ ] Verify all environment variables are set in Vercel Dashboard
- [ ] Confirm `NEXT_PUBLIC_SHOW_TEST_DATA=false` in production
- [ ] Test Job Parser with real job descriptions (3-5 samples)
- [ ] Test Resume Generator with saved vagas (check PDF download)
- [ ] Monitor function duration (ensure <120s)
- [ ] Monitor memory usage (ensure <3GB on Pro)
- [ ] Test error handling (invalid inputs, rate limits)
- [ ] Verify Supabase RLS policies are correct
- [ ] Test CORS configuration (if using custom domain)

## Troubleshooting Commands

### Check Vercel Configuration

```bash
# View current deployment configuration
vercel inspect <deployment-url>

# View environment variables
vercel env ls

# View function logs
vercel logs <deployment-url> --follow
```

### Test API Endpoints

```bash
# Health check (Job Parser)
curl https://your-deployment.vercel.app/api/ai/parse-job

# Health check (Resume Generator)
curl https://your-deployment.vercel.app/api/ai/generate-resume

# Test job parsing (replace with actual job description)
curl -X POST https://your-deployment.vercel.app/api/ai/parse-job \
  -H "Content-Type: application/json" \
  -d '{"jobDescription": "Vaga de estágio..."}'
```

## Support

For Vercel-specific issues:

- Vercel Documentation: https://vercel.com/docs
- Vercel Support: https://vercel.com/support

For application-specific issues:

- GitHub Issues: https://github.com/your-repo/issues
- Project Documentation: `/docs/README.md`
