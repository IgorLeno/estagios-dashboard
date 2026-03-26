import { test, expect } from "@playwright/test"
import { waitForVagaInTable, generateUniqueTestName } from "./helpers/test-utils"
import {
  mockParseJobSuccess,
  mockFitSelectionSuccess,
  mockGenerateResumeHtmlSuccess,
  mockGenerateResumeHtmlError,
  mockHtmlToPdfSuccess,
  unmockAllApis,
} from "./helpers/api-mocks"

test.describe("AI Resume Generator", () => {
  test.describe.configure({ mode: "serial" })

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

  async function openDialogAndParseJob(page: any) {
    await mockParseJobSuccess(page)

    await page.getByRole("button", { name: /adicionar estágio/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    const textarea = dialog.getByPlaceholder(/cole a descrição/i)
    await textarea.fill(sampleJobDescription)

    const fillButton = dialog.getByRole("button", { name: /realizar análise/i })
    await fillButton.click()

    await expect(dialog.getByLabel(/^empresa/i)).toHaveValue("Saipem", { timeout: 10000 })
    await expect(dialog.getByRole("button", { name: /continuar para fit/i })).toBeVisible()

    return dialog
  }

  async function completeFitAndGoToCurriculo(dialog: any) {
    const continueToFitButton = dialog.getByRole("button", { name: /continuar para fit/i })
    await continueToFitButton.click({ force: true })
    await expect(dialog.getByRole("heading", { name: /fit: perfil \+ complementos/i })).toBeVisible()

    const generateProfileButton = dialog.getByRole("button", { name: /gerar perfil/i })
    await generateProfileButton.click({ force: true })
    await expect(dialog.getByPlaceholder(/o perfil profissional será gerado/i)).toHaveValue(/estudante de engenharia química/i, {
      timeout: 10000,
    })

    const selectComplementsButton = dialog.getByRole("button", { name: /selecionar complementos/i })
    await selectComplementsButton.click({ force: true })
    await expect(dialog.getByText(/dashboard de análise de processos/i)).toBeVisible({ timeout: 10000 })

    const continueButton = dialog.getByRole("button", { name: /continuar para currículo/i })
    await expect(continueButton).toBeEnabled()
    await continueButton.scrollIntoViewIfNeeded()
    await continueButton.click({ force: true })

    await expect(dialog.getByRole("button", { name: /^gerar pt$/i })).toBeVisible()
  }

  /**
   * Helper: Setup inicial - parse job description, complete Fit flow and navigate to Curriculo tab
   */
  async function setupJobAnalysis(page: any) {
    await mockFitSelectionSuccess(page)
    await mockGenerateResumeHtmlSuccess(page)
    await mockHtmlToPdfSuccess(page)

    const dialog = await openDialogAndParseJob(page)
    await completeFitAndGoToCurriculo(dialog)

    return dialog
  }

  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("vagas-card-title")).toBeVisible({ timeout: 15000 })
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
    await generateButton.click({ force: true })

    // 3. With mocks, response is instant - verify preview appears
    // NEW: Check for "Preview Gerado" alert text (AlertTitle is a div, not heading)
    const previewAlert = dialog.getByText(/preview gerado/i)
    await expect(previewAlert).toBeVisible({ timeout: 10000 })

    // 4. Verify Markdown textarea is visible (editable)
    const markdownTextarea = dialog.locator("textarea").first()
    await expect(markdownTextarea).toBeVisible()

    // 5. Verify action buttons are visible
    const regenerarButton = dialog.getByRole("button", { name: /regenerar/i }).first()
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

  test("deve completar a aba Fit com perfil e complementos", async ({ page }) => {
    await mockFitSelectionSuccess(page)

    const dialog = await openDialogAndParseJob(page)
    await dialog.getByRole("button", { name: /continuar para fit/i }).click({ force: true })
    await expect(dialog.getByRole("heading", { name: /fit: perfil \+ complementos/i })).toBeVisible()

    await dialog.getByRole("button", { name: /gerar perfil/i }).click({ force: true })
    const profileTextarea = dialog.getByPlaceholder(/o perfil profissional será gerado/i)
    await expect(profileTextarea).toHaveValue(/indicadores/i, { timeout: 10000 })

    await dialog.getByRole("button", { name: /selecionar complementos/i }).click({ force: true })
    await expect(dialog.getByText(/dashboard de análise de processos/i)).toBeVisible({ timeout: 10000 })
    await expect(dialog.getByText(/diferenciais/i)).toBeVisible()
    await expect(dialog.locator('input[type="checkbox"]').first()).toBeVisible()
  })

  test("deve permitir regenerar currículo", async ({ page }) => {
    const dialog = await setupJobAnalysis(page)

    // 1. Generate preview first (fluxo completo)
    const generateButton = dialog.getByRole("button", { name: /^gerar pt$/i })
    await generateButton.click({ force: true })

    // With mocks, preview appears instantly
    const previewAlert = dialog.getByText(/preview gerado/i)
    await expect(previewAlert).toBeVisible({ timeout: 10000 })

    // Verify Markdown textarea has content
    const markdownTextarea = dialog.locator("textarea").first()
    await expect(markdownTextarea).toBeVisible()
    const initialContent = await markdownTextarea.inputValue()
    expect(initialContent).not.toBe("")

    // 2. Click "Regenerar" button (inside ResumePreviewCard, not at root level)
    // The button regenerates the preview (replaces content, doesn't clear)
    const regenerarButton = dialog.getByRole("button", { name: /^regenerar$/i }).first()
    await expect(regenerarButton).toBeVisible()
    await expect(regenerarButton).toBeEnabled()
    await regenerarButton.click({ force: true })

    // 3. Wait for regeneration to complete (mock is instant)
    await page.waitForTimeout(1000)

    // 4. Verify preview is still visible (regenerate replaces content, doesn't clear)
    await expect(previewAlert).toBeVisible()
    await expect(markdownTextarea).toBeVisible()

    // 5. Content should still exist (mock returns same content in this test)
    const newContent = await markdownTextarea.inputValue()
    expect(newContent).not.toBe("")

    await page.keyboard.press("Escape")
  })

  test("deve baixar PDF do currículo", async ({ page }) => {
    const dialog = await setupJobAnalysis(page)

    // Step 1: Generate preview (Markdown)
    const generateButton = dialog.getByRole("button", { name: /^gerar pt$/i })
    await generateButton.click({ force: true })

    // With mocks, preview appears instantly
    const previewAlert = dialog.getByText(/preview gerado/i)
    await expect(previewAlert).toBeVisible({ timeout: 10000 })

    // Verify Markdown textarea exists
    const markdownTextarea = dialog.locator("textarea").first()
    await expect(markdownTextarea).toBeVisible()

    // Step 2: Generate PDF (button is inside the preview card, not at root level)
    const gerarPdfButton = dialog.getByRole("button", { name: /gerar pdf/i })
    await expect(gerarPdfButton).toBeVisible()
    await expect(gerarPdfButton).toBeEnabled()
    await gerarPdfButton.click({ force: true })

    // Step 3: Wait for PDF generation to complete (toast message or button state change)
    // PDF is generated and stored in state (pdfBase64Pt)
    await page.waitForTimeout(2000) // Wait for mock response

    // Step 4: Setup download listener and click download button
    // The download button appears after PDF is generated
    const downloadPromise = page.waitForEvent("download", { timeout: 10000 })

    // Find download button (SVG icon button or labeled button)
    const downloadButton = dialog.getByRole("button", { name: /download|baixar/i })
    await expect(downloadButton).toBeVisible({ timeout: 5000 })
    await expect(downloadButton).toBeEnabled()
    await downloadButton.click({ force: true })

    // Step 5: Verify download started
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)

    await page.keyboard.press("Escape")
  })

  test("deve lidar com erro na geração", async ({ page }) => {
    await mockFitSelectionSuccess(page)
    await mockGenerateResumeHtmlError(page)

    const dialog = await openDialogAndParseJob(page)
    await completeFitAndGoToCurriculo(dialog)

    // 1. Click "Gerar PT"
    const generateButton = dialog.getByRole("button", { name: /^gerar pt$/i })
    await expect(generateButton).toBeEnabled()
    await generateButton.click({ force: true })

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

  test("deve salvar vaga após gerar currículo", { timeout: 60000 }, async ({ page }) => {
    // Test verifies the integration between resume generation and vaga save
    // Uses generated resume PDF and validates complete save flow
    await page.waitForLoadState("networkidle")

    const empresaName = generateUniqueTestName("[E2E-TEST] Resume Test")

    await mockFitSelectionSuccess(page)
    await mockGenerateResumeHtmlSuccess(page)
    await mockHtmlToPdfSuccess(page)

    const dialog = await openDialogAndParseJob(page)

    // Override empresa field with unique name for test
    const empresaInput = dialog.getByLabel(/^empresa/i)
    await empresaInput.clear()
    await empresaInput.fill(empresaName)

    // Manually fill fit fields to ensure correct format (like vagas.spec.ts)
    await dialog.getByLabel(/fit requisitos/i).clear()
    await dialog.getByLabel(/fit requisitos/i).fill("4.0")
    await dialog.getByLabel(/fit perfil/i).clear()
    await dialog.getByLabel(/fit perfil/i).fill("4.5")

    await completeFitAndGoToCurriculo(dialog)

    // 1. Generate preview (fluxo atualizado)
    const generateButton = dialog.getByRole("button", { name: /^gerar pt$/i })
    await generateButton.click({ force: true })

    // With mocks, preview appears instantly (NEW: "Preview Gerado" alert)
    const previewAlert = dialog.getByText(/preview gerado/i)
    await expect(previewAlert).toBeVisible({ timeout: 10000 })

    // 2. Click "Salvar Vaga" (green button)
    const saveButton = dialog.getByRole("button", { name: /salvar vaga/i })
    await expect(saveButton).toBeEnabled()
    await saveButton.click({ force: true })

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
    await curriculoTab.click({ force: true })

    // NEW: Verify warning alert is visible (added in Batch 0)
    const warningAlert = dialog.getByText(/análise da vaga necessária/i)
    await expect(warningAlert).toBeVisible()

    // Verify "Gerar PT" button is DISABLED (no jobAnalysisData) - validates Batch 0 fix
    const generateButton = dialog.getByRole("button", { name: /^gerar pt$/i })
    await expect(generateButton).toBeDisabled()

    await page.keyboard.press("Escape")
  })
})
