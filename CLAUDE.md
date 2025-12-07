# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Next.js 16 dashboard for tracking internship applications. Built with React 19, TypeScript, Tailwind CSS 4, and Supabase.

## Tech Stack

- **Framework**: Next.js 16.0.0 (App Router), React 19.2.0, TypeScript 5.x
- **Styling**: Tailwind CSS 4.1.9 with custom CSS variables
- **Database/Auth**: Supabase (SSR implementation)
- **UI Components**: Radix UI primitives + custom components
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts 2.15.4
- **Analytics**: Vercel Analytics

## Visual Design System

**Color Palette:**

- Background: `#E0E0E0` - `--background: 224 224 224`
- Cards: `#FFFFFF` - `--card: 255 255 255`
- Primary: `#7B3FED` (purple) - `--primary: 123 63 237`
- Accent: `#00D4FF` (cyan) - `--accent: 0 212 255`
- Sidebar: `#2C3E50` - `--sidebar: 44 62 80`

**Card Styling:** White background, 12px radius, `shadow-md`, `border-border`
**Charts:** Purple lines, cyan dots, 20% opacity grids

## Commands

```bash
pnpm dev              # Development server (localhost:3000)
pnpm build            # Production build
pnpm lint / lint:fix  # ESLint
pnpm format           # Prettier
pnpm test             # Vitest (watch mode)
pnpm test:coverage    # Generate coverage
```

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):

1. Linting (ESLint JSON)
2. Formatting (Prettier)
3. Unit tests (Vitest JSON)
4. E2E tests (Playwright JSON)
5. Build verification
6. Coverage upload (Codecov)

Enhanced test reporting with GitHub Summaries (pass/fail stats, failed test details, JSON artifacts). See `docs/ci-test-reporting.md` for details.

**Required Secrets:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CODECOV_TOKEN` (optional)

## Architecture

### Directory Structure

- `app/` - Next.js pages (main dashboard, vaga/[id], admin routes)
- `components/` - React components + `ui/` primitives (Radix-based)
- `lib/` - Utilities, types, Supabase clients
- `middleware.ts` - Supabase session management

### Data Model (lib/types.ts)

- `VagaEstagio` - Job application (empresa, cargo, local, modalidade, status, etapa, fit, etc.)
- `MetaDiaria` - Daily goal tracking
- `Configuracao` - User settings
- `HistoricoResumo`, `StatusResumo`, `LocalResumo` - Statistics

#### Fit Rating System (⭐ 0-5 Scale)

**Valid Range:** 0.0 to 5.0 with 0.5 increments

- ✅ Valid: 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0
- ❌ Old formats (0-100, 0-10) no longer accepted in forms
- 🔄 Auto-conversion via `normalizeRatingForSave()` for backward compatibility

### Supabase Integration

- **Client-side**: `lib/supabase/client.ts`
- **Server-side**: `lib/supabase/server.ts` (async, uses cookies)
- **Middleware**: `lib/supabase/middleware.ts`
- **Tables**: `vagas_estagio`, `metas_diarias`, `inscricoes`, `prompts_config`

**Environment Variables:**

```env
# .env.local (development)
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
NEXT_PUBLIC_SHOW_TEST_DATA=false

# .env.test (E2E tests only)
NEXT_PUBLIC_SHOW_TEST_DATA=true

# Production (Vercel) - ALWAYS set SHOW_TEST_DATA=false
```

### Path Aliases

Uses `@/*` for root-level imports:

```typescript
import { createClient } from "@/lib/supabase/client"
import { VagaEstagio } from "@/lib/types"
```

## Key Patterns

- **Client vs Server**: Dashboard is client component, admin is server component
- **Data Fetching**: useState + useEffect (client), direct queries (server), manual refetch callbacks
- **Form Handling**: React Hook Form + Zod validation

## Deployment

**Vercel Pro Required** ($20/month) for AI features (120s timeout needed)

**Function Timeouts** (`vercel.json`):

- `/api/ai/parse-job`: 120s
- `/api/ai/generate-resume`: 120s

**Serverless Chromium**: PDF generation uses `@sparticuz/chromium` (auto-detects serverless environment)

See `docs/VERCEL_DEPLOYMENT.md` for troubleshooting.

## Development Workflow Plugins

**Superpowers** (6 skills):

- `brainstorming` → `/superpowers:brainstorm`
- `writing-plans` → `/superpowers:write-plan`
- `executing-plans` → `/superpowers:execute-plan`
- `test-driven-development`, `systematic-debugging`, `verification-before-completion` (auto)

**Playwright Skill**: Browser automation, visual testing

See `.claude/WORKFLOW.md` for workflow examples.

## Common Tasks

**File Upload**: Supabase Storage buckets (`analises`, `curriculos`) with progress tracking
**Markdown Parser** (`lib/markdown-parser.ts`): Extracts structured data from .md analysis files
**Date Utils** (`lib/date-utils.ts`): `getDataInscricao()` returns midnight-based calendar dates

## Testing

**Framework**: Vitest + jsdom + React Testing Library (v16+)

**Important**: Use `waitFor` for async assertions (not `waitForNextUpdate` - removed in v16+)

```typescript
import { renderHook, waitFor } from "@testing-library/react"
const { result } = renderHook(() => useMyHook())
await waitFor(() => expect(result.current.value).toBe(expected))
```

**Async Server Components**: Prefer E2E tests (Playwright) over unit tests due to Vitest limitations.

## AI Job Parser

**Status:** ✅ Implemented

Uses **Grok 4.1 Fast via OpenRouter** to extract structured data from job descriptions.

**Environment:**

```env
OPENROUTER_API_KEY=your_openrouter_api_key
```

Get key at: <https://openrouter.ai/keys>

**Paid Tier**: OpenRouter (pay-per-use)

**Model**: `x-ai/grok-4.1-fast` (fast, high quality)

**Rate Limiter**: 10 req/min (configurable)

### Job Parser Architecture

```text
lib/ai/
├── types.ts          # Interfaces + Zod schemas
├── config.ts         # AI client setup (Grok via OpenRouter)
├── prompts.ts        # LLM prompt templates
└── job-parser.ts     # Core parsing logic

app/api/ai/parse-job/route.ts  # REST API (POST, GET)
app/test-ai/page.tsx            # Test interface
```

### Job Parser API Endpoints

#### POST /api/ai/parse-job

Request:

```json
{ "jobDescription": "string (min 50 chars)" }
```

Response (success):

```json
{
  "success": true,
  "data": {
    "empresa": "Saipem",
    "cargo": "Estagiário QHSE",
    "local": "Guarujá, SP",
    "modalidade": "Híbrido",  // Presencial | Híbrido | Remoto
    "tipo_vaga": "Estágio",   // Estágio | Júnior | Pleno | Sênior
    "requisitos_obrigatorios": [...],
    "requisitos_desejaveis": [...],
    "responsabilidades": [...],
    "beneficios": [...],
    "salario": null,
    "idioma_vaga": "pt"  // pt | en
  },
  "metadata": { "duration": 3245, "model": "x-ai/grok-4.1-fast", "timestamp": "..." }
}
```

**GET /api/ai/parse-job**: Health check

### Job Parser Usage

```typescript
import { parseJobWithAnalysis } from "@/lib/ai/job-parser"

const { data, duration, model } = await parseJobWithAnalysis(jobDescription)
console.log(`Parsed with ${model} in ${duration}ms`)
```

### Testing Job Parser

Manual: <http://localhost:3000/test-ai>
Automated: `pnpm test -- ai`

### Troubleshooting Job Parser

**429 Error**: Wait 1 min, system auto-tries fallback models
**Monitor usage**: <https://ai.dev/usage?tab=rate-limit>

## AI Resume Generator

**Status:** ✅ Implemented

Personalizes CV using **Grok 4.1 Fast** (summary, skills, projects). Generates editable Markdown preview → PDF.

### Markdown Preview Flow

1. API generates HTML → `POST /api/ai/generate-resume-html`
2. HTML → Markdown → User edits in textarea
3. Markdown → HTML → `wrapMarkdownAsHTML()`
4. HTML → PDF → `POST /api/ai/html-to-pdf`

**Key Files:**

- `lib/ai/cv-templates.ts` - PT/EN CV content
- `lib/ai/resume-generator.ts` - LLM personalization
- `lib/ai/markdown-converter.ts` - HTML↔Markdown conversion
- `app/api/ai/generate-resume/route.ts` - REST API
- `app/api/ai/html-to-pdf/route.ts` - PDF generation

### Resume Generator API Endpoints

#### POST /api/ai/generate-resume

Request:

```json
{
  "vagaId": "uuid" | "jobDescription": "text",
  "language": "pt" | "en"
}
```

Response:

```json
{
  "success": true,
  "data": { "pdfBase64": "...", "filename": "cv-igor-fernandes-saipem-pt.pdf" },
  "metadata": { "duration": 5432, "model": "x-ai/grok-4.1-fast", "personalizedSections": [...] }
}
```

**GET /api/ai/generate-resume**: Health check

### Configuration

- **Model**: `x-ai/grok-4.1-fast`, temperature: 0.7
- **Timeout**: 60s
- **Strategy**: Moderate enhancement (no fabrication)

### Testing Resume Generator

Manual: <http://localhost:3000/test-ai>
Unit: `__tests__/lib/ai/resume-generator.test.ts`

## AI Prompts Configuration

**Status:** ✅ Implemented

Customizable prompts for Job Parser and Resume Generator.

**Database**: `prompts_config` table (RLS enabled, global defaults + user overrides)

**Key Files:**

- `lib/types.ts` - `PromptsConfig`, `DEFAULT_PROMPTS_CONFIG`
- `lib/supabase/prompts.ts` - CRUD functions
- `lib/ai/config.ts` - `loadUserAIConfig()`, `getGenerationConfig()`
- `components/configuracoes-prompts.tsx` - UI editor
- `migrations/001_create_prompts_config.sql` - Schema

### Configuration Fields

**Model Settings:**

- `modelo_gemini`: "x-ai/grok-4.1-fast" (field kept for DB compatibility)
- `temperatura`: 0.0-1.0
- `max_tokens`: 512-32768
- `top_p`, `top_k`: Optional

**Editable Prompts:**

1. `dossie_prompt` - Candidate profile
2. `analise_prompt` - Job/candidate fit analysis
3. `curriculo_prompt` - CV personalization rules

### Usage Example

```typescript
import { loadUserAIConfig, getGenerationConfig } from "@/lib/ai/config"

const config = await loadUserAIConfig(userId)
const model = genAI.getGenerativeModel({
  model: config.modelo_gemini, // Now using Grok via OpenRouter
  generationConfig: getGenerationConfig(config),
  systemInstruction: config.curriculo_prompt,
})
```

### Migration

```bash
psql < migrations/001_create_prompts_config.sql
```

Creates table, indexes, triggers, RLS policies, global defaults (user_id = NULL).

### Troubleshooting Prompts Config

- **Config not loading**: Check migration executed, verify global defaults exist
- **RLS blocking**: Verify policies, check `auth.uid()` returns correct user_id
- **Changes not reflecting**: Restart server, verify `loadUserAIConfig()` called before AI API

---

## 🔄 Checkpoint Ativo: Correção de Configurações de IA

**Última atualização:** 2025-12-07 12:12:41
**Arquivo de checkpoint:** `docs/sessions/checkpoint-20251207-121241.md`

**Resumo executivo:**

- Corrigindo bug onde Configurações > Prompts de IA não são aplicadas nas rotas `/api/ai/*`
- Etapa atual: Batch B (de 6 batches) concluído ✅
- Status: ~33.3% concluído (2/6 batches)
- Próximo: Batch C - UI Updates
- Contexto no checkpoint: 55.4% restante (~110k tokens)

**Para retomar:**

```bash
cat docs/sessions/checkpoint-20251207-121241.md
```
