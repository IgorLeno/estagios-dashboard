# AI Resume Generator E2E Tests - Diagnostic Report

**Date**: 2025-12-05
**Status**: 5/6 tests failing
**Analysis Method**: Systematic Debugging (Phase 1 & 2)

---

## Executive Summary

All 5 failing tests are caused by **UI redesign** and **business logic changes** in `components/tabs/curriculo-tab.tsx`. The component was completely rewritten with a new flow:

- **Old flow**: Generate Preview → PDF ready immediately
- **New flow**: Generate Preview (Markdown) → Edit → Generate PDF → Download

Tests were written against the old implementation and need to be aligned with current behavior.

---

## Test Failure Analysis

### Test 1: "deve gerar currículo personalizado com sucesso" ❌

**Expected behavior (by test)**:
- Find text matching `/clique em.*gerar.*preview/i`
- Click "Gerar Preview"
- Verify text "Currículo personalizado" appears
- Verify text "PDF gerado e pronto para download"
- Verify `span.font-mono` shows filename
- Verify buttons "Baixar PDF" and "Refazer" are enabled

**Actual behavior (current implementation)**:
- No text "Clique em... gerar... preview" exists (test fails at line 88)
- After generating preview:
  - Alert shows "Preview Gerado" (not "Currículo personalizado")
  - Markdown textarea appears (editable)
  - Buttons show: "Regenerar" (not "Refazer") and "Gerar PDF"
  - NO filename shown yet (only after clicking "Gerar PDF")
  - NO "Baixar PDF" button yet

**Root cause**: `curriculo-tab.tsx:272-274` has different instructional text. UI completely redesigned.

**Fix needed**: Rewrite test to match new flow and UI elements.

---

### Test 2: "deve permitir regenerar currículo" ❌

**Expected behavior (by test)**:
- Generate resume
- Save initial filename from `span.font-mono`
- Click "Refazer" button
- Confirm dialog
- Verify preview still visible

**Actual behavior (current implementation)**:
- After generating preview, NO filename exists yet
- Test times out at line 124 waiting for `span.font-mono` (timeout 30s)
- Button is called "Regenerar" (not "Refazer")
- Clicking "Regenerar" CLEARS preview (doesn't regenerate)

**Root cause**: Filename only appears after separate "Gerar PDF" step. Test expects old flow where PDF was generated immediately.

**Fix needed**: Adjust test to:
1. Generate preview → Generate PDF → verify filename
2. OR test "Regenerar" clears preview correctly

---

### Test 3: "deve baixar PDF do currículo" ❌

**Expected behavior (by test)**:
- Generate resume
- Wait for preview to show "Currículo personalizado"
- Setup download listener
- Click "Baixar PDF" button
- Verify .pdf file downloaded

**Actual behavior (current implementation)**:
- After generating preview, "Baixar PDF" button doesn't exist
- Test fails at line 162: button not found
- User must click "Gerar PDF" first, THEN "Baixar PDF" appears

**Root cause**: Two-step flow: Preview → Generate PDF → Download

**Fix needed**: Adjust test to follow new flow:
1. Generate preview
2. Click "Gerar PDF"
3. Click "Baixar PDF" (now available)

---

### Test 4: "deve lidar com erro na geração" ❌

**Expected behavior (by test)**:
- Mock API error
- Generate resume
- Wait 1s
- Verify text "Clique em... gerar... preview" still visible
- Verify "Baixar PDF" and "Refazer" disabled

**Actual behavior (current implementation)**:
- Same issue as Test 1: text doesn't exist
- Test fails at line 206
- On error, toast appears (Sonner notification)

**Root cause**: Same UI redesign issue - instructional text changed

**Fix needed**: Instead of checking static text, verify:
- Toast error message appears
- Preview remains empty (no Markdown textarea)
- "Gerar PDF" button doesn't appear

---

### Test 5: "deve validar que jobAnalysisData é necessário antes de gerar currículo" ❌

**Expected behavior (by test)**:
- Open dialog
- Skip job parsing (Tab 1)
- Manually fill data in Tab 2
- Go to Tab 3 (Currículo)
- Verify "Gerar Preview" button is **DISABLED**

**Actual behavior (current implementation)**:
- Button is **ENABLED** (test fails at line 283)
- `curriculo-tab.tsx:313` - button only disabled when `isGenerating === true`
- NO validation for `jobAnalysisData` exists
- Function `handleGeneratePreview()` accepts either `vagaId` OR `jobDescription` (line 76-80, 121-125)

**Root cause**: **Business logic changed** - button doesn't require `jobAnalysisData` anymore

**Fix needed**: **Product decision required**:
- Option A: This is intentional - remove test (feature changed)
- Option B: This is a bug - add validation back to component

---

## Comparison: Expected vs. Actual

| Element/Behavior | Tests Expect | Current Implementation |
|------------------|-------------|------------------------|
| Instructional text | "Clique em... gerar... preview" | "Escolha o idioma e gere um preview..." |
| Preview success message | "Currículo personalizado" | "Preview Gerado" |
| PDF ready message | "PDF gerado e pronto para download" | N/A (PDF generated separately) |
| Filename display timing | Immediately after preview | Only after "Gerar PDF" clicked |
| Regenerate button text | "Refazer" | "Regenerar" |
| Regenerate behavior | Generates new preview | Clears current preview |
| Download flow | 1 step (generate → download) | 2 steps (generate preview → generate PDF → download) |
| jobAnalysisData validation | Required (button disabled) | NOT required (button always enabled) |

---

## Component Architecture (Current)

File: `components/tabs/curriculo-tab.tsx`

### State Management
```typescript
const [resumeLanguage, setResumeLanguage] = useState<"pt" | "en" | "both">("pt")
const [markdownPreviewPt, setMarkdownPreviewPt] = useState("")
const [markdownPreviewEn, setMarkdownPreviewEn] = useState("")
const [pdfBase64Pt, setPdfBase64Pt] = useState<string | null>(null)
const [pdfBase64En, setPdfBase64En] = useState<string | null>(null)

const hasPreview = !!(markdownPreviewPt || markdownPreviewEn)
```

### UI Flow
1. **No preview** (line 312-326):
   - Show "Gerar Preview" button (enabled, no validation)

2. **After preview generated** (line 329-398):
   - Show Alert "Preview Gerado"
   - Show editable Markdown textarea(s)
   - Show buttons: "Regenerar" | "Gerar PDF"

3. **After PDF generated** (line 400-435):
   - Show "PDFs Gerados" section
   - Show file cards with "Baixar" buttons

### Key Functions
- `handleGeneratePreview()` (line 59-170): Calls `/api/ai/generate-resume-html` → converts to Markdown
- `handleConvertToPdf()` (line 172-255): Converts Markdown → HTML → PDF via `/api/ai/html-to-pdf`
- `handleDownloadPdfLocal()` (line 257-265): Downloads base64 PDF

---

## Recommendations

### Priority 1: Critical Decision
**Test 5 - jobAnalysisData validation**
- [ ] Product team: Is jobAnalysisData requirement removed intentionally?
- If YES: Remove/skip test
- If NO: Add validation to component (line 313)

### Priority 2: Test Rewrites
All 5 tests need rewrites to match current implementation:

1. **Test 1** - Adjust selectors and expectations:
   - Remove check for "Clique em... gerar... preview"
   - Verify "Preview Gerado" alert appears
   - Verify Markdown textarea is visible
   - Verify "Regenerar" and "Gerar PDF" buttons appear

2. **Test 2** - Adjust flow:
   - Option A: Test full flow (preview → PDF → filename → regenerate)
   - Option B: Test "Regenerar" clears preview correctly

3. **Test 3** - Add PDF generation step:
   - Generate preview
   - Click "Gerar PDF"
   - Wait for PDF generated
   - Click "Baixar" button
   - Verify download

4. **Test 4** - Adjust error validation:
   - Remove static text check
   - Verify toast error appears
   - Verify preview remains empty
   - Verify "Gerar PDF" button doesn't appear

5. **Test 5** - Depends on product decision

### Priority 3: Test Stability
- Use `data-testid` attributes for critical elements (reduce text dependency)
- Add explicit waits for API responses
- Consider centralizing button text constants

---

## Next Steps

1. ✅ Root cause investigation complete (Phase 1 & 2 of Systematic Debugging)
2. ⏭️ Create implementation plan (mini-plan)
3. ⏭️ Execute rewrites in batches
4. ⏭️ Verify all tests pass
5. ⏭️ Update test coverage documentation

---

## Test Files

- **Test file**: `e2e/resume-generator.spec.ts` (288 lines)
- **Component**: `components/tabs/curriculo-tab.tsx` (458 lines)
- **Helpers**: `e2e/helpers/test-utils.ts`, `e2e/helpers/api-mocks.ts`
