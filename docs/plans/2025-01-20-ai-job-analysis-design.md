# AI Job Analysis Design

**Date:** 2025-01-20
**Status:** Design Complete
**Feature:** Generate rich, personalized job analysis with external data sources

## Problem

The current AI Job Parser extracts structured fields (company, role, location) but provides no insights for interview preparation. Users receive technical data but lack context about the company, cultural fit, or strategies to stand out.

## Solution

Replace the "Analyze with AI" button with "Gerar Análise" that generates comprehensive markdown analysis. The system will:

- Parse structured fields (current behavior)
- Generate personalized analysis with company research
- Provide interview preparation guidance
- Calculate detailed fit scores with justification

## User Flow

1. User pastes job description
2. Clicks "Gerar Análise"
3. System calls Gemini 2.0 Flash with Google Search
4. Form fields auto-fill with structured data
5. "Análise" field populates with rich markdown (4 sections)
6. User reviews, edits if needed, saves

## Technical Design

### Architecture Changes

**New Files:**

- `lib/ai/user-profile.ts` - Static user profile configuration
- `lib/ai/analysis-prompts.ts` - Prompts for analysis generation
- `lib/ai/validation.ts` - Markdown analysis validation

**Modified Files:**

- `lib/ai/job-parser.ts` - Add `parseJobWithAnalysis()`
- `lib/ai/types.ts` - Add `JobAnalysisResponse` interface
- `lib/ai/config.ts` - Create `createAnalysisModel()` with Google Search
- `app/api/ai/parse-job/route.ts` - Use new analysis function
- `lib/utils/ai-mapper.ts` - Map analysis to form data
- `components/tabs/ai-parser-tab.tsx` - Update button text and loading state
- `components/tabs/manual-entry-tab.tsx` - Rename "Observações" to "Análise"

### Data Model

**User Profile Structure:**

```typescript
interface UserProfile {
  skills: string[]        // Technical and soft skills
  experience: string[]    // Projects, internships, relevant work
  education: string       // Current degree program
  goals: string          // Career objectives
}
```

**Analysis Response:**

```typescript
interface JobAnalysisResponse {
  data: JobDetails              // Structured fields (current)
  analise_markdown: string      // Rich analysis (new)
}
```

**Database:** Field `observacoes` stores generated analysis. No schema changes required.

### Gemini Configuration

**Model:** `gemini-2.0-flash-exp`

**Key Features:**
- Google Search grounding for company research
- Stable model (no experimental quota issues)
- Temperature: 0.1 (consistency)
- Max tokens: 8192

**Configuration:**

```typescript
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  tools: [{ googleSearch: {} }],  // Enable external search
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 8192,
    topP: 0.95,
    topK: 40,
  },
  systemInstruction: ANALYSIS_SYSTEM_PROMPT
})
```

### Analysis Structure

The generated markdown follows this template:

```markdown
# Análise da Vaga - [Cargo] @ [Empresa]

## 🏢 Sobre a Empresa
[Company context, sector, size, culture from external sources]
[Noteworthy points from LinkedIn, Glassdoor, official site]

## 💡 Oportunidades para se Destacar
[How candidate's profile adds specific value]
[Technical and cultural differentiators]
[Areas where candidate excels]

## 🎯 Fit Técnico e Cultural
[Detailed alignment with requirements]
[Fit score (0-5 stars) with justification]
[Gaps identified and how to address them]

## 🗣️ Preparação para Entrevista
[3-5 intelligent questions to ask recruiter]
[Technical topics to study before interview]
[Red flags or points requiring attention]

## 📋 Requisitos e Responsabilidades
**Requisitos Obrigatórios:**
- [list]

**Requisitos Desejáveis:**
- [list]

**Responsabilidades:**
- [list]
```

### Prompt Engineering

The system combines:
- Job description (sanitized)
- User profile (from `user-profile.ts`)
- Instructions for 4-section markdown
- Explicit command to search external data about company

**Key Prompt Elements:**

1. Define expert role (Career Coach with 15 years experience)
2. Provide structured input (job description + candidate profile)
3. Specify dual output (JSON for fields + markdown for analysis)
4. Emphasize external research requirement
5. Define exact markdown structure with emojis

### Validation

**Analysis Validation Rules:**

- Contains all 4 required sections (regex check)
- Minimum 200 characters
- Maximum 10,000 characters
- Falls back to `buildObservacoes()` if validation fails

**Implementation:**

```typescript
function validateAnalysisMarkdown(markdown: string): boolean {
  if (markdown.length < 200 || markdown.length > 10000) return false

  const requiredSections = [
    /## 🏢 Sobre a Empresa/,
    /## 💡 Oportunidades para se Destacar/,
    /## 🎯 Fit Técnico e Cultural/,
    /## 🗣️ Preparação para Entrevista/,
  ]

  return requiredSections.every(regex => regex.test(markdown))
}
```

## Cost and Performance

**Token Usage per Request:**

- Input: ~1000 tokens (description + profile + prompt)
- Output: ~1500-2000 tokens (JSON + markdown analysis)
- Google Search: +200-500 tokens (grounding data)
- **Total: ~3000 tokens per analysis**

**Gemini 2.0 Flash Free Tier:**

- 15 requests/minute
- 1M tokens/day
- **Capacity: ~330 analyses/day**

**Paid Tier:**

- ~$0.001 per analysis
- Higher quotas (150 RPM, 1K RPD)

**Rate Limiting:**

Existing rate limiter (10 req/min) remains sufficient.

## Testing Strategy

**Unit Tests:**

1. `user-profile.test.ts` - Validate profile structure
2. `analysis-prompts.test.ts` - Test prompt generation and sanitization
3. `job-parser.test.ts` - Test `parseJobWithAnalysis()` with mocked responses
4. `validation.test.ts` - Test markdown validation rules

**Integration Tests:**

Update `ai-parser-tab.test.tsx`:
- Verify button text "Gerar Análise"
- Test loading state
- Confirm analysis passed to form data

**Manual Testing:**

Extend `app/test-ai/page.tsx`:
- Add toggle: "Análise Completa" vs "Parsing Simples"
- Display rendered markdown
- Show token usage metrics

**Test Cases:**

1. LinkedIn job description → Full analysis with company research
2. Email from recruiter → Partial analysis (less external data)
3. Company website → Full analysis with culture insights
4. Short description → Fallback to basic parsing
5. Invalid analysis → Fallback to `buildObservacoes()`

## UI Changes

**Button Text:** "Analyze with AI" → "Gerar Análise"

**Loading State:** "Analyzing with AI..." → "Gerando análise..."

**Field Label:** "Observações" → "Análise"

**Placeholder:** "Insights sobre a vaga, fit, preparação para entrevista..."

**No layout changes.** Button and field positions remain unchanged.

## Migration Path

**Phase 1:** Implement analysis generation (this design)

**Phase 2 (future):** Allow user to edit profile in Configurações tab

**Phase 3 (future):** Store analysis history and compare across jobs

**Backward Compatibility:**

- Existing `parseJobWithGemini()` remains available
- Test interface allows switching between modes
- Old data (manual observations) displays without modification

## Success Criteria

1. Button renamed to "Gerar Análise"
2. Analysis field contains rich markdown with 4 sections
3. Analysis includes external company data (when available)
4. Generated analysis helps user prepare for interviews
5. Token usage stays within free tier limits
6. Validation prevents malformed analysis from saving

## Implementation Plan

See `2025-01-20-ai-job-analysis-plan.md` for detailed implementation tasks.

---

**End of Design Document**
