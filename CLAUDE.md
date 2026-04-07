# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 dashboard for tracking internship applications (Portuguese UI). Built with React 19, TypeScript, Tailwind CSS 4, and Supabase. Deployed on Vercel.

## Commands

```bash
pnpm dev                        # Dev server (localhost:3000)
pnpm build                      # Production build
pnpm lint                       # ESLint
pnpm lint:fix                   # ESLint with auto-fix
pnpm format                     # Prettier format all files
pnpm format:check               # Prettier check only

# Unit tests (Vitest + jsdom + React Testing Library)
pnpm test                       # Run all tests once
pnpm test:watch                 # Watch mode
pnpm test -- date-utils         # Run single test file by name
pnpm test:coverage              # Coverage report (v8)

# E2E tests (Playwright, Chromium only)
pnpm test:e2e                   # Run all E2E tests
pnpm test:e2e -- --grep "title" # Run E2E tests matching pattern
pnpm test:e2e:ui                # Playwright UI mode
pnpm test:e2e:debug             # Playwright debug mode
```

## Architecture

### Routing (App Router)

- `/` — Main dashboard (Client Component). Tab-based: Estágios, Resumo, Configurações. State managed locally with useState/useEffect.
- `/vaga/[id]` — Individual job application detail page
- `/admin/login`, `/admin/sign-up` — Auth pages (Server Components, redirect if unauthenticated)
- `/admin/dashboard` — Admin dashboard (Server Component, fetches data server-side, passes to Client Components)
- `/test-ai` — Manual AI feature testing interface
- `/perfil` — User profile page

### API Routes (`app/api/`)

AI-powered features with extended Vercel timeouts (120s for parse-job and generate-resume):

- `ai/parse-job` — Extract structured job data from descriptions (Grok via OpenRouter)
- `ai/generate-resume`, `ai/generate-resume-html`, `ai/refine-resume` — CV personalization and PDF generation
- `ai/generate-cover-letter`, `ai/refine-cover-letter` — Cover letter generation
- `ai/generate-profile`, `ai/extract-profile` — Candidate profile generation
- `ai/html-to-pdf` — HTML to PDF via Puppeteer/`@sparticuz/chromium` (auto-detects serverless)
- `ai/render-resume-html` — Resume HTML rendering
- `vagas/[id]` — CRUD for individual vagas
- `pdf/generate` — PDF generation endpoint
- `resumes/[jobId]` — Resume management per job
- `prompts` — CRUD for AI prompt configuration
- `cron/cleanup-test-data` — Daily cleanup (Vercel cron, 2 AM)

### Core Libraries (`lib/`)

- `types.ts` — All TypeScript interfaces. `VagaEstagio` is the central type (status: Pendente | Avançado | Melou | Contratado; modalidade: Presencial | Híbrido | Remoto).
- `supabase/client.ts` — Client-side Supabase (synchronous, use in `"use client"` components)
- `supabase/server.ts` — Server-side Supabase (async, uses `cookies()` from `next/headers`)
- `supabase/middleware.ts` — Session refresh (called from root `middleware.ts`)
- `supabase/queries.ts` — Shared query functions with test data filtering (`shouldIncludeTestData()`)
- `supabase/prompts.ts` — CRUD for `prompts_config` table
- `ai/` — AI module: job parser, resume generator, cover letter, profile, CV templates (PT/EN), rate limiter, Grok client via OpenRouter
- `ai/config.ts` — `loadUserAIConfig()` loads per-user prompt config from DB, falls back to global defaults
- `date-utils.ts` — `getDataInscricao()` returns midnight-based YYYY-MM-DD date string
- `markdown-parser.ts` — Extracts structured vaga data from markdown analysis files
- `security/openrouter-key-crypto.ts` — Encryption for user OpenRouter API keys

### Component Patterns

- `components/ui/` — Radix UI primitives (shadcn/ui style). Use `cn()` from `lib/utils.ts` for className merging.
- Dashboard components receive data + callbacks as props; mutations trigger parent `loadData()` refetch.
- Forms use React Hook Form + Zod validation throughout.
- Toasts via Sonner (`<Toaster>` in root layout).

### Styling

CSS variables defined in `app/globals.css` with light/dark themes. Uses Tailwind CSS 4 with `@import "tailwindcss"` syntax. Theme toggled via `next-themes` (default: dark). Color tokens use space-separated RGB values (e.g., `--primary: 99 102 241`).

## Key Domain Concepts

- **Fit Rating**: 0-5 star scale with 0.5 increments. Legacy 0-100 or 0-10 values auto-converted via `normalizeRatingForSave()`.
- **Test Data Isolation**: `is_test_data` flag on vagas. Production never shows test data. Dev controlled by `NEXT_PUBLIC_SHOW_TEST_DATA` env var.
- **AI Model**: Uses `x-ai/grok-4.1-fast` via OpenRouter. Config field `modelo_gemini` kept for DB compatibility despite no longer using Gemini.
- **Bilingual CVs**: Resume generation supports PT and EN. Separate fields for each language (`arquivo_cv_url_pt`, `arquivo_cv_url_en`, `curriculo_text_pt`, `curriculo_text_en`).

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENROUTER_API_KEY=...                  # AI features (Grok via OpenRouter)
NEXT_PUBLIC_SHOW_TEST_DATA=false        # true only in .env.test for E2E
```

## Testing Notes

- Unit tests: `__tests__/` directory mirrors source structure. Use `waitFor` for async assertions (not `waitForNextUpdate`).
- E2E tests: `e2e/` directory. Playwright config loads `.env.test` (fallback `.env.local`). Runs sequentially (1 worker) against `localhost:3000`.
- Async Server Components: prefer E2E tests over Vitest unit tests.
- Test files: `__tests__/**/*.test.{ts,tsx}` and `lib/**/__tests__/**/*.test.{ts,tsx}` (Vitest include patterns).

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`): lint, format check, unit tests, E2E tests, build, coverage upload (Codecov). Uses JSON reporters with GitHub Summaries.

## Deployment

Vercel with extended function timeouts in `vercel.json`. Vercel cron runs test data cleanup daily at 2 AM. PDF generation uses `@sparticuz/chromium` in serverless, regular `puppeteer` locally.
