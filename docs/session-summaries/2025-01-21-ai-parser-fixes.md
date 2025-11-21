# Session Summary: AI Job Parser Critical Fixes
**Date:** 2025-01-21
**Status:** ✅ Completed Successfully

## Context
The AI job parser (Gemini-based) was failing with Zod validation errors when Gemini returned `null` for missing fields. Additionally, timeout issues occurred on longer analyses.

## Problems Fixed

### 1. Critical: Zod Validation Rejecting Null Values
**Symptom:**
```
ZodError: Expected string, received null (path: ["structured_data", "local"])
ZodError: Expected 'Presencial' | 'Híbrido' | 'Remoto', received null (path: ["structured_data", "modalidade"])
```

**Root Cause:**
- Gemini API returns `null` for missing/unknown fields
- Zod schema required all fields to be non-null strings/enums
- This happened in both `parseJobWithGemini()` and `parseJobWithAnalysis()` functions

**Solution Applied:**
Updated `JobDetailsSchema` in `lib/ai/types.ts` to accept null and transform to safe defaults:

```typescript
// Before (rejected null):
empresa: z.string().min(1, "Empresa é obrigatória")
modalidade: z.enum(["Presencial", "Híbrido", "Remoto"])

// After (accepts null → defaults):
empresa: z.string().nullable().transform(v => v ?? "")
modalidade: z.enum(["Presencial", "Híbrido", "Remoto"]).nullable().transform(v => v ?? "Presencial")
```

**Transformation Rules:**
- String fields (empresa, cargo, local): `null → ""`
- Enum fields (modalidade, tipo_vaga, idioma_vaga): `null → default value`
- Arrays: `null → []`
- Optional fields: remain nullable

### 2. Secondary: Invalid JSON from Gemini (Unescaped Characters)
**Symptom:**
```
[Job Parser] ❌ Analysis error: Invalid JSON in code fence
```

**Root Cause:**
Gemini was generating JSON with literal newlines in markdown strings instead of escaped `\n`:
```json
{
  "analise_markdown": "# Title
Some text"  // ❌ Literal newline breaks JSON
}
```

**Solution Applied:**
Added explicit escape instructions to `lib/ai/analysis-prompts.ts`:
```
CRÍTICO - ESCAPE DE CARACTERES ESPECIAIS:
- Use \\n para quebras de linha (não newlines literais)
- Escape aspas duplas como \\"
- Escape barras invertidas como \\\\
- O JSON deve ser VÁLIDO quando parseado por JSON.parse()
```

### 3. Timeout Issues on Long Analyses
**Symptom:**
```
[AI Parser] Timeout: Parsing exceeded 30000ms limit
POST /api/ai/parse-job 504 in 30.0s
[Job Parser] ✅ Analysis complete: gemini-2.5-flash (31769ms, 7955 tokens)
```

**Root Cause:**
- Default timeout: 30 seconds (30000ms)
- Complex analyses (7000+ tokens) taking 31-32 seconds
- Timeout happening just before completion

**Solution Applied:**
Increased timeout in `lib/ai/config.ts` from 30s to 60s:
```typescript
// Before:
parsingTimeoutMs: Number.parseInt(process.env.AI_PARSING_TIMEOUT_MS || "30000", 10)

// After:
parsingTimeoutMs: Number.parseInt(process.env.AI_PARSING_TIMEOUT_MS || "60000", 10)
```

## Files Modified

1. **lib/ai/types.ts** (Line 7-30)
   - Updated `JobDetailsSchema` with `.nullable().transform()` for all fields
   - Added documentation about null handling

2. **lib/ai/prompts.ts** (Lines 72-83, 89-103)
   - Updated `REGRAS CRÍTICAS` section
   - Added explicit instructions for handling missing data
   - Updated example JSON format

3. **lib/ai/analysis-prompts.ts** (Lines 99-127)
   - Updated example JSON format
   - Added "CRÍTICO - ESCAPE DE CARACTERES ESPECIAIS" section
   - Added missing data handling instructions

4. **lib/ai/config.ts** (Lines 30-41)
   - Increased `parsingTimeoutMs` from 30000 to 60000
   - Updated comments to reflect new timeout rationale

5. **lib/ai/job-parser.ts** (Lines 13-29)
   - Improved error logging in `extractJsonFromResponse()`
   - Added JSON snippet logging for debugging

## Test Results

### Test 1: Incomplete Job Description
```bash
Input: "Saipem, we believe that innovation thrives through diversity..."
Result: ✅ SUCCESS
- Empresa: "Saipem"
- Cargo: "Estágio em Desenvolvimento de Software" (inferred by Gemini)
- Local: "Rio de Janeiro" (inferred)
- Modalidade: "Presencial" (default)
- No Zod validation errors
```

### Test 2: Complete Job Description with Analysis
```bash
Input: Full job description (Nubank Data Science internship)
Result: ✅ SUCCESS
- All structured fields extracted correctly
- Full analysis markdown generated (2161 tokens, 23.3s)
- No validation errors
- No JSON parsing errors
```

### Test 3: Long Analysis (Priner)
```bash
Before: ❌ Timeout at 30s (analysis took 31.7s, 7955 tokens)
After: ✅ SUCCESS with 60s timeout
```

## Key Learnings

1. **LLM Null Handling:** Always use `.nullable().transform()` in Zod schemas when working with LLM outputs - they naturally return `null` for missing data

2. **JSON Generation from LLMs:** Need explicit instructions about escaping special characters in JSON strings, especially for markdown content

3. **Timeout Configuration:** Analysis generation is variable - depends on:
   - Job description complexity
   - Token count (2000-8000 tokens observed)
   - Gemini API response time (15-35 seconds)
   - 60s timeout provides good safety margin

4. **Progressive Enhancement:** The fix allows incomplete job descriptions to work gracefully:
   - Missing fields → safe defaults
   - User can manually edit after
   - Better UX than hard failure

## Configuration

**Current Settings:**
- Model: `gemini-2.5-flash` (stable, newest flash model)
- Timeout: 60 seconds (60000ms)
- Max output tokens: 8192
- Temperature: 0.1 (low for consistency)

**Environment Variable Override:**
```bash
# .env.local (optional)
AI_PARSING_TIMEOUT_MS=90000  # For even longer analyses
```

## Related Documentation

- Main implementation: `docs/plans/2025-01-17-ai-job-parser-design.md`
- CLAUDE.md section: "AI Job Parser (Phase 1)"
- Model configuration rationale in `lib/ai/config.ts` comments

## Next Steps (Future)

1. Consider caching common company analyses
2. Implement retry logic for transient Gemini errors
3. Add progressive UI feedback (show partial results while analysis completes)
4. Migrate to `@google/genai` SDK for Google Search grounding (external company research)

---

**Status:** All issues resolved. System functioning perfectly for both complete and incomplete job descriptions.
