import { test, expect } from "@playwright/test"
import { waitForVagaInTable, generateUniqueTestName } from "./helpers/test-utils"
import { mockFitSelectionSuccess } from "./helpers/api-mocks"

test.describe("Gerenciamento de Vagas", () => {
  test.describe.configure({ mode: "serial" })

  async function createManualVaga(page: any, empresaName: string, cargoName: string) {
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: /adicionar estágio/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    const dadosTab = dialog.getByRole("tab", { name: /dados da vaga/i })
    await dadosTab.click()
    await expect(dadosTab).toHaveAttribute("data-state", "active")

    await dialog.getByLabel(/^empresa/i).fill(empresaName)
    await dialog.getByLabel(/^cargo/i).fill(cargoName)
    await dialog.getByLabel(/^local/i).fill("Santos")
    await dialog.getByLabel(/modalidade/i).click()
    await page.getByRole("option", { name: "Híbrido" }).click()
    await dialog.getByLabel(/fit requisitos/i).fill("4.5")
    await dialog.getByLabel(/fit perfil/i).fill("4.0")
    await dialog.getByLabel(/análise/i).fill("Teste E2E para página de detalhe com seção Fit")

    const curriculoTab = dialog.getByRole("tab", { name: /currículo/i })
    await curriculoTab.click()
    await expect(curriculoTab).toHaveAttribute("data-state", "active")

    await dialog.getByRole("button", { name: /salvar vaga/i }).click()
    await expect(page.getByText(/vaga salva com sucesso/i)).toBeVisible({ timeout: 5000 })
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    await waitForVagaInTable(page, empresaName)
  }

  async function openVagaDetail(page: any, empresaName: string) {
    const vagaRow = page.locator("tr").filter({ hasText: empresaName })
    await expect(vagaRow).toBeVisible({ timeout: 10000 })
    await vagaRow.scrollIntoViewIfNeeded()
    await vagaRow.hover()

    const detailsButton = vagaRow.getByRole("button", { name: /ver detalhes/i })
    await expect(detailsButton).toBeVisible({ timeout: 10000 })
    await detailsButton.click({ force: true })

    await expect(page).toHaveURL(/\/vaga\//, { timeout: 10000 })
    await expect(page.getByText(/fit para currículo/i)).toBeVisible({ timeout: 10000 })
  }

  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("vagas-card-title")).toBeVisible({ timeout: 15000 })
  })

  test("deve criar nova vaga manualmente", async ({ page }) => {
    // Garantir que página carregou completamente
    await page.waitForLoadState("networkidle")

    const empresaName = generateUniqueTestName("[E2E-TEST] Petrobrás")
    const cargoName = generateUniqueTestName("Engenheiro de Processos")

    // Abrir modal
    const addButton = page.getByRole("button", { name: /adicionar estágio/i })
    await addButton.waitFor({ state: "visible" })
    await addButton.click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // Navigate to "Dados da Vaga" tab (dialog opens on "Descrição" tab by default)
    const dadosTab = dialog.getByRole("tab", { name: /dados da vaga/i })
    await dadosTab.click()
    await expect(dadosTab).toHaveAttribute("data-state", "active")

    // Preencher formulário - usar scope do dialog para evitar conflito com campo de busca
    await dialog.getByLabel(/^empresa/i).fill(empresaName)
    await dialog.getByLabel(/^cargo/i).fill(cargoName)
    await dialog.getByLabel(/^local/i).fill("Rio de Janeiro")

    // Selecionar modalidade
    await dialog.getByLabel(/modalidade/i).click()
    await page.getByRole("option", { name: "Híbrido" }).click()

    // Preencher requisitos e fit
    await dialog.getByLabel(/fit requisitos/i).fill("4.5")
    await dialog.getByLabel(/fit perfil/i).fill("4")

    // Análise
    await dialog.getByLabel(/análise/i).fill("Teste E2E automatizado")

    // Navigate to "Currículo" tab before saving
    const curriculoTab = dialog.getByRole("tab", { name: /currículo/i })
    await curriculoTab.click()
    await expect(curriculoTab).toHaveAttribute("data-state", "active")

    // Salvar
    const saveButton = dialog.getByRole("button", { name: /salvar vaga/i })
    await saveButton.click()

    // Aguardar toast de sucesso aparecer
    await expect(page.getByText(/vaga salva com sucesso/i)).toBeVisible({ timeout: 5000 })

    // Aguardar modal fechar (indica que a operação foi concluída)
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    // Aguardar vaga aparecer na tabela (usa helper que aguarda loading desaparecer)
    await waitForVagaInTable(page, empresaName)
    // Verificar que o cargo também está visível na mesma linha
    const vagaRow = page.locator("tr").filter({ hasText: empresaName })
    await expect(vagaRow.getByText(cargoName)).toBeVisible()
  })

  test("deve validar campos obrigatórios", async ({ page }) => {
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: /adicionar estágio/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // Navigate to "Dados da Vaga" tab
    const dadosTab = dialog.getByRole("tab", { name: /dados da vaga/i })
    await dadosTab.click()
    await expect(dadosTab).toHaveAttribute("data-state", "active")

    // Navigate to "Currículo" tab before attempting to save
    const curriculoTab = dialog.getByRole("tab", { name: /currículo/i })
    await curriculoTab.click()
    await expect(curriculoTab).toHaveAttribute("data-state", "active")

    // Tentar salvar sem preencher campos obrigatórios
    await dialog.getByRole("button", { name: /salvar vaga/i }).click()

    // Modal não deve fechar devido à validação HTML5
    await expect(page.getByRole("dialog")).toBeVisible()

    // Fechar modal
    await page.keyboard.press("Escape")
  })

  test("deve editar vaga existente", { timeout: 60000 }, async ({ page }) => {
    await page.waitForLoadState("networkidle")

    const empresaName = generateUniqueTestName("[E2E-TEST] Edit Company")

    // Primeiro criar uma vaga para editar
    await page.getByRole("button", { name: /adicionar estágio/i }).click()

    const addDialog = page.getByRole("dialog")
    await expect(addDialog).toBeVisible()

    // Navigate to "Dados da Vaga" tab
    const dadosTab = addDialog.getByRole("tab", { name: /dados da vaga/i })
    await dadosTab.click()
    await expect(dadosTab).toHaveAttribute("data-state", "active")

    await addDialog.getByLabel(/^empresa/i).fill(empresaName)
    await addDialog.getByLabel(/^cargo/i).fill("Test Position")
    await addDialog.getByLabel(/^local/i).fill("Test City")
    await addDialog.getByLabel(/modalidade/i).click()
    await page.getByRole("option", { name: "Presencial" }).click()

    // Navigate to "Currículo" tab before saving
    const curriculoTab = addDialog.getByRole("tab", { name: /currículo/i })
    await curriculoTab.click()
    await expect(curriculoTab).toHaveAttribute("data-state", "active")

    await addDialog.getByRole("button", { name: /salvar vaga/i }).click()

    // Aguardar toast de sucesso
    await expect(page.getByText(/vaga salva com sucesso/i)).toBeVisible({ timeout: 5000 })
    await expect(addDialog).not.toBeVisible({ timeout: 10000 })

    // Aguardar vaga aparecer
    await waitForVagaInTable(page, empresaName)

    // Encontrar e clicar em editar (botão de ações)
    const vagaRow = page.locator("tr").filter({ hasText: empresaName })
    const actionsButton = vagaRow.getByTestId("vaga-actions-button")
    await actionsButton.scrollIntoViewIfNeeded()
    await actionsButton.waitFor({ state: "visible" })
    await actionsButton.click()

    const editMenuItem = page
      .locator('[role="menuitem"]')
      .filter({ hasText: /^editar$/i })
      .first()
    await editMenuItem.waitFor({ state: "visible", timeout: 5000 })
    await editMenuItem.click()

    const editDialog = page.getByRole("dialog")
    await expect(editDialog).toBeVisible()
    await expect(editDialog.getByText(/editar vaga/i)).toBeVisible()

    // Editar campos (etapa foi removido do sistema)
    const statusButton = editDialog.getByLabel(/status/i)

    // Aguardar que o botão esteja pronto para interação
    await expect(statusButton).toBeVisible({ timeout: 10000 })
    await expect(statusButton).toBeEnabled()
    await statusButton.scrollIntoViewIfNeeded()

    // Aguardar um pouco para garantir que animações/transições terminaram
    await page.waitForTimeout(500)

    await statusButton.click({ force: true })
    await page.getByRole("option", { name: "Avançado" }).click()

    // Salvar (o botão no EditVagaDialog tem texto "Salvar Alterações")
    await editDialog.getByRole("button", { name: /salvar/i }).click()

    await expect(editDialog).not.toBeVisible({ timeout: 10000 })

    // Aguardar toast de sucesso
    await expect(page.getByText(/vaga atualizada com sucesso/i)).toBeVisible({ timeout: 5000 })

    // Verificar que a vaga ainda está na tabela (a etapa não é exibida na tabela principal)
    const updatedVagaRow = page.locator("tr").filter({ hasText: empresaName })
    await expect(updatedVagaRow).toBeVisible({ timeout: 5000 })
  })

  test("deve deletar vaga", async ({ page }) => {
    await page.waitForLoadState("networkidle")

    const empresaName = generateUniqueTestName("[E2E-TEST] Delete Me")

    // Criar vaga para deletar
    await page.getByRole("button", { name: /adicionar estágio/i }).click()

    const addDialog = page.getByRole("dialog")
    await expect(addDialog).toBeVisible()

    // Navigate to "Dados da Vaga" tab
    const dadosTab = addDialog.getByRole("tab", { name: /dados da vaga/i })
    await dadosTab.click()
    await expect(dadosTab).toHaveAttribute("data-state", "active")

    await addDialog.getByLabel(/^empresa/i).fill(empresaName)
    await addDialog.getByLabel(/^cargo/i).fill("Delete Position")
    await addDialog.getByLabel(/^local/i).fill("Delete City")
    await addDialog.getByLabel(/modalidade/i).click()
    await page.getByRole("option", { name: "Remoto" }).click()

    // Navigate to "Currículo" tab before saving
    const curriculoTab = addDialog.getByRole("tab", { name: /currículo/i })
    await curriculoTab.click()
    await expect(curriculoTab).toHaveAttribute("data-state", "active")

    await addDialog.getByRole("button", { name: /salvar vaga/i }).click()

    // Aguardar toast de sucesso
    await expect(page.getByText(/vaga salva com sucesso/i)).toBeVisible({ timeout: 5000 })
    await expect(addDialog).not.toBeVisible({ timeout: 10000 })

    // Aguardar vaga aparecer
    await waitForVagaInTable(page, empresaName)

    // Deletar vaga
    const vagaRow = page.locator("tr").filter({ hasText: empresaName })
    await vagaRow.scrollIntoViewIfNeeded()
    const actionsButton = vagaRow.getByTestId("vaga-actions-button")
    await actionsButton.waitFor({ state: "visible" })
    await actionsButton.click()

    const deleteMenuItem = page
      .locator('[role="menuitem"]')
      .filter({ hasText: /^excluir$/i })
      .first()
    await deleteMenuItem.waitFor({ state: "visible", timeout: 5000 })

    // Configurar handler para o dialog nativo do browser (window.confirm)
    page.once("dialog", async (dialog) => {
      await dialog.accept()
    })

    await deleteMenuItem.click()

    // Aguardar toast de sucesso
    await expect(page.getByText(/vaga excluída com sucesso/i)).toBeVisible({ timeout: 5000 })

    // Verificar que não existe mais (o timeout já aguarda a operação concluir)
    await expect(page.locator("tr").filter({ hasText: empresaName })).not.toBeVisible({ timeout: 10000 })
  })

  test("deve preencher todos os campos do formulário", async ({ page }) => {
    await page.waitForLoadState("networkidle")

    const empresaName = generateUniqueTestName("[E2E-TEST] Full Form")

    await page.getByRole("button", { name: /adicionar estágio/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // Navigate to "Dados da Vaga" tab
    const dadosTab = dialog.getByRole("tab", { name: /dados da vaga/i })
    await dadosTab.click()
    await expect(dadosTab).toHaveAttribute("data-state", "active")

    // Preencher todos os campos
    await dialog.getByLabel(/^empresa/i).fill(empresaName)
    await dialog.getByLabel(/^cargo/i).fill("Full Stack Developer")
    await dialog.getByLabel(/^local/i).fill("Brasília")

    await dialog.getByLabel(/modalidade/i).click()
    await page.getByRole("option", { name: "Híbrido" }).click()

    await dialog.getByLabel(/fit requisitos/i).fill("5")
    await dialog.getByLabel(/fit perfil/i).fill("5")

    await dialog.getByLabel(/status/i).click()
    await page.getByRole("option", { name: "Avançado" }).click()

    await dialog.getByLabel(/análise/i).fill("Teste completo de todos os campos disponíveis no formulário")

    // Navigate to "Currículo" tab before saving
    const curriculoTab = dialog.getByRole("tab", { name: /currículo/i })
    await curriculoTab.click()
    await expect(curriculoTab).toHaveAttribute("data-state", "active")

    // Salvar
    await dialog.getByRole("button", { name: /salvar vaga/i }).click()

    // Aguardar toast de sucesso
    await expect(page.getByText(/vaga salva com sucesso/i)).toBeVisible({ timeout: 5000 })
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    // Verificar na tabela
    await waitForVagaInTable(page, empresaName)
    const vagaRow = page.locator("tr").filter({ hasText: empresaName })
    await expect(vagaRow.getByText("Full Stack Developer")).toBeVisible()
  })

  test("deve exibir a seção Fit na página de detalhe e gerar perfil/complementos", async ({ page }) => {
    const empresaName = generateUniqueTestName("[E2E-TEST] Detail Fit")
    await createManualVaga(page, empresaName, "Estágio QHSE")

    await mockFitSelectionSuccess(page)
    await openVagaDetail(page, empresaName)

    const generateProfileButton = page.getByRole("button", { name: /gerar perfil/i })
    await generateProfileButton.click()

    const profileTextarea = page.getByPlaceholder(/o perfil profissional será gerado/i)
    await expect(profileTextarea).toHaveValue(/indicadores/i, { timeout: 10000 })

    const selectComplementsButton = page.getByRole("button", { name: /selecionar complementos/i })
    await selectComplementsButton.click()

    await expect(page.getByText(/dashboard de análise de processos/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/power bi impressionador/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole("button", { name: /continuar para currículo/i })).toBeEnabled()
  })

  test("deve gerar currículo na página de detalhe com fit aplicado", async ({ page }) => {
    const empresaName = generateUniqueTestName("[E2E-TEST] Detail Resume")
    await createManualVaga(page, empresaName, "Estágio BI")

    await mockFitSelectionSuccess(page)

    let resumeRequestBody: Record<string, unknown> | null = null
    await page.route("**/api/ai/generate-resume", async (route) => {
      if (route.request().method() === "POST") {
        resumeRequestBody = await route.request().postDataJSON()
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              pdfBase64: Buffer.from("%PDF-1.4\n%Mock PDF content").toString("base64"),
              filename: "cv-detail-fit-pt.pdf",
            },
            metadata: {
              duration: 1500,
              model: "x-ai/grok-4.1-fast",
              tokenUsage: {
                inputTokens: 1200,
                outputTokens: 400,
                totalTokens: 1600,
              },
              personalizedSections: ["summary", "skills", "projects"],
            },
          }),
        })
      } else {
        await route.continue()
      }
    })

    await openVagaDetail(page, empresaName)

    await page.getByRole("button", { name: /gerar perfil/i }).click()
    await expect(page.getByPlaceholder(/o perfil profissional será gerado/i)).toHaveValue(/indicadores/i, {
      timeout: 10000,
    })

    await page.getByRole("button", { name: /selecionar complementos/i }).click()
    await expect(page.getByText(/dashboard de análise de processos/i)).toBeVisible({ timeout: 10000 })

    await page.getByRole("button", { name: /^gerar$/i }).click()
    const regenerateDialog = page.getByRole("dialog")
    await expect(regenerateDialog.getByRole("heading", { name: /regenerar conteúdo/i })).toBeVisible({
      timeout: 10000,
    })
    await regenerateDialog.getByRole("button", { name: /regenerar conteúdo/i }).click()

    await expect
      .poll(() => resumeRequestBody, { timeout: 10000 })
      .not.toBeNull()

    expect(resumeRequestBody).toMatchObject({
      language: "pt",
      profileText: expect.stringContaining("indicadores"),
      approvedSkills: expect.arrayContaining(["ISO 9001:2015", "Excel Avançado", "Power BI"]),
      selectedProjectTitles: expect.arrayContaining(["Dashboard de Análise de Processos"]),
      selectedCertifications: expect.arrayContaining(["Power BI Impressionador - (Hashtag Treinamentos, 2023)"]),
    })
  })
})
