# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 dashboard application for tracking internship applications ("Estágios Dashboard"). Built with React 19, TypeScript, Tailwind CSS 4, and Supabase for authentication and database. Originally generated with v0.app.

## Tech Stack

- **Framework**: Next.js 16.0.0 (App Router)
- **React**: 19.2.0
- **TypeScript**: 5.x with strict mode enabled
- **Styling**: Tailwind CSS 4.1.9 with PostCSS
- **Database/Auth**: Supabase (SSR implementation)
- **UI Components**: Radix UI primitives + custom components
- **Forms**: React Hook Form + Zod validation
- **Analytics**: Vercel Analytics

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

### Supabase Integration

- **Client-side**: `createClient()` from `lib/supabase/client.ts`
- **Server-side**: `createClient()` from `lib/supabase/server.ts` (async function using cookies)
- **Middleware**: Session updates via `lib/supabase/middleware.ts`
- **Tables**: `vagas_estagio`, `metas_diarias`, `inscricoes` (admin)
- **Auth**: Supabase Auth for admin routes

Required environment variables (not in repo):
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

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
- `getDataInscricao()` - Calculates inscription date based on custom day start time (default 06:00)
- If current time < configured start time, returns previous calendar day
- Example: 03:00 Tuesday with 06:00 start = Monday's date
- Used throughout app for consistent date tracking
- Configurable via `configuracoes` table (hora_inicio, hora_termino)

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
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```
