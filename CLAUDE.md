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
