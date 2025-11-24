import { test, expect } from "@playwright/test"
import { waitForToast, waitForVagaInTable, generateUniqueTestName } from "./helpers/test-utils"

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
   */
  async function setupJobAnalysis(page: any) {
    // Open dialog
    await page.getByRole("button", { name: /adicionar estágio/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // Parse job description (Tab 1 → Tab 2 auto-switch)
    const textarea = dialog.getByPlaceholder(/cole a descrição/i)
    await textarea.fill(sampleJobDescription)

    const fillButton = dialog.getByRole("button", { name: /preencher dados/i })
    await fillButton.click()

    // Wait for parsing to complete
    await waitForToast(page, /dados preenchidos com sucesso/i)

    // Verify we're on Tab 2 (Dados da Vaga)
    const dadosTab = dialog.getByRole("tab", { name: /dados da vaga/i })
    await expect(dadosTab).toHaveAttribute("data-state", "active", { timeout: 5000 })

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

  test("deve gerar currículo personalizado com sucesso", async ({ page }) => {
    const dialog = await setupJobAnalysis(page)

    // 1. Verificar que preview está vazio inicialmente
    await expect(dialog.getByText(/clique em.*gerar currículo/i)).toBeVisible()

    // 2. Clicar em "Gerar Currículo"
    const generateButton = dialog.getByRole("button", { name: /^gerar currículo$/i })
    await expect(generateButton).toBeEnabled()
    await generateButton.click()

    // 3. Aguardar loading/spinner
    await expect(dialog.getByText(/gerando\.\.\./i)).toBeVisible({ timeout: 3000 })

    // 4. Aguardar toast de sucesso
    await waitForToast(page, /currículo gerado com sucesso/i)

    // 5. Verificar que PDF foi gerado (preview visível)
    await expect(dialog.getByText(/currículo personalizado/i)).toBeVisible({ timeout: 10000 })
    await expect(dialog.getByText(/pdf gerado e pronto para download/i)).toBeVisible()

    // 6. Verificar que filename é exibido
    const filenamePattern = /cv-.*\.pdf/i
    await expect(dialog.locator("span.font-mono").filter({ hasText: filenamePattern })).toBeVisible()

    // 7. Verificar que botões ficaram habilitados
    const downloadButton = dialog.getByRole("button", { name: /baixar pdf/i })
    const refazerButton = dialog.getByRole("button", { name: /refazer/i })
    await expect(downloadButton).toBeEnabled()
    await expect(refazerButton).toBeEnabled()

    await page.keyboard.press("Escape")
  })

  test("deve permitir regenerar currículo", async ({ page }) => {
    const dialog = await setupJobAnalysis(page)

    // 1. Gerar currículo (fluxo completo)
    const generateButton = dialog.getByRole("button", { name: /^gerar currículo$/i })
    await generateButton.click()
    await waitForToast(page, /currículo gerado com sucesso/i)

    // Aguardar preview aparecer
    await expect(dialog.getByText(/currículo personalizado/i)).toBeVisible({ timeout: 10000 })

    // Salvar filename inicial
    const initialFilenameElement = dialog.locator("span.font-mono").first()
    const initialFilename = await initialFilenameElement.textContent()

    // 2. Clicar em "Refazer"
    const refazerButton = dialog.getByRole("button", { name: /refazer/i })
    await expect(refazerButton).toBeEnabled()

    // Setup dialog listener BEFORE clicking (confirmar)
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toMatch(/deseja gerar um novo currículo/i)
      await dialog.accept()
    })

    await refazerButton.click()

    // 3. Aguardar nova geração
    await expect(dialog.getByText(/gerando\.\.\./i)).toBeVisible({ timeout: 3000 })
    await waitForToast(page, /currículo gerado com sucesso/i)

    // 4. Verificar que conteúdo foi regenerado (filename pode mudar com timestamp)
    // Apenas verificar que preview ainda está visível
    await expect(dialog.getByText(/currículo personalizado/i)).toBeVisible()

    // Note: Filenames may be identical for same job description, which is expected
    // The important part is that the generation flow completed successfully

    await page.keyboard.press("Escape")
  })

  test("deve baixar PDF do currículo", async ({ page }) => {
    const dialog = await setupJobAnalysis(page)

    // 1. Gerar currículo (fluxo completo)
    const generateButton = dialog.getByRole("button", { name: /^gerar currículo$/i })
    await generateButton.click()
    await waitForToast(page, /currículo gerado com sucesso/i)

    // Aguardar preview aparecer
    await expect(dialog.getByText(/currículo personalizado/i)).toBeVisible({ timeout: 10000 })

    // 2. Setup listener de download
    const downloadPromise = page.waitForEvent("download")

    // 3. Clicar em "Baixar PDF"
    const downloadButton = dialog.getByRole("button", { name: /baixar pdf/i })
    await expect(downloadButton).toBeEnabled()
    await downloadButton.click()

    // 4. Aguardar download iniciar
    const download = await downloadPromise

    // 5. Verificar que arquivo .pdf foi baixado
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)

    // 6. Verificar toast de sucesso
    await waitForToast(page, /pdf baixado/i)

    await page.keyboard.press("Escape")
  })

  test("deve lidar com erro na geração", async ({ page }) => {
    // Mock da API retornando erro
    await page.route("**/api/ai/generate-resume", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: "Erro ao gerar currículo",
          }),
        })
      } else {
        await route.continue()
      }
    })

    const dialog = await setupJobAnalysis(page)

    // 1. Clicar em "Gerar Currículo"
    const generateButton = dialog.getByRole("button", { name: /^gerar currículo$/i })
    await generateButton.click()

    // 2. Aguardar loading
    await expect(dialog.getByText(/gerando\.\.\./i)).toBeVisible({ timeout: 3000 })

    // 3. Verificar mensagem de erro
    await waitForToast(page, /erro.*gerar currículo/i)

    // 4. Verificar que preview continua vazio
    await expect(dialog.getByText(/clique em.*gerar currículo/i)).toBeVisible()

    // 5. Verificar que botões de download/refazer estão desabilitados
    const downloadButton = dialog.getByRole("button", { name: /baixar pdf/i })
    const refazerButton = dialog.getByRole("button", { name: /refazer/i })
    await expect(downloadButton).toBeDisabled()
    await expect(refazerButton).toBeDisabled()

    await page.keyboard.press("Escape")
  })

  test("deve salvar vaga após gerar currículo", async ({ page }) => {
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

    // Go back to Currículo tab
    const curriculoTab = dialog.getByRole("tab", { name: /currículo/i })
    await curriculoTab.click()
    await expect(curriculoTab).toHaveAttribute("data-state", "active")

    // 1. Gerar currículo (fluxo completo)
    const generateButton = dialog.getByRole("button", { name: /^gerar currículo$/i })
    await generateButton.click()
    await waitForToast(page, /currículo gerado com sucesso/i)

    // Aguardar preview aparecer
    await expect(dialog.getByText(/currículo personalizado/i)).toBeVisible({ timeout: 10000 })

    // 2. Clicar em "Salvar Vaga" (botão verde)
    const saveButton = dialog.getByRole("button", { name: /salvar vaga/i })
    await expect(saveButton).toBeEnabled()
    await saveButton.click()

    // 3. Aguardar salvamento
    await expect(dialog.getByText(/salvando\.\.\./i)).toBeVisible({ timeout: 3000 })

    // 4. Verificar toast de sucesso
    await waitForToast(page, /vaga salva com sucesso/i)

    // 5. Verificar que diálogo fechou
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    // 6. Verificar que nova vaga aparece no dashboard
    await waitForVagaInTable(page, empresaName)

    // 7. Verificar que vaga está visível na tabela
    const vagaRow = page.locator("tr").filter({ hasText: empresaName })
    await expect(vagaRow).toBeVisible()
  })

  test("deve validar que jobAnalysisData é necessário antes de gerar currículo", async ({ page }) => {
    // Open dialog and go directly to Curriculo tab WITHOUT parsing
    await page.getByRole("button", { name: /adicionar estágio/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // Skip Tab 1, manually fill Tab 2
    const dadosTab = dialog.getByRole("tab", { name: /dados da vaga/i })
    await dadosTab.click()
    await expect(dadosTab).toHaveAttribute("data-state", "active")

    // Fill minimal data manually (without AI parsing)
    await dialog.getByLabel(/^empresa/i).fill("Test Company")

    // Go to Curriculo tab
    const curriculoTab = dialog.getByRole("tab", { name: /currículo/i })
    await curriculoTab.click()
    await expect(curriculoTab).toHaveAttribute("data-state", "active")

    // Verify "Gerar Currículo" button is DISABLED (no jobAnalysisData)
    const generateButton = dialog.getByRole("button", { name: /^gerar currículo$/i })
    await expect(generateButton).toBeDisabled()

    await page.keyboard.press("Escape")
  })
})
