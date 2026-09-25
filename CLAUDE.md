# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 dashboard (Portuguese UI) that is becoming the **read-only visual/analytical layer** of the `job-search` repo. Built with React 19, TypeScript and Tailwind CSS 4. Deployed on Vercel. Migration plan and status: `docs/plans/2026-09-25-job-search-visual-layer.md` — read it before changing architecture.

No AI, no PDF generation, no database: the job-search bots do that work and the Google Sheet is the operational source. The dashboard never writes to the Sheet.

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

- `/` — Main dashboard (Client Component). Tab-based: Estágios, Resumo, Configurações (`?tab=` selects a tab).
- `/vaga/[id]` — Job detail page (read-only)

Pages currently render from an empty in-memory source; the job-search data layer (`lib/job-search/*`, plan WP3) replaces it.

### Core Libraries (`lib/`)

- `types.ts` — Interim types (`VagaEstagio`), replaced by the job-search model in WP3.
- `date-utils.ts` — Date helpers (`getDataInscricao()` returns midnight-based YYYY-MM-DD).
- `utils.ts` — `cn()` and badge/number helpers.

### Component Patterns

- `components/ui/` — Radix UI primitives (shadcn/ui style). Use `cn()` from `lib/utils.ts` for className merging.
- Dashboard components receive data as props; there is no editable vaga state.
- Untrusted text (analysis, postings) is rendered as plain text, never as HTML.

### Styling

CSS variables defined in `app/globals.css` with light/dark themes. Uses Tailwind CSS 4 with `@import "tailwindcss"` syntax. Theme toggled via `next-themes` (default: dark). Color tokens use space-separated RGB values (e.g., `--primary: 99 102 241`).

## Key Domain Concepts

- **Fit Rating**: 0-5 star scale with 0.5 increments (legacy shell only).
- **Sources of truth**: methodology/enums live in the `job-search` Git repo; job state lives in the registry Sheet; structured job analysis arrives through the Sheet `Dossiers` tab. See the plan for the exact contract.

## Environment Variables

None required by the current shell. The data layer adds the Sheet id and a read-only service account (never commit credentials).

## Testing Notes

- Unit tests: `__tests__/` directory mirrors source structure. Use `waitFor` for async assertions (not `waitForNextUpdate`).
- E2E tests: `e2e/` directory, Chromium only, 1 worker against `localhost:3000`.
- Async Server Components: prefer E2E tests over Vitest unit tests.
- Test files: `__tests__/**/*.test.{ts,tsx}` and `lib/**/__tests__/**/*.test.{ts,tsx}` (Vitest include patterns).
- `next.config.mjs` sets `typescript.ignoreBuildErrors`, so `pnpm build` does not type-check: run `pnpm exec tsc --noEmit` as well.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`): lint, format check, unit tests, E2E tests, build, coverage upload (Codecov). Uses JSON reporters with GitHub Summaries.

## Deployment

Vercel. No function timeouts or crons are configured.
