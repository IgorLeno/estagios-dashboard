# AI Resume Generator E2E Tests - Complementary Implementation Plan

**Created**: 2025-12-05
**Based on**: Systematic Debugging diagnosis (see `resume-generator-diagnosis.md`)
**Goal**: Align 5 failing E2E tests with current component implementation
**Execution**: Small batches with verification between each

---

## Overview

All 5 tests are **misaligned** with current implementation due to:
- UI redesign (text changes, new elements)
- Flow changes (Preview → Edit → Generate PDF → Download)
- Business logic changes (jobAnalysisData no longer required?)

**Strategy**: Rewrite tests to reflect **actual user flows** in production, not implementation details.

---

## Batch A: Happy Path - Generate & Regenerate Preview

### Test 1: "deve gerar currículo personalizado com sucesso"

**Decision**: ✏️ **AJUSTAR** (rewrite to match new flow)

**Why**: Flow is valid, but UI elements and expectations changed completely.

**What will be verified**:

1. **Setup**: Parse job description → Navigate to Currículo tab
2. **Initial state**:
   - Language selector visible (PT/EN/Ambos buttons)
   - "Gerar Preview" button visible and enabled
   - NO preview visible yet
3. **Generate preview**:
   - Click "Gerar Preview"
   - Wait for API response (mocked)
4. **Success state**:
   - Alert with title "Preview Gerado" visible
   - Markdown textarea visible (editable)
   - "Regenerar" button visible and enabled
   - "Gerar PDF" button visible and enabled
   - NO PDF download section yet (separate step)

**Recommended selectors**:

```typescript
// Use roles + accessible names (more stable)
const generateButton = dialog.getByRole("button", { name: /gerar preview/i })
const regenerarButton = dialog.getByRole("button", { name: /regenerar/i })
const gerarPdfButton = dialog.getByRole("button", { name: /gerar pdf/i })

// Alert uses heading role
const previewAlert = dialog.getByRole("heading", { name: /preview gerado/i })

// Textarea for Markdown (if only one visible, simpler selector)
const markdownTextarea = dialog.locator("textarea").first()

// Alternative: Add data-testid to component
const markdownTextarea = dialog.getByTestId("markdown-preview-pt")
```

**Improvement**: Add `data-testid` attributes to `curriculo-tab.tsx`:
- `data-testid="curriculo-gerar-preview-button"`
- `data-testid="curriculo-regenerar-button"`
- `data-testid="curriculo-gerar-pdf-button"`
- `data-testid="markdown-preview-pt"`
- `data-testid="markdown-preview-en"`

---

### Test 2: "deve permitir regenerar currículo"

**Decision**: ✏️ **AJUSTAR** (test new "Regenerar" behavior)

**Why**: "Regenerar" button behavior changed - it now CLEARS preview instead of regenerating a new one.

**What will be verified**:

1. **Setup**: Generate preview successfully (from Test 1)
2. **Verify preview exists**:
   - Alert "Preview Gerado" visible
   - Markdown textarea has content (`expect(textarea).not.toHaveValue("")`)
3. **Click "Regenerar"**:
   - NO confirmation dialog (clicking directly clears)
4. **Verify preview cleared**:
   - Alert "Preview Gerado" NOT visible
   - Markdown textarea NOT visible
   - "Gerar Preview" button visible again (back to initial state)

**Alternative test**: If we want to test "regenerating" (not clearing), test should:
1. Generate preview PT
2. Verify Markdown content exists
3. Click "Gerar Preview" again
4. Verify new Markdown content (may be identical for same job, which is OK)

**Recommended selectors**: Same as Test 1

**Note**: Current implementation (line 372-377) CLEARS preview. If product wants regeneration instead, component needs change.

---

## Batch B: Errors & Validations

### Test 4: "deve lidar com erro na geração"

**Decision**: ✏️ **AJUSTAR** (validate error handling, not static text)

**Why**: Flow is valid (test error handling), but validation method changed (toast instead of static text).

**What will be verified**:

1. **Setup**:
   - Mock parse job success
   - Mock generate resume **ERROR**
   - Navigate to Currículo tab
2. **Initial state**: "Gerar Preview" button visible
3. **Trigger error**:
   - Click "Gerar Preview"
   - Wait for API error response (mocked)
4. **Verify error handling**:
   - Toast error message appears (Sonner)
   - Preview remains empty (no Alert, no textarea)
   - "Gerar Preview" button still visible and enabled (allows retry)
   - NO "Gerar PDF" button appears

**Recommended selectors**:

```typescript
// Toast verification (Sonner uses role="status")
const errorToast = page.locator('[role="status"]').filter({ hasText: /erro ao gerar preview/i })
await expect(errorToast).toBeVisible({ timeout: 5000 })

// Verify preview NOT generated
const previewAlert = dialog.getByRole("heading", { name: /preview gerado/i })
await expect(previewAlert).not.toBeVisible()

const markdownTextarea = dialog.locator("textarea")
await expect(markdownTextarea).not.toBeVisible()
```

**Improvement**: Component could return more specific error messages (e.g., "Erro ao conectar com API", "Timeout", etc.) for better UX testing.

---

### Test 5: "deve validar que jobAnalysisData é necessário antes de gerar currículo"

**Decision**: ⏸️ **DECISÃO PENDENTE** (requires product input)

**Why**: **Business logic changed** - button no longer validates `jobAnalysisData`. Need to confirm if intentional.

**Current behavior**:
- Button always enabled (line 313: `disabled={isGenerating}`)
- API accepts `vagaId` OR `jobDescription` (either works)

**Options**:

#### Option A: Change was intentional → Remove test
- Feature allows generating resume without AI job analysis
- User can paste job description directly
- **Action**: Delete test or mark as skipped with comment

#### Option B: Change was unintentional → Fix component
- Add validation: `disabled={isGenerating || !jobAnalysisData}`
- Require AI analysis before resume generation
- **Action**: Fix component, keep test

#### Option C: Hybrid approach → Adjust test
- Button enabled if EITHER `jobAnalysisData` OR `jobDescription` exists
- **Action**: Rewrite test to verify: button disabled ONLY if BOTH are missing

**Recommended**: 🤝 **Ask product team** before proceeding with this test.

**If Option C chosen**, test becomes:

```typescript
test("deve validar que dados da vaga são necessários antes de gerar currículo", async ({ page }) => {
  await page.getByRole("button", { name: /adicionar estágio/i }).click()

  const dialog = page.getByRole("dialog")
  const curriculoTab = dialog.getByRole("tab", { name: /currículo/i })
  await curriculoTab.click()

  // No jobAnalysisData, no jobDescription → button DISABLED
  const generateButton = dialog.getByRole("button", { name: /gerar preview/i })
  await expect(generateButton).toBeDisabled()

  // Fill jobDescription → button ENABLED
  const dadosTab = dialog.getByRole("tab", { name: /dados da vaga/i })
  await dadosTab.click()

  const empresaInput = dialog.getByLabel(/empresa/i)
  await empresaInput.fill("Test Company")

  await curriculoTab.click()
  await expect(generateButton).toBeEnabled()
})
```

---

## Batch C: PDF Generation & Download

### Test 3: "deve baixar PDF do currículo"

**Decision**: ✏️ **AJUSTAR** (add PDF generation step)

**Why**: Flow changed - preview and PDF are now separate steps.

**What will be verified**:

1. **Setup**: Generate preview successfully (from Test 1)
2. **Verify preview exists**:
   - Markdown textarea visible
   - "Gerar PDF" button visible
3. **Generate PDF**:
   - Click "Gerar PDF"
   - Wait for conversion (mocked or short timeout)
4. **Verify PDF generated**:
   - Toast success "PDF(s) gerado(s) com sucesso!"
   - "PDFs Gerados" section visible
   - File card with filename visible (e.g., `cv-igor-fernandes-pt.pdf`)
   - "Baixar" button visible (Download icon)
5. **Download PDF**:
   - Setup download listener
   - Click "Baixar" button
   - Verify .pdf file downloaded

**Recommended selectors**:

```typescript
// PDF generation
const gerarPdfButton = dialog.getByRole("button", { name: /gerar pdf/i })
await gerarPdfButton.click()

// Wait for PDF section
const pdfSection = dialog.getByText(/pdfs gerados/i)
await expect(pdfSection).toBeVisible({ timeout: 10000 })

// File card (contains filename + download button)
const fileCard = dialog.locator(".bg-slate-50").filter({ hasText: /cv-igor-fernandes.*\.pdf/i })
await expect(fileCard).toBeVisible()

// Download button within card
const downloadButton = fileCard.getByRole("button")
await expect(downloadButton).toBeEnabled()

// Setup download listener
const downloadPromise = page.waitForEvent("download")
await downloadButton.click()

const download = await downloadPromise
expect(download.suggestedFilename()).toMatch(/\.pdf$/)
```

**Challenge**: Mocking PDF generation requires:
- Mock `/api/ai/generate-resume-html` (already done)
- Mock `/api/ai/html-to-pdf` (needs to be added to `api-mocks.ts`)

**New mock needed**:

```typescript
// e2e/helpers/api-mocks.ts
export async function mockHtmlToPdfSuccess(page: Page) {
  await page.route("**/api/ai/html-to-pdf", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          pdfBase64: "JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVGl0bGUgKP7/AEUAeABhAG0AcABsAGUpCi9DcmVhdG9yIChQdXBwZXRlZXIpCi9Qcm9kdWNlciAoU2tpYS9QREYgbTExMCkKL0NyZWF0aW9uRGF0ZSAoRDoyMDI0MDEwMTAwMDAwMCkKPj4KZW5kb2JqCjIgMCBvYmo8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMyAwIFIKPj4KZW5kb2JqCjMgMCBvYmo8PAovVHlwZSAvUGFnZXMKL0NvdW50IDEKL0tpZHMgWzQgMCBSXQo+PgplbmRvYmoKNCAwIG9iago8PAovVHlwZSAvUGFnZQovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovUGFyZW50IDMgMCBSCi9Db250ZW50cyA1IDAgUgovUmVzb3VyY2VzIDw8Cj4+Cj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggMgo+PgpzdHJlYW0KCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAxMjQgMDAwMDAgbiAKMDAwMDAwMDE3MyAwMDAwMCBuIAowMDAwMDAwMjMwIDAwMDAwIG4gCjAwMDAwMDAzNDIgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDIgMCBSCi9JbmZvIDEgMCBSCj4+CnN0YXJ0eHJlZgo0MDUKJSVFT0YK",
          filename: "cv-igor-fernandes-pt.pdf",
        },
      }),
    })
  })
}
```

---

## Test Stability Improvements

### 1. Add `data-testid` attributes to component

**File**: `components/tabs/curriculo-tab.tsx`

Add to key elements:
- Line 313: `<Button data-testid="curriculo-gerar-preview-button" ...`
- Line 344: `<Textarea data-testid="markdown-preview-pt" ...`
- Line 358: `<Textarea data-testid="markdown-preview-en" ...`
- Line 371: `<Button data-testid="curriculo-regenerar-button" ...`
- Line 383: `<Button data-testid="curriculo-gerar-pdf-button" ...`
- Line 409: `<Button data-testid="download-pdf-pt-button" ...`
- Line 419: `<Button data-testid="download-pdf-en-button" ...`

### 2. Centralize button text (optional)

**File**: `e2e/helpers/test-constants.ts` (new)

```typescript
export const CURRICULO_TAB = {
  buttons: {
    gerarPreview: /gerar preview/i,
    regenerar: /regenerar/i,
    gerarPdf: /gerar pdf/i,
    baixar: /baixar/i, // or use Download icon
  },
  headings: {
    previewGerado: /preview gerado/i,
    pdfsGerados: /pdfs gerados/i,
  },
  toasts: {
    previewSuccess: /preview gerado com sucesso/i,
    pdfSuccess: /pdf.*gerado.*com sucesso/i,
    previewError: /erro ao gerar preview/i,
  },
}
```

### 3. Create reusable helpers

**File**: `e2e/helpers/resume-helpers.ts` (new)

```typescript
import { expect, Page, Locator } from "@playwright/test"

export async function setupAndNavigateToCurriculoTab(page: Page, sampleJobDescription: string): Promise<Locator> {
  // Mock APIs
  await mockParseJobSuccess(page)
  await mockGenerateResumeHtmlSuccess(page)
  await mockHtmlToPdfSuccess(page)

  // Open dialog
  await page.getByRole("button", { name: /adicionar estágio/i }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // Parse job
  const textarea = dialog.getByPlaceholder(/cole a descrição/i)
  await textarea.fill(sampleJobDescription)

  const fillButton = dialog.getByRole("button", { name: /realizar análise/i })
  await fillButton.click()

  // Wait for tab switch
  const dadosTab = dialog.getByRole("tab", { name: /dados da vaga/i })
  await expect(dadosTab).toHaveAttribute("data-state", "active", { timeout: 10000 })

  // Navigate to Currículo
  const curriculoTab = dialog.getByRole("tab", { name: /currículo/i })
  await curriculoTab.click()
  await expect(curriculoTab).toHaveAttribute("data-state", "active")

  return dialog
}

export async function generatePreview(dialog: Locator) {
  const generateButton = dialog.getByRole("button", { name: /gerar preview/i })
  await expect(generateButton).toBeEnabled()
  await generateButton.click()

  // Wait for preview alert
  const previewAlert = dialog.getByRole("heading", { name: /preview gerado/i })
  await expect(previewAlert).toBeVisible({ timeout: 10000 })

  // Verify Markdown textarea visible
  const markdownTextarea = dialog.locator("textarea").first()
  await expect(markdownTextarea).toBeVisible()
}

export async function generatePdf(dialog: Locator) {
  const gerarPdfButton = dialog.getByRole("button", { name: /gerar pdf/i })
  await expect(gerarPdfButton).toBeEnabled()
  await gerarPdfButton.click()

  // Wait for PDF section
  const pdfSection = dialog.getByText(/pdfs gerados/i)
  await expect(pdfSection).toBeVisible({ timeout: 10000 })
}
```

---

## Execution Order

### Step 1: Add mocks and helpers
- [ ] Add `mockHtmlToPdfSuccess()` to `api-mocks.ts`
- [ ] Create `resume-helpers.ts` with reusable functions
- [ ] (Optional) Create `test-constants.ts` with button text

### Step 2: Batch A - Happy Path
- [ ] Rewrite Test 1: "deve gerar currículo personalizado com sucesso"
- [ ] Run: `pnpm test:e2e e2e/resume-generator.spec.ts -g "deve gerar currículo personalizado"`
- [ ] ✅ Verify passing
- [ ] Rewrite Test 2: "deve permitir regenerar currículo"
- [ ] Run: `pnpm test:e2e e2e/resume-generator.spec.ts -g "deve permitir regenerar"`
- [ ] ✅ Verify passing

### Step 3: Batch B - Errors & Validations
- [ ] Rewrite Test 4: "deve lidar com erro na geração"
- [ ] Run: `pnpm test:e2e e2e/resume-generator.spec.ts -g "deve lidar com erro"`
- [ ] ✅ Verify passing
- [ ] **DECISION POINT**: Test 5 - Consult with product team
  - If remove: Skip test with `.skip()` and add comment
  - If fix component: Add validation to `curriculo-tab.tsx`
  - If adjust test: Implement Option C

### Step 4: Batch C - PDF Download
- [ ] Rewrite Test 3: "deve baixar PDF do currículo"
- [ ] Run: `pnpm test:e2e e2e/resume-generator.spec.ts -g "deve baixar PDF"`
- [ ] ✅ Verify passing

### Step 5: Full Suite Verification
- [ ] Run: `pnpm test:e2e e2e/resume-generator.spec.ts`
- [ ] ✅ All tests passing (or Test 5 skipped with reason)
- [ ] Run: `pnpm test --run` (unit tests)
- [ ] ✅ No regressions
- [ ] Run: `pnpm test:e2e` (full E2E suite)
- [ ] ✅ No regressions in other E2E tests

### Step 6: Documentation & Cleanup
- [ ] Update `docs/testing/TEST_STATUS.md` with:
  - AI Resume Generator E2E coverage
  - Known limitations (e.g., PDF mocking, if any)
  - Decision on Test 5 (if pending)
- [ ] (Optional) Add `data-testid` to component for better test stability
- [ ] Commit changes with descriptive message

---

## Success Criteria

✅ **5/6 tests passing** (or 4/6 if Test 5 skipped pending decision)
✅ **Tests reflect actual user flows** (not implementation details)
✅ **Tests are stable** (no flaky timeouts, clear selectors)
✅ **Clear coverage** of:
- Generate preview (PT/EN/Both)
- Regenerate (clear preview)
- Generate PDF
- Download PDF
- Error handling
- (Optional) Input validation

✅ **Documentation updated** with current test status

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Test 5 decision delays execution | Medium | Proceed with Batches A, B (partial), C. Revisit Test 5 later. |
| PDF mocking complex (binary data) | Low | Use simple base64 string, focus on flow not content validation. |
| Component changes during rewrite | Medium | Lock component file, coordinate with team. |
| Timeouts in CI (slower) | Low | Use longer timeouts for E2E (already 10s), test locally first. |

---

## Notes

- **Test 6** ("deve salvar vaga após gerar currículo") is **passing** - no changes needed
- All rewrites should use `async/await` consistently
- Prefer `getByRole` over `locator` for better accessibility testing
- Add comments in test file explaining new flow for future maintainers
