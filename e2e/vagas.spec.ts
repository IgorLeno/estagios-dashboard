import { test, expect } from "@playwright/test"
import { waitForVagaInTable, generateUniqueTestName } from "./helpers/test-utils"

test.describe("Gerenciamento de Vagas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("Vagas")).toBeVisible()
  })

  test("deve criar nova vaga manualmente", async ({ page }) => {
    // Garantir que página carregou completamente
    await page.waitForLoadState("networkidle")

    const empresaName = generateUniqueTestName("[E2E-TEST] Petrobrás")
    const cargoName = generateUniqueTestName("Engenheiro de Processos")

    // Abrir modal
    const addButton = page.getByRole("button", { name: /adicionar vaga/i })
    await addButton.waitFor({ state: "visible" })
    await addButton.click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // Preencher formulário
    await page.getByLabel(/empresa/i).fill(empresaName)
    await page.getByLabel(/cargo/i).fill(cargoName)
    await page.getByLabel(/local/i).fill("Rio de Janeiro")

    // Selecionar modalidade
    await page.getByLabel(/modalidade/i).click()
    await page.getByRole("option", { name: "Híbrido" }).click()

    // Preencher requisitos e fit
    await page.getByLabel(/requisitos/i).fill("85")
    await page.getByLabel(/fit/i).fill("8")
    await page.getByLabel(/etapa/i).fill("Inscrição")

    // Observações
    await page.getByLabel(/observações/i).fill("Teste E2E automatizado")

    // Salvar
    const saveButton = page.getByRole("button", { name: /^salvar$/i })
    await saveButton.click()

    // Aguardar toast de sucesso aparecer
    await expect(page.getByText(/vaga adicionada com sucesso/i)).toBeVisible({ timeout: 5000 })

    // Aguardar modal fechar (indica que a operação foi concluída)
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 })

    // Aguardar vaga aparecer na tabela (usa helper que aguarda loading desaparecer)
    await waitForVagaInTable(page, empresaName)
    // Verificar que o cargo também está visível na mesma linha
    const vagaRow = page.locator("tr").filter({ hasText: empresaName })
    await expect(vagaRow.getByText(cargoName)).toBeVisible()
  })

  test("deve validar campos obrigatórios", async ({ page }) => {
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: /adicionar vaga/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // Tentar salvar sem preencher campos obrigatórios
    await page.getByRole("button", { name: /^salvar$/i }).click()

    // Modal não deve fechar devido à validação HTML5
    await expect(page.getByRole("dialog")).toBeVisible()

    // Fechar modal
    await page.keyboard.press("Escape")
  })

  test("deve editar vaga existente", async ({ page }) => {
    await page.waitForLoadState("networkidle")

    const empresaName = generateUniqueTestName("[E2E-TEST] Edit Company")

    // Primeiro criar uma vaga para editar
    await page.getByRole("button", { name: /adicionar vaga/i }).click()
    await page.getByLabel(/empresa/i).fill(empresaName)
    await page.getByLabel(/cargo/i).fill("Test Position")
    await page.getByLabel(/local/i).fill("Test City")
    await page.getByLabel(/modalidade/i).click()
    await page.getByRole("option", { name: "Presencial" }).click()
    await page.getByRole("button", { name: /^salvar$/i }).click()

    // Aguardar toast de sucesso
    await expect(page.getByText(/vaga adicionada com sucesso/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 })

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
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByText(/editar vaga/i)).toBeVisible()

    // Editar campos
    await page.getByLabel(/etapa/i).fill("Entrevista RH")
    await page.getByLabel(/status/i).click()
    await page.getByRole("option", { name: "Avançado" }).click()

    // Salvar (o botão no EditVagaDialog tem texto "Salvar Alterações")
    await page.getByRole("button", { name: /salvar/i }).click()

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 })

    // Aguardar toast de sucesso
    await expect(page.getByText(/vaga atualizada com sucesso/i)).toBeVisible({ timeout: 5000 })

    // Verificar que etapa foi atualizada - buscar na linha específica da vaga
    const updatedVagaRow = page.locator("tr").filter({ hasText: empresaName })
    await expect(updatedVagaRow.getByText("Entrevista RH")).toBeVisible({ timeout: 5000 })
  })

  test("deve deletar vaga", async ({ page }) => {
    await page.waitForLoadState("networkidle")

    const empresaName = generateUniqueTestName("[E2E-TEST] Delete Me")

    // Criar vaga para deletar
    await page.getByRole("button", { name: /adicionar vaga/i }).click()
    await page.getByLabel(/empresa/i).fill(empresaName)
    await page.getByLabel(/cargo/i).fill("Delete Position")
    await page.getByLabel(/local/i).fill("Delete City")
    await page.getByLabel(/modalidade/i).click()
    await page.getByRole("option", { name: "Remoto" }).click()
    await page.getByRole("button", { name: /^salvar$/i }).click()

    // Aguardar toast de sucesso
    await expect(page.getByText(/vaga adicionada com sucesso/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 })

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

    await page.getByRole("button", { name: /adicionar vaga/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // Preencher todos os campos
    await page.getByLabel(/empresa/i).fill(empresaName)
    await page.getByLabel(/cargo/i).fill("Full Stack Developer")
    await page.getByLabel(/local/i).fill("Brasília")

    await page.getByLabel(/modalidade/i).click()
    await page.getByRole("option", { name: "Híbrido" }).click()

    await page.getByLabel(/requisitos/i).fill("95")
    await page.getByLabel(/fit/i).fill("10")
    await page.getByLabel(/etapa/i).fill("Teste Técnico")

    await page.getByLabel(/status/i).click()
    await page.getByRole("option", { name: "Avançado" }).click()

    await page.getByLabel(/observações/i).fill("Teste completo de todos os campos disponíveis no formulário")

    // Salvar
    await page.getByRole("button", { name: /^salvar$/i }).click()

    // Aguardar toast de sucesso
    await expect(page.getByText(/vaga adicionada com sucesso/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 })

    // Verificar na tabela
    await waitForVagaInTable(page, empresaName)
    const vagaRow = page.locator("tr").filter({ hasText: empresaName })
    await expect(vagaRow.getByText("Full Stack Developer")).toBeVisible()
  })
})
