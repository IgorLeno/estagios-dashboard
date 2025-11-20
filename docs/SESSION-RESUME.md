# Session Resume: AI Job Analysis Feature

**Last Updated:** 2025-01-20
**Status:** Ready for Implementation
**Next Step:** Execute plan with subagent-driven development

---

## What We've Completed

### 1. Brainstorming (Complete ✅)
- Used `superpowers:brainstorming` skill
- Refined feature requirements through Q&A
- Key decisions:
  - Perfil estático no código (not database)
  - Campo "observacoes" vira "Análise" (no schema changes)
  - Gemini 2.0 Flash Experimental com Google Search
  - Um único botão "Gerar Análise" (not two-step)

### 2. Design Document (Complete ✅)
- File: `docs/plans/2025-01-20-ai-job-analysis-design.md`
- Committed: `0cf442e`
- Covers:
  - Architecture (new files, modified files)
  - Data model (UserProfile, JobAnalysisResponse)
  - Gemini configuration with Google Search
  - 4-section markdown structure
  - Validation rules
  - Cost analysis (~3000 tokens per request)

### 3. Implementation Plan (Complete ✅)
- File: `docs/plans/2025-01-20-ai-job-analysis-plan.md`
- 11 tasks with TDD approach
- Bite-sized steps (2-5 min each)
- Complete code examples
- Test-first methodology

---

## Key Architectural Decisions

### User Profile
- **Location:** `lib/ai/user-profile.ts`
- **Type:** Static configuration (hardcoded)
- **Future:** Phase 2 will move to database/Configurações

### Analysis Structure
```markdown
# Análise da Vaga - [Cargo] @ [Empresa]

## 🏢 Sobre a Empresa
## 💡 Oportunidades para se Destacar
## 🎯 Fit Técnico e Cultural
## 🗣️ Preparação para Entrevista
## 📋 Requisitos e Responsabilidades
```

### Gemini Configuration
- **Model:** `gemini-2.0-flash-exp`
- **Tools:** `[{ googleSearch: {} }]` for external data
- **Temperature:** 0.1 (consistency)
- **Max Tokens:** 8192

### Data Flow
1. User pastes job description
2. Clicks "Gerar Análise"
3. `parseJobWithAnalysis()` calls Gemini
4. Returns structured data + markdown analysis
5. Both populate form (analysis in `observacoes` field)
6. User saves vaga

---

## Files to Create (11 Tasks)

### New Files
1. `lib/ai/user-profile.ts` - Static profile config
2. `lib/ai/analysis-prompts.ts` - Prompt generation
3. `lib/ai/validation.ts` - Markdown validation
4. `__tests__/lib/ai/user-profile.test.ts`
5. `__tests__/lib/ai/analysis-prompts.test.ts`
6. `__tests__/lib/ai/validation.test.ts`
7. `__tests__/lib/ai/types.test.ts`
8. `__tests__/lib/utils/ai-mapper.test.ts`

### Files to Modify
1. `lib/ai/types.ts` - Add `JobAnalysisResponse`
2. `lib/ai/config.ts` - Add `createAnalysisModel()`
3. `lib/ai/job-parser.ts` - Add `parseJobWithAnalysis()`
4. `app/api/ai/parse-job/route.ts` - Use new function
5. `lib/utils/ai-mapper.ts` - Support analysis param
6. `components/tabs/ai-parser-tab.tsx` - Update button text
7. `components/tabs/manual-entry-tab.tsx` - Rename field
8. `app/test-ai/page.tsx` - Add analysis toggle

---

## Implementation Approach

**Use:** `superpowers:subagent-driven-development`

**Process:**
1. Dispatch fresh subagent for each task
2. Subagent implements task following TDD
3. Review code between tasks
4. Iterate if issues found
5. Move to next task

**Task Sequence (11 tasks):**
1. User Profile Configuration
2. Analysis Prompts
3. Validation Utilities
4. Update Types
5. Update Config
6. Update Job Parser
7. Update API Route
8. Update AI Mapper
9. Update UI Components (2 subtasks)
10. Update Test Interface
11. Integration Test

---

## Important Context

### Current AI Parser
- **Location:** `lib/ai/job-parser.ts`
- **Function:** `parseJobWithGemini()` (keep for backward compat)
- **Model:** `gemini-2.5-flash` with fallback chain
- **Returns:** `{ data, duration, model, tokenUsage }`

### New Analysis Function
- **Function:** `parseJobWithAnalysis()`
- **Model:** `gemini-2.0-flash-exp` with Google Search
- **Returns:** `{ data, analise, duration, model, tokenUsage }`

### Form Data Structure
- **Type:** `FormData` in `lib/utils/ai-mapper.ts`
- **Field:** `observacoes: string` (stores analysis markdown)
- **UI Label:** "Observações" → "Análise"

### Database
- **Table:** `vagas_estagio`
- **Column:** `observacoes` (text, nullable)
- **No schema changes needed** ✅

---

## Testing Strategy

### Unit Tests (Vitest)
- Test all new utilities
- Mock Gemini API responses
- Validate schemas and types

### Integration Tests
- Test API endpoint with real calls
- Verify full flow in test interface

### Manual Testing
- Use `app/test-ai/page.tsx`
- Test main dashboard flow
- Verify analysis quality

---

## Success Criteria

- ✅ Button renamed to "Gerar Análise"
- ✅ Analysis contains 4 required sections
- ✅ External company data included (Google Search)
- ✅ Validation prevents malformed analysis
- ✅ Token usage within free tier (~3000 tokens/request)
- ✅ All tests passing

---

## Quick Commands

```bash
# Run tests
pnpm test

# Run specific test file
pnpm test -- user-profile

# TypeScript check
pnpm tsc --noEmit

# Lint
pnpm lint

# Dev server
pnpm dev

# Test interface
http://localhost:3000/test-ai
```

---

## Branch Status

- **Current Branch:** `main`
- **Commits:**
  - `0cf442e` - Design document
  - Latest: Implementation plan (about to commit)

**Recommendation:** Create feature branch before implementation

```bash
git checkout -b feat/ai-job-analysis
```

---

## When You Resume

1. Read this file
2. Review `docs/plans/2025-01-20-ai-job-analysis-plan.md`
3. Use skill: `superpowers:subagent-driven-development`
4. Start with Task 1: User Profile Configuration
5. Follow TDD approach in plan

---

**Ready for implementation! 🚀**
