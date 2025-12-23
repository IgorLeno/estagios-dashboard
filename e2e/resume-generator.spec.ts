import { test, expect } from "@playwright/test"
import { waitForVagaInTable, generateUniqueTestName } from "./helpers/test-utils"
import {
  mockParseJobSuccess,
  mockGenerateResumeHtmlSuccess,
  mockGenerateResumeHtmlError,
  mockHtmlToPdfSuccess,
  unmockAllApis,
} from "./helpers/api-mocks"

test.describe("AI Resume Generator", () => {
  // Sample job description for testing
  const sampleJobDescription = `
Vaga de Estágio em Engenharia Química
Empresa: Saipem
Cargo: Estagiário QHSE
Local: Guarujá, São Paulo
Modalidade: Híbrido

Responsabilidades:
- Monitorar registros de qualidade e segurança
- Suporte em KPIs e indicadores
- Participar de auditorias internas

Requisitos Obrigatórios:
- Cursando Engenharia Química (3º-5º ano)
- Inglês intermediário
- Conhecimento em ISO 9001:2015

Requisitos Desejáveis:
- Experiência com Excel avançado
- Conhecimento em Power BI

Benefícios:
- Seguro saúde
- Vale refeição
- Vale transporte

Salário: R$ 1.800,00 + benefícios
  `.trim()

  /**
   * Helper: Setup inicial - parse job description and navigate to Curriculo tab
   * Uses NEW API flow: /api/ai/generate-resume-html + /api/ai/html-to-pdf
   */
  async function setupJobAnalysis(page: any) {
    // Mock ALL APIs for complete new flow
    await mockParseJobSuccess(page)
    await mockGenerateResumeHtmlSuccess(page)
    await mockHtmlToPdfSuccess(page)

    // Open dialog
    await page.getByRole("button", { name: /adicionar estágio/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // Parse job description (Tab 1 → Tab 2 auto-switch with mocks)
    const textarea = dialog.getByPlaceholder(/cole a descrição/i)
    await textarea.fill(sampleJobDescription)

    const fillButton = dialog.getByRole("button", { name: /realizar análise/i })
    await fillButton.click()

    // With mocks, response is instant - wait for tab switch
    const dadosTab = dialog.getByRole("tab", { name: /dados da vaga/i })
    await expect(dadosTab).toHaveAttribute("data-state", "active", { timeout: 10000 })

    // Navigate to Tab 3 (Currículo)
    const curriculoTab = dialog.getByRole("tab", { name: /currículo/i })
    await curriculoTab.click()
    await expect(curriculoTab).toHaveAttribute("data-state", "active")

    return dialog
  }

  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("vagas-card-title")).toBeVisible()
  })

  test.afterEach(async ({ page }) => {
    // Clean up mocks after each test
    await unmockAllApis(page)
  })

  test("deve gerar currículo personalizado com sucesso", async ({ page }) => {
    const dialog = await setupJobAnalysis(page)

    // 1. Verify "Gerar PT" button is visible and enabled (jobAnalysisData exists)
    const generateButton = dialog.getByRole("button", { name: /^gerar pt$/i })
    await expect(generateButton).toBeVisible()
    await expect(generateButton).toBeEnabled()

    // 2. Click "Gerar PT"
    await generateButton.click()

    // 3. With mocks, response is instant - verify preview appears
    // NEW: Check for "Preview Gerado" alert text (AlertTitle is a div, not heading)
    const previewAlert = dialog.getByText(/preview gerado/i)
    await expect(previewAlert).toBeVisible({ timeout: 10000 })

    // 4. Verify Markdown textarea is visible (editable)
    const markdownTextarea = dialog.locator("textarea").first()
    await expect(markdownTextarea).toBeVisible()

    // 5. Verify action buttons are visible
    const regenerarButton = dialog.getByRole("button", { name: /regenerar/i })
    const gerarPdfButton = dialog.getByRole("button", { name: /gerar pdf/i })
    await expect(regenerarButton).toBeVisible()
    await expect(regenerarButton).toBeEnabled()
    await expect(gerarPdfButton).toBeVisible()
    await expect(gerarPdfButton).toBeEnabled()

    // 6. NO PDF section yet (separate step)
    const pdfSection = dialog.locator("text=/pdfs gerados/i")
    await expect(pdfSection).not.toBeVisible()

    await page.keyboard.press("Escape")
  })

  test("deve permitir regenerar currículo", async ({ page }) => {
    const dialog = await setupJobAnalysis(page)

    // 1. Generate preview first (fluxo completo)
    const generateButton = dialog.getByRole("button", { name: /^gerar pt$/i })
    await generateButton.click()

    // With mocks, preview appears instantly
    const previewAlert = dialog.getByText(/preview gerado/i)
    await expect(previewAlert).toBeVisible({ timeout: 10000 })

    // Verify Markdown textarea has content
    const markdownTextarea = dialog.locator("textarea").first()
    await expect(markdownTextarea).toBeVisible()
    await expect(markdownTextarea).not.toHaveValue("")

    // 2. Click "Regenerar PT" (clears preview, no confirmation dialog in current implementation)
    const regenerarButton = dialog.getByRole("button", { name: /regenerar pt/i })
    await expect(regenerarButton).toBeEnabled()
    await regenerarButton.click()

    // 3. Verify preview was cleared (back to initial state)
    await expect(previewAlert).not.toBeVisible()
    await expect(markdownTextarea).not.toBeVisible()

    // 4. Verify "Gerar PT" button is visible again
    await expect(generateButton).toBeVisible()
    await expect(generateButton).toBeEnabled()

    await page.keyboard.press("Escape")
  })

  test("deve baixar PDF do currículo", async ({ page }) => {
    const dialog = await setupJobAnalysis(page)

    // Step 1: Generate preview (Markdown)
    const generateButton = dialog.getByRole("button", { name: /^gerar pt$/i })
    await generateButton.click()

    // With mocks, preview appears instantly
    const previewAlert = dialog.getByText(/preview gerado/i)
    await expect(previewAlert).toBeVisible({ timeout: 10000 })

    // Verify Markdown textarea exists
    const markdownTextarea = dialog.locator("textarea").first()
    await expect(markdownTextarea).toBeVisible()

    // Step 2: Generate PDF (NEW: separate step)
    const gerarPdfButton = dialog.getByRole("button", { name: /gerar pdf/i })
    await expect(gerarPdfButton).toBeVisible()
    await expect(gerarPdfButton).toBeEnabled()
    await gerarPdfButton.click()

    // Step 3: Wait for PDF section to appear
    const pdfSection = dialog.getByText(/pdfs gerados/i)
    await expect(pdfSection).toBeVisible({ timeout: 10000 })

    // Step 4: Verify file card with download button appears
    const fileCard = dialog.locator(".bg-slate-50").filter({ hasText: /cv-igor-fernandes.*\.pdf/i })
    await expect(fileCard).toBeVisible()

    // Step 5: Setup download listener and click download button
    const downloadPromise = page.waitForEvent("download")

    const downloadButton = fileCard.getByRole("button") // Download icon button inside card
    await expect(downloadButton).toBeEnabled()
    await downloadButton.click()

    // Step 6: Verify download started
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)

    await page.keyboard.press("Escape")
  })

  test("deve lidar com erro na geração", async ({ page }) => {
    // Mock parse job success but resume HTML generation error (NEW API)
    await mockParseJobSuccess(page)
    await mockGenerateResumeHtmlError(page)

    // Open dialog and parse job manually (don't use setupJobAnalysis as it mocks success)
    await page.getByRole("button", { name: /adicionar estágio/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    const textarea = dialog.getByPlaceholder(/cole a descrição/i)
    await textarea.fill(sampleJobDescription)

    const fillButton = dialog.getByRole("button", { name: /realizar análise/i })
    await fillButton.click()

    const dadosTab = dialog.getByRole("tab", { name: /dados da vaga/i })
    await expect(dadosTab).toHaveAttribute("data-state", "active", { timeout: 10000 })

    const curriculoTab = dialog.getByRole("tab", { name: /currículo/i })
    await curriculoTab.click()
    await expect(curriculoTab).toHaveAttribute("data-state", "active")

    // 1. Click "Gerar PT"
    const generateButton = dialog.getByRole("button", { name: /^gerar pt$/i })
    await expect(generateButton).toBeEnabled()
    await generateButton.click()

    // 2. With mocks, error response is instant - wait for state to stabilize
    await page.waitForTimeout(2000)

    // 3. Verify preview was NOT generated (no Alert, no textarea) - main assertion
    const previewAlert = dialog.getByText(/preview gerado/i)
    await expect(previewAlert).not.toBeVisible()

    const markdownTextarea = dialog.locator("textarea")
    await expect(markdownTextarea).not.toBeVisible()

    // 4. Verify "Gerar PT" button is still visible (allows retry)
    await expect(generateButton).toBeVisible()
    await expect(generateButton).toBeEnabled()

    // 5. Verify action buttons (Regenerar, Gerar PDF) don't exist
    const regenerarButton = dialog.getByRole("button", { name: /regenerar/i })
    const gerarPdfButton = dialog.getByRole("button", { name: /gerar pdf/i })
    await expect(regenerarButton).not.toBeVisible()
    await expect(gerarPdfButton).not.toBeVisible()

    // Note: Toast verification removed (Sonner auto-dismisses quickly, making it flaky)

    await page.keyboard.press("Escape")
  })

  test("deve salvar vaga após gerar currículo", async ({ page }) => {
    // Test verifies the integration between resume generation and vaga save
    // Uses generated resume PDF and validates complete save flow
    await page.waitForLoadState("networkidle")

    const empresaName = generateUniqueTestName("[E2E-TEST] Resume Test")

    const dialog = await setupJobAnalysis(page)

    // Override empresa field with unique name for test
    const dadosTab = dialog.getByRole("tab", { name: /dados da vaga/i })
    await dadosTab.click()
    await expect(dadosTab).toHaveAttribute("data-state", "active")

    const empresaInput = dialog.getByLabel(/^empresa/i)
    await empresaInput.clear()
    await empresaInput.fill(empresaName)

    // Manually fill fit fields to ensure correct format (like vagas.spec.ts)
    await dialog.getByLabel(/fit requisitos/i).clear()
    await dialog.getByLabel(/fit requisitos/i).fill("4.0")
    await dialog.getByLabel(/fit perfil/i).clear()
    await dialog.getByLabel(/fit perfil/i).fill("4.5")

    // Go back to Currículo tab
    const curriculoTab = dialog.getByRole("tab", { name: /currículo/i })
    await curriculoTab.click()
    await expect(curriculoTab).toHaveAttribute("data-state", "active")

    // 1. Generate preview (fluxo atualizado)
    const generateButton = dialog.getByRole("button", { name: /^gerar pt$/i })
    await generateButton.click()

    // With mocks, preview appears instantly (NEW: "Preview Gerado" alert)
    const previewAlert = dialog.getByText(/preview gerado/i)
    await expect(previewAlert).toBeVisible({ timeout: 10000 })

    // 2. Click "Salvar Vaga" (green button)
    const saveButton = dialog.getByRole("button", { name: /salvar vaga/i })
    await expect(saveButton).toBeEnabled()
    await saveButton.click()

    // 3. Aguardar toast de sucesso (indica que save iniciou)
    await expect(page.getByText(/vaga salva com sucesso/i)).toBeVisible({ timeout: 5000 })

    // 4. Aguardar modal fechar (indica que operação foi concluída)
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    // 5. Aguardar vaga aparecer na tabela (usa helper que aguarda loading desaparecer)
    await waitForVagaInTable(page, empresaName)

    // 6. Verificar que vaga está visível na tabela
    const vagaRow = page.locator("tr").filter({ hasText: empresaName })
    await expect(vagaRow).toBeVisible()
  })

  test("deve validar que jobAnalysisData é necessário antes de gerar currículo", async ({ page }) => {
    // Open dialog and go directly to Curriculo tab WITHOUT parsing (no jobAnalysisData)
    await page.getByRole("button", { name: /adicionar estágio/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // Skip Tab 1 (Descrição), go to Tab 2 (Dados) and fill manually
    const dadosTab = dialog.getByRole("tab", { name: /dados da vaga/i })
    await dadosTab.click()
    await expect(dadosTab).toHaveAttribute("data-state", "active")

    // Fill minimal data manually (without AI parsing = no jobAnalysisData)
    await dialog.getByLabel(/^empresa/i).fill("Test Company")

    // Go to Curriculo tab
    const curriculoTab = dialog.getByRole("tab", { name: /currículo/i })
    await curriculoTab.click()
    await expect(curriculoTab).toHaveAttribute("data-state", "active")

    // NEW: Verify warning alert is visible (added in Batch 0)
    const warningAlert = dialog.getByText(/análise da vaga necessária/i)
    await expect(warningAlert).toBeVisible()

    // Verify "Gerar PT" button is DISABLED (no jobAnalysisData) - validates Batch 0 fix
    const generateButton = dialog.getByRole("button", { name: /^gerar pt$/i })
    await expect(generateButton).toBeDisabled()

    await page.keyboard.press("Escape")
  })
})
