# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 dashboard application for tracking internship applications ("Estágios Dashboard"). Built with React 19, TypeScript, Tailwind CSS 4, and Supabase for authentication and database. Originally generated with v0.app.

## Tech Stack

- **Framework**: Next.js 16.0.0 (App Router)
- **React**: 19.2.0
- **TypeScript**: 5.x with strict mode enabled
- **Styling**: Tailwind CSS 4.1.9 with PostCSS + custom CSS variables
- **Database/Auth**: Supabase (SSR implementation)
- **UI Components**: Radix UI primitives + custom components
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts 2.15.4 for data visualization
- **Analytics**: Vercel Analytics

## Visual Design System

**Reference:** Modern minimalist dashboard following reference design (2816023.jpg)

**Color Palette:**

- **Background**: `#E0E0E0` (light gray) - `--background: 224 224 224`
- **Cards**: `#FFFFFF` (pure white) - `--card: 255 255 255`
- **Primary**: `#7B3FED` (vibrant purple) - `--primary: 123 63 237`
- **Accent**: `#00D4FF` (cyan) - `--accent: 0 212 255`
- **Sidebar**: `#2C3E50` (dark gray) - `--sidebar: 44 62 80`
- **Text**: `#2C3E50` (dark gray) - `--foreground: 44 62 80`

**Sidebar Design:**

- Width: 256px (w-64)
- Dark gray background (#2C3E50)
- Cyan accent for active items (#00D4FF)
- Icons + text labels for all menu items
- Following pattern: Search, Favorite, Deals, Activities, Charts

**Card Styling:**

- White background (#FFFFFF)
- Border radius: 12px (--radius: 0.75rem)
- Subtle shadows: `shadow-md` for elevation
- Border: `border-border` (gray-200)

**Typography:**

- Primary text: Dark gray (#2C3E50)
- Secondary text: Medium gray (#757575)
- Accent text: Cyan (#00D4FF) for highlights

**Charts & Visualizations:**

- Line charts: Purple (#7B3FED) lines with cyan (#00D4FF) dots
- Responsive containers
- Subtle grids (20% opacity)
- Interactive tooltips

## Development Commands

```bash
# Development server (default: http://localhost:3000)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Code Quality
pnpm lint          # Run ESLint
pnpm lint:fix      # Fix ESLint errors automatically
pnpm format        # Format code with Prettier
pnpm format:check  # Check formatting without changes

# Testing
pnpm test              # Run tests in watch mode
pnpm test:ui           # Run tests with Vitest UI
pnpm test:coverage     # Generate coverage report
pnpm test -- <pattern> # Run specific test file (e.g., pnpm test -- markdown-parser)
```

## CI/CD

GitHub Actions workflow runs on push/PR to main and develop branches:

1. Linting (ESLint)
2. Formatting check (Prettier)
3. Unit tests with coverage
4. Build verification
5. Coverage upload to Codecov

Requires GitHub secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Architecture

### Directory Structure

- `app/` - Next.js App Router pages
  - `page.tsx` - Main dashboard (client component with tabs: Estágios, Resumo, Configurações)
  - `vaga/[id]/page.tsx` - Individual job application details
  - `admin/` - Admin authentication routes (login, sign-up, dashboard)
  - `layout.tsx` - Root layout with metadata and analytics
- `components/` - React components
  - Main components: `dashboard-header.tsx`, `meta-card.tsx`, `vagas-table.tsx`, `resumo-page.tsx`, `configuracoes-page.tsx`, etc.
  - `ui/` - Reusable UI primitives (Radix-based)
- `lib/` - Utilities and client libraries
  - `types.ts` - TypeScript interfaces for the domain model
  - `utils.ts` - Helper functions
  - `supabase/` - Supabase client setup (client.ts, server.ts, middleware.ts)
- `middleware.ts` - Next.js middleware for Supabase session management
- `styles/` - Global styles
- `public/` - Static assets

### Data Model (lib/types.ts)

Core interfaces:

- `VagaEstagio` - Job application with empresa, cargo, local, modalidade, status, etapa, fit, etc.
- `MetaDiaria` - Daily goal tracking (meta, data)
- `Configuracao` - User settings (hora_inicio, hora_termino)
- `HistoricoResumo` - Historical summary data
- `StatusResumo` / `LocalResumo` - Aggregated statistics

#### Fit Rating System (⭐ 0-5 Scale)

**Valid Range**: 0.0 to 5.0 with 0.5 increments

Both `requisitos` (requirements fit) and `perfil` (profile fit) use a **star rating system**:

- ✅ Valid values: 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0
- ❌ Old percentage format (0-100) is **no longer accepted** in forms
- ❌ Old 0-10 scale is **no longer accepted** in forms
- 🔄 Automatic conversion via `normalizeRatingForSave()`:
  - Values > 5 are converted from 0-100 scale (e.g., 85 → 4.5)
  - Markdown parser still accepts old formats for backward compatibility

**Examples**:

```typescript
// Form input (valid)
requisitos: 4.5 // ✅ Direct star rating
perfil: 3.0 // ✅ Direct star rating

// Markdown parsing (auto-converted)
requisitos: 85 // 🔄 Converted to 4.5 (85% → 4.5 stars)
perfil: 8 // 🔄 Converted to 4.0 (8/10 → 4.0 stars)
```

See `lib/utils.ts:normalizeFitValue()` for conversion logic.

### Supabase Integration

- **Client-side**: `createClient()` from `lib/supabase/client.ts`
- **Server-side**: `createClient()` from `lib/supabase/server.ts` (async function using cookies)
- **Middleware**: Session updates via `lib/supabase/middleware.ts`
- **Tables**: `vagas_estagio`, `metas_diarias`, `inscricoes` (admin)
- **Auth**: Supabase Auth for admin routes

Required environment variables (not in repo):

**Development** (`.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SHOW_TEST_DATA=false  # Hide test data in development
```

**Production/Staging** (Vercel Environment Variables):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SHOW_TEST_DATA=false  # ⚠️ OBRIGATÓRIO: Sempre false em ambientes reais
```

**E2E Tests** (`.env.test`):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SHOW_TEST_DATA=true  # ✅ Show test data during E2E tests
```

**Important**:

- `.env.test` is used exclusively by Playwright E2E tests
- Playwright config (`playwright.config.ts`) loads `.env.test` automatically
- Never commit `.env.local` or `.env.test` (covered by `.gitignore`)
- **CRITICAL**: In production/staging environments (Vercel, etc.), always set `NEXT_PUBLIC_SHOW_TEST_DATA=false` to prevent test data from being displayed
- The code has a safety check: if `NODE_ENV === "production"`, test data is never shown regardless of the env var, but it's still best practice to set it explicitly

### Path Aliases

Uses `@/*` for root-level imports:

```typescript
import { createClient } from "@/lib/supabase/client"
import { VagaEstagio } from "@/lib/types"
```

## Key Patterns

### Client vs Server Components

- Main dashboard (`app/page.tsx`) is a client component ("use client") with state management
- Admin dashboard (`app/admin/dashboard/page.tsx`) is a server component with auth check
- Most UI components are client components due to interactivity

### Data Fetching

- Client-side: useState + useEffect with Supabase client
- Server-side: Direct Supabase queries in server components
- Real-time updates: Manual refetch via `loadData()` callbacks

### Form Handling

- React Hook Form + Zod for validation
- Components: `registration-form.tsx`, `add-vaga-dialog.tsx`, `edit-vaga-dialog.tsx`

## Build Configuration

- **ESLint**: Ignored during builds (`ignoreDuringBuilds: true`)
- **TypeScript**: Build errors ignored (`ignoreBuildErrors: true`)
- **Images**: Unoptimized (`unoptimized: true`)

Note: These settings are permissive for rapid development. Tighten for production.

## Code Quality Configuration

**ESLint** ([eslint.config.mjs](eslint.config.mjs))

- Extends `next/core-web-vitals` and `next/typescript`
- Warns on unused vars (allows `_` prefix for ignored params)
- Warns on explicit `any` types
- Warns on `let` when `const` could be used

**Prettier** (package.json)

- Configured for consistent formatting
- Run via `pnpm format` or `pnpm format:check`

**Vitest** ([vitest.config.ts](vitest.config.ts))

- jsdom environment for React component testing
- Global test utilities enabled
- Path alias `@/*` configured
- Coverage via v8 provider (text, json, html reports)
- Setup file: `vitest.setup.ts` for global test configuration

## Deployment

- Auto-deployed to Vercel from v0.app
- Repository syncs automatically with v0.app deployments
- Continue building at: https://v0.app/chat/liFhxJ03Obw

## Development Workflow Plugins

This project uses integrated Claude Code plugins for professional development workflow:

### **Installed Plugins**

**Superpowers** (6 skills):

- `brainstorming` - Refine ideas into designs via `/superpowers:brainstorm`
- `writing-plans` - Create detailed implementation plans via `/superpowers:write-plan`
- `executing-plans` - Execute plans in batches via `/superpowers:execute-plan`
- `test-driven-development` - Auto-activated when implementing features
- `systematic-debugging` - Auto-activated when debugging bugs
- `verification-before-completion` - Auto-activated before marking tasks complete

**Playwright Skill** (1 skill):

- Browser automation and visual testing
- Test flows, validate features, generate screenshots
- Use natural language: "Test [feature] visually"

### **Workflow Integration**

**Complete development cycle:**

1. Plan feature → `/superpowers:brainstorm`
2. Create implementation plan → `/superpowers:write-plan`
3. Execute in batches → `/superpowers:execute-plan`
4. Validate visually → Playwright testing
5. Debug if needed → `systematic-debugging` (auto)
6. Re-validate → Playwright re-test
7. Create persistent tests → Add to test suite

**See `.claude/WORKFLOW.md` for:**

- Detailed examples (expansión de vagas, bug fixes, dark mode)
- Decision tree (quando usar cada plugin)
- Quick reference commands
- Project-specific workflows

## Common Tasks

### Adding a new page

1. Create file in `app/` directory following App Router conventions
2. Use `@/` imports for internal modules
3. Add to navigation if needed (typically in tabs component)

### Creating a new component

1. Add to `components/` directory
2. Follow existing patterns (Radix UI for primitives)
3. Use TypeScript interfaces from `lib/types.ts`

### Modifying data model

1. Update interfaces in `lib/types.ts`
2. Update Supabase schema (not in this repo)
3. Update affected components and queries

### Working with Supabase

- Use server client for Server Components/API routes
- Use client for Client Components
- Always handle errors from Supabase queries
- Use `.single()` for queries expecting one row (may throw PGRST116 error if not found)

### File Upload Architecture

Files are uploaded to Supabase Storage in two buckets:

- `analises` bucket - stores .md analysis files
- `curriculos` bucket - stores PDF/DOCX resume files

Upload flow:

1. User selects file via drag-and-drop or file input
2. File is uploaded to Supabase Storage with progress tracking
3. Public URL is returned and stored in `vagas_estagio` table (`url_analise` or `url_cv`)
4. For .md files, content is fetched and parsed via `parseVagaFromMarkdown()` to auto-fill form fields

Both buckets are configured as public with RLS policies for insert/select/delete.

### Key Utilities

**Markdown Parser** ([lib/markdown-parser.ts](lib/markdown-parser.ts))

- `parseVagaFromMarkdown()` - Extracts structured data from markdown analysis files
- Supports flexible formats: `**Campo**: valor`, `Campo: valor`, or `# Campo\nvalor`
- Maps fields: empresa, cargo, local, modalidade, requisitos (0-100), fit (0-10), etapa, status, observações
- Tested with 11 test cases covering various markdown formats

**Date Utils** ([lib/date-utils.ts](lib/date-utils.ts))

- `getDataInscricao()` - Returns current calendar date (fixed midnight day start)
- Day always starts at 00:00 (midnight) and ends at 23:59
- Example: 03:00 Tuesday = Tuesday's date (standard calendar)
- Used throughout app for consistent date tracking
- **Note**: Previous `hora_inicio` configuration removed - system now uses fixed midnight start

## Testing

### Testing Setup

- **Framework**: Vitest with jsdom environment
- **Testing Libraries**:
  - `@testing-library/react` (v16+) - Component testing
  - `@testing-library/dom` - DOM utilities
  - `@testing-library/jest-dom` - DOM matchers
  - `@testing-library/user-event` - User interaction simulation

### Testing Patterns

#### Testing Hooks

- Use `renderHook` from `@testing-library/react` (v16+)
- **Important**: `waitForNextUpdate` was removed in newer versions
- Use `waitFor` from `@testing-library/react` instead for async assertions:

```typescript
import { renderHook, waitFor } from "@testing-library/react"

const { result } = renderHook(() => useMyHook())

await waitFor(() => {
  expect(result.current.value).toBe(expectedValue)
})
```

#### Async Server Components

- **Vitest Limitation**: Vitest has limitations when testing async Server Components directly
- Server Components that use `async/await` (e.g., `app/admin/dashboard/page.tsx`) require special handling
- **Recommendation**: Prefer E2E tests for async Server Components using tools like Playwright or Cypress
- For unit testing, extract logic to testable functions or test client components that consume server data
- Example of async Server Component that should use E2E tests:
  - `app/admin/dashboard/page.tsx` - Fetches data server-side and requires authentication

### Running Tests

```bash
# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

## AI Job Parser (Phase 1)

**Status:** ✅ Implemented
**Design Document:** `docs/plans/2025-01-17-ai-job-parser-design.md`

### Overview

The AI Job Parser uses Gemini 2.5 Flash to automatically extract structured data from unstructured job descriptions. This eliminates the need for manual data entry when adding new job applications to the dashboard.

**What it does:**

- Accepts raw job description text (from LinkedIn, Indeed, emails, company websites)
- Extracts structured fields: empresa, cargo, local, modalidade, tipo_vaga, requisitos, responsabilidades, benefícios
- Returns validated JSON ready for form auto-fill or database insertion

**What it doesn't do (future phases):**

- Calculate fit scores (Phase 2)
- Generate analysis markdown files (Phase 3)
- Personalize resumes (Phase 4)
- Integrate with main dashboard forms (Phase 5)

### Environment Variables

**Required:**

```env
# .env.local (development)
GOOGLE_API_KEY=your_gemini_api_key_here
```

**How to get API key:**

1. Visit https://aistudio.google.com/app/apikey
2. Create new API key
3. Add to `.env.local`

**Free tier limits:**

- 15 requests/minute per model
- 1M tokens/day total
- Cost per request: ~$0.0003 (if paid tier)

### Model Configuration

The job parser uses **Gemini 2.5 Flash** (stable, newest flash model) for maximum reliability and free tier compatibility.

**Why this model?**

- ✅ Stable and production-ready (no `-exp` suffix)
- ✅ Generous free tier quotas: 15 RPM, 1.5K RPD, 1M TPM
- ✅ Fast response times (~2-4 seconds)
- ✅ High accuracy for structured extraction tasks
- ✅ Latest flash model with improved capabilities

**Important:** Gemini 1.5 Flash does NOT exist. The Gemini 1.5 series only includes Pro models. Flash models start from the 2.0 series onwards.

**Fallback System**

If the primary model encounters rate limits, the system automatically falls back to:

1. `gemini-2.0-flash-001` (older stable flash model)
2. `gemini-2.5-pro` (highest quality, slower)

The system logs which model successfully processed each request in the console and returns it in the API response metadata.

**Upgrading to Paid Tier**

For higher quotas, enable billing in Google Cloud Console:

- Tier 1: 150 RPM, 1K RPD (~$0.075/1K input tokens)
- Documentation: https://ai.google.dev/pricing

### Troubleshooting

#### 429 Error: Quota Exceeded

**Cause:** Rate limit reached for current model.

**Solutions:**

1. Wait for quota reset (typically 1 minute)
2. System automatically tries fallback models
3. Check usage: https://ai.dev/usage?tab=rate-limit
4. Upgrade to paid tier if consistently hitting limits

**Note:** Experimental models (`-exp` suffix) are NOT supported in free tier as of November 2025. The system now uses `gemini-2.5-flash` (stable) to avoid quota issues.

#### Model Selection

To force a specific model (for testing):

```typescript
// In lib/ai/config.ts
export const GEMINI_CONFIG = {
  model: "gemini-2.5-pro", // Override here
  // ...
}
```

Or use the fallback chain by modifying `MODEL_FALLBACK_CHAIN`.

### Architecture

**Directory structure:**

```
lib/ai/
├── types.ts          # TypeScript interfaces + Zod schemas
├── config.ts         # Gemini client configuration
├── prompts.ts        # LLM prompt templates
└── job-parser.ts     # Main parsing logic

app/api/ai/
└── parse-job/
    └── route.ts      # REST API endpoint (POST, GET health check)

app/test-ai/
└── page.tsx          # Test interface for manual validation
```

**Key files:**

1. **`lib/ai/types.ts`** - Type definitions
   - `JobDetails` - Output schema for extracted data
   - `JobDetailsSchema` - Zod validation schema
   - `ParseJobRequest` / `ParseJobResponse` - API types

2. **`lib/ai/config.ts`** - Gemini setup
   - Exports configured GoogleGenerativeAI client
   - Validates `GOOGLE_API_KEY` presence
   - Model: `gemini-1.5-flash` (with automatic fallback chain)
   - Exports `MODEL_FALLBACK_CHAIN` for resilience

3. **`lib/ai/prompts.ts`** - Prompt engineering
   - `JOB_EXTRACTION_PROMPT` - Template for data extraction
   - Emphasizes exact extraction, no hallucination
   - Specifies JSON output format

4. **`lib/ai/job-parser.ts`** - Core logic
   - `parseJobWithGemini(description: string)` - Main function
   - Calls Gemini API
   - Extracts JSON from response (handles code fences)
   - Validates with Zod
   - Returns typed data + metadata (duration, model)

5. **`app/api/ai/parse-job/route.ts`** - HTTP endpoint
   - `POST /api/ai/parse-job` - Parse job description
   - `GET /api/ai/parse-job` - Health check
   - Error handling for validation, API failures, rate limits

6. **`app/test-ai/page.tsx`** - Test UI
   - Interactive interface for testing parser
   - Pre-loaded example job description
   - Displays human-readable results + JSON
   - Character counter, loading states, error display

### API Endpoints

#### POST /api/ai/parse-job

Parse a job description and extract structured data.

**Request:**

```typescript
{
  "jobDescription": string  // Min 50 characters
}
```

**Response (success):**

```typescript
{
  "success": true,
  "data": {
    "empresa": "Saipem",
    "cargo": "Estagiário QHSE",
    "local": "Guarujá, São Paulo",
    "modalidade": "Híbrido",  // Presencial | Híbrido | Remoto
    "tipo_vaga": "Estágio",   // Estágio | Júnior | Pleno | Sênior
    "requisitos_obrigatorios": ["Engenharia Química", "Inglês intermediário"],
    "requisitos_desejaveis": ["ISO 9001:2015"],
    "responsabilidades": ["Monitoramento de registros", "Suporte em KPIs"],
    "beneficios": ["Seguro saúde", "Vale refeição"],
    "salario": null,  // string or null
    "idioma_vaga": "pt"  // pt | en
  },
  "metadata": {
    "duration": 3245,  // milliseconds
    "model": "gemini-1.5-flash",  // Actual model used (from fallback chain)
    "timestamp": "2025-01-17T21:30:00.000Z"
  }
}
```

**Response (error):**

```typescript
{
  "success": false,
  "error": "Error message",
  "details": {...}  // Optional validation details
}
```

**Status codes:**

- `200` - Success
- `400` - Invalid input (validation error)
- `429` - Rate limit exceeded
- `500` - Server error (API failure, config error)

#### GET /api/ai/parse-job

Health check endpoint.

**Response:**

```typescript
{
  "status": "ok" | "error",
  "message": string,
  "model": "gemini-1.5-flash"  // Current primary model
}
```

### Usage Patterns

#### Direct API call (curl)

```bash
curl -X POST http://localhost:3000/api/ai/parse-job \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "Vaga de Estágio em Engenharia..."
  }'
```

#### Client-side fetch (React)

```typescript
import type { ParseJobResponse, ParseJobErrorResponse } from "@/lib/ai/types"

async function parseJob(description: string) {
  const response = await fetch("/api/ai/parse-job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobDescription: description }),
  })

  const result: ParseJobResponse | ParseJobErrorResponse = await response.json()

  if (result.success) {
    console.log("Parsed data:", result.data)
    console.log("Duration:", result.metadata.duration, "ms")
    // Use result.data to auto-fill form
  } else {
    console.error("Parse error:", result.error)
  }
}
```

#### Server-side (API route or Server Component)

```typescript
import { parseJobWithGemini } from "@/lib/ai/job-parser"

// In API route or Server Action
const { data, duration, model } = await parseJobWithGemini(jobDescription)
// data is validated JobDetails type
// model is the actual model used (from fallback chain)
console.log(`Parsed with ${model} in ${duration}ms`)
```

### Testing

#### Manual testing via UI

1. Start dev server: `pnpm dev`
2. Navigate to http://localhost:3000/test-ai
3. Paste job description (or use pre-loaded example)
4. Click "Parse Job"
5. Review extracted data

**Expected fields:**

- ✅ Empresa, Cargo, Local
- ✅ Modalidade (must be one of: Presencial, Híbrido, Remoto)
- ✅ Tipo de Vaga (must be one of: Estágio, Júnior, Pleno, Sênior)
- ✅ Arrays: requisitos_obrigatorios, requisitos_desejaveis, responsabilidades, beneficios
- ✅ Salario (string or null)
- ✅ Idioma (pt or en)

#### Testing with real sources

Test with job descriptions from:

1. **LinkedIn** (structured format) - Expected accuracy: 95%+
2. **E-mail de recrutador** (semi-structured) - Expected accuracy: 80%+
3. **Site de empresa** (texto corrido) - Expected accuracy: 70%+

#### Automated testing

Currently, only utility functions are tested (not full LLM calls to avoid costs):

```bash
# Test JSON extraction and validation logic
pnpm test -- ai
```

### Rate Limits and Costs

**Gemini Free Tier:**

- 15 requests/minute (Gemini's documented free tier API limit)
- 1M tokens/day
- Sufficient for ~1000 parsings/day

**Application Rate Limiter:**

- Configured to 10 requests/minute in `rate-limiter.ts` (intentionally lower than Gemini's 15 requests/minute limit as a conservative buffer)
- This safety margin prevents exceeding API quotas and eases burst handling and retry logic
- The lower app limit provides a buffer zone to handle traffic spikes and retry attempts without hitting Gemini's hard limits

**Typical usage:**

- Input: ~500 tokens (job description)
- Output: ~200 tokens (JSON response)
- Total per request: ~700 tokens
- Cost (paid tier): ~$0.0003 per request

**Rate limit handling:**

- API returns 429 status with retry delay
- Error message includes retry time
- Client should implement exponential backoff if needed

**Monitoring usage:**

- Dashboard: https://ai.dev/usage?tab=rate-limit
- Quotas: https://ai.google.dev/gemini-api/docs/rate-limits

### Advanced Configuration

**Model Settings:**

```typescript
{
  temperature: 0.1,      // Low temperature for consistency
  maxOutputTokens: 8192,
  topP: 0.95,
  topK: 40
}
```

**Why Gemini 1.5 Flash:**

- ✅ Stable model (production-ready, no `-exp` suffix)
- ✅ Fast response time (~2-3 seconds)
- ✅ Generous free tier quotas (15 RPM, 1.5K RPD)
- ✅ Strong structured output capabilities
- ✅ Reliable JSON generation
- ✅ Automatic fallback to alternative models if quota exceeded

### Error Handling

**Common errors and solutions:**

1. **Missing API key**

   ```
   Error: GOOGLE_API_KEY not found in environment
   Solution: Add key to .env.local
   ```

2. **Invalid input**

   ```
   Error: Job description must be at least 50 characters
   Solution: Provide more complete description
   ```

3. **Rate limit exceeded**

   ```
   Error: Too Many Requests - retry in 23s
   Solution: Wait for rate limit window to reset
   ```

4. **Invalid JSON response**

   ```
   Error: LLM did not return valid JSON
   Solution: Check prompt formatting, retry once
   ```

5. **Validation error**
   ```
   Error: Invalid job details: modalidade must be one of...
   Solution: Check extracted data, adjust prompt if needed
   ```

### Future Phases

**Phase 2: Fit Calculator**

- Compare candidate profile vs job requirements
- Calculate `requisitos` (0-5 stars) and `fit` (0-5 stars) scores
- Generate justifications

**Phase 3: Analysis Writer**

- Generate complete `analise-vaga.md` file
- Follow `modelo-analise.md` template
- Include detailed analysis sections

**Phase 4: Resume Personalizer**

- Adjust CV RESUMO section for specific job
- Highlight relevant skills
- Generate PT and EN versions

**Phase 5: Dashboard Integration**

- Add "Parse from description" button in `add-vaga-dialog.tsx`
- Auto-fill form fields with extracted data
- Allow manual edits before saving

### Troubleshooting

**Parser returns empty arrays**

- Job description may be too short or unclear
- Try more structured input (include section headings like "Requisitos:", "Benefícios:")

**Wrong modalidade or tipo_vaga**

- Prompt emphasizes exact values
- If mismatch persists, check if source uses non-standard terminology

**Parsing is slow (>10s)**

- Check network connection
- Gemini cold start can add ~500ms
- Typical response time: 2-5 seconds

**Quota exceeded frequently**

- Monitor usage at https://ai.dev/usage
- Consider upgrading to paid tier if needed
- Implement client-side caching for repeated queries

### Reference

**Design document:** `docs/plans/2025-01-17-ai-job-parser-design.md`
**Gemini docs:** https://ai.google.dev/gemini-api/docs
**Pricing:** https://ai.google.dev/pricing
**SDK:** https://github.com/google/generative-ai-js

## AI Resume Generator

**Status:** ✅ Implemented
**Design Document:** `docs/plans/2025-01-21-tailored-resume-generator-design.md`
**Implementation Plan:** `docs/plans/2025-01-21-ai-resume-generator-implementation.md`

### Overview

The AI Resume Generator personalizes CV content to match job descriptions using Gemini 2.5 Flash. It tailors three sections—Professional Summary, Skills & Tools, and Research Projects—while maintaining exact formatting from CV templates.

**What it does:**

- Personalizes CV summary with job keywords
- Reorders skills by relevance to job requirements
- Rewrites project descriptions to emphasize job-relevant work
- Generates professional PDF matching original CV design
- Supports Portuguese and English

**What it doesn't do:**

- Fabricate skills or experience (moderate smart enhancement only)
- Store resumes in database (future phase)
- Calculate ATS scores (future phase)

### Architecture

**Components:**

1. **CV Templates** (`lib/ai/cv-templates.ts`) - PT/EN CV content as TypeScript objects
2. **Resume Generator** (`lib/ai/resume-generator.ts`) - LLM personalization logic
3. **Resume Prompts** (`lib/ai/resume-prompts.ts`) - LLM prompt templates
4. **PDF Generator** (`lib/ai/pdf-generator.ts`) - Puppeteer PDF rendering
5. **HTML Template** (`lib/ai/resume-html-template.ts`) - HTML/CSS matching CV design
6. **API Endpoint** (`app/api/ai/generate-resume/route.ts`) - REST API
7. **Frontend Components** - `ResumeGeneratorButton`, `ResumeGeneratorDialog`

### API Endpoints

#### POST /api/ai/generate-resume

Generate tailored resume from vaga or job description.

**Request:**

```typescript
{
  vagaId?: string           // Option 1: From existing vaga
  jobDescription?: string   // Option 2: From raw text
  language: "pt" | "en"     // Required
}
```

**Response (success):**

```typescript
{
  success: true,
  data: {
    pdfBase64: string,        // Base64-encoded PDF
    filename: string,         // e.g., "cv-igor-fernandes-saipem-pt.pdf"
  },
  metadata: {
    duration: number,         // milliseconds
    model: string,            // "gemini-2.5-flash"
    tokenUsage: { ... },
    personalizedSections: ["summary", "skills", "projects"]
  }
}
```

#### GET /api/ai/generate-resume

Health check endpoint.

### Usage Patterns

#### Client-side (React component)

```typescript
import { ResumeGeneratorButton } from "@/components/resume-generator-button"

// In component
<ResumeGeneratorButton vagaId={vaga.id} />
// or
<ResumeGeneratorButton jobDescription={description} />
```

#### API call (fetch)

```typescript
const response = await fetch("/api/ai/generate-resume", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    vagaId: "uuid-here",
    language: "pt",
  }),
})

const result = await response.json()
if (result.success) {
  // Download PDF from result.data.pdfBase64
}
```

### Configuration

**Model:** `gemini-2.5-flash` (same as job parser)
**Temperature:** `0.3` (slightly higher for creativity)
**Timeout:** 60 seconds
**Token Limit:** 4096 per section

### Personalization Strategy

**Moderate Smart Enhancement:**

- Summary: Include top 5-7 job keywords, 80-120 words
- Skills: Reorder by relevance, add ONLY if projects demonstrate them
- Projects: Rewrite descriptions to emphasize job-relevant aspects
- **No fabrication:** All claims must be backed by existing CV content

### Integration Points

1. **Test AI Page** (`app/test-ai/page.tsx`) - Generate after parsing job
2. **Vaga Details Page** (future) - Generate for any existing vaga

### Testing

**Unit Tests:**

- `__tests__/lib/ai/resume-generator.test.ts` - Core logic
- `__tests__/lib/ai/pdf-generator.test.ts` - PDF utilities
- `__tests__/app/api/ai/generate-resume/route.test.ts` - API endpoint

**Manual Testing:**

```bash
# Start dev server
pnpm dev

# Test health check
curl http://localhost:3000/api/ai/generate-resume

# Test generation (see test-resume-api.sh)
./test-resume-api.sh
```

### Troubleshooting

**Puppeteer errors on Vercel:**

- Ensure `--no-sandbox` and `--disable-setuid-sandbox` args are set
- Check Vercel function timeout (60s limit)

**PDF not matching CV design:**

- Verify HTML template matches `saipem-cv-igor_fernandes.pdf`
- Check inline CSS styles
- Test with `page.pdf({ printBackground: true })`

**LLM fabricating skills:**

- Review prompts in `resume-prompts.ts`
- Ensure "ONLY if projects demonstrate" constraint is clear
- Lower temperature if needed

### Future Enhancements

**Phase 2: ATS Scoring**

- Calculate keyword match percentage
- Highlight missing keywords
- Suggest improvements

**Phase 3: Resume Storage**

- Save generated PDFs to Supabase Storage
- Link to `vagas_estagio` table
- Version history

**Phase 4: Custom Templates**

- Allow users to upload custom CV templates
- Template editor UI
- Multi-template support
