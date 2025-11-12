import { test, expect } from "@playwright/test"
import { waitForToast, fillFieldByLabel, selectOptionByLabel } from "./helpers/test-utils"

test.describe("Gerenciamento de Vagas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("Vagas")).toBeVisible()
  })

  test("deve criar nova vaga manualmente", async ({ page }) => {
    // Abrir modal
    await page.getByRole("button", { name: /adicionar vaga/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // Preencher formulário
    await page.getByLabel(/empresa/i).fill("[E2E-TEST] Petrobrás")
    await page.getByLabel(/cargo/i).fill("Engenheiro de Processos")
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
    await page.getByRole("button", { name: /^salvar$/i }).click()

    // Verificar toast de sucesso
    await waitForToast(page, /vaga.*sucesso/i)

    // Aguardar modal fechar
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 })

    // Verificar que vaga aparece na tabela
    await expect(page.getByText("[E2E-TEST] Petrobrás")).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("Engenheiro de Processos")).toBeVisible()
  })

  test("deve validar campos obrigatórios", async ({ page }) => {
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
    // Primeiro criar uma vaga para editar
    await page.getByRole("button", { name: /adicionar vaga/i }).click()
    await page.getByLabel(/empresa/i).fill("[E2E-TEST] Edit Company")
    await page.getByLabel(/cargo/i).fill("Test Position")
    await page.getByLabel(/local/i).fill("Test City")
    await page.getByLabel(/modalidade/i).click()
    await page.getByRole("option", { name: "Presencial" }).click()
    await page.getByRole("button", { name: /^salvar$/i }).click()

    await waitForToast(page, /vaga.*sucesso/i)
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 })

    // Aguardar vaga aparecer
    await expect(page.getByText("[E2E-TEST] Edit Company")).toBeVisible({ timeout: 5000 })

    // Encontrar e clicar em editar (botão de ações)
    const vagaRow = page.locator("tr", { hasText: "[E2E-TEST] Edit Company" })
    await vagaRow.getByTestId("vaga-actions-button").click()

    // Clicar em "Editar" no dropdown
    await page.getByText(/editar/i).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByText(/editar vaga/i)).toBeVisible()

    // Editar campos
    await page.getByLabel(/etapa/i).fill("Entrevista RH")
    await page.getByLabel(/status/i).click()
    await page.getByRole("option", { name: "Avançado" }).click()

    // Salvar
    await page.getByRole("button", { name: /^salvar$/i }).click()

    // Verificar toast de sucesso
    await waitForToast(page, /atualizada.*sucesso/i)

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 })

    // Verificar que etapa foi atualizada (se visível na tabela)
    await expect(page.getByText("Entrevista RH")).toBeVisible({ timeout: 5000 })
  })

  test("deve deletar vaga", async ({ page }) => {
    // Criar vaga para deletar
    await page.getByRole("button", { name: /adicionar vaga/i }).click()
    await page.getByLabel(/empresa/i).fill("[E2E-TEST] Delete Me")
    await page.getByLabel(/cargo/i).fill("Delete Position")
    await page.getByLabel(/local/i).fill("Delete City")
    await page.getByLabel(/modalidade/i).click()
    await page.getByRole("option", { name: "Remoto" }).click()
    await page.getByRole("button", { name: /^salvar$/i }).click()

    await waitForToast(page, /vaga.*sucesso/i)
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 })

    // Aguardar vaga aparecer
    await expect(page.getByText("[E2E-TEST] Delete Me")).toBeVisible({ timeout: 5000 })

    // Deletar vaga
    const vagaRow = page.locator("tr", { hasText: "[E2E-TEST] Delete Me" })
    await vagaRow.getByTestId("vaga-actions-button").click()
    await page.getByText(/excluir/i).click()

    // Confirmar deleção (se houver dialog de confirmação)
    const confirmButton = page.getByRole("button", { name: /confirmar|deletar|excluir/i })
    if (await confirmButton.isVisible({ timeout: 1000 })) {
      await confirmButton.click()
    }

    // Verificar toast
    await waitForToast(page, /excluída.*sucesso/i)

    // Verificar que não existe mais
    await expect(page.getByText("[E2E-TEST] Delete Me")).not.toBeVisible({ timeout: 5000 })
  })

  test("deve preencher todos os campos do formulário", async ({ page }) => {
    await page.getByRole("button", { name: /adicionar vaga/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // Preencher todos os campos
    await page.getByLabel(/empresa/i).fill("[E2E-TEST] Full Form")
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

    await waitForToast(page, /vaga.*sucesso/i)
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 })

    // Verificar na tabela
    await expect(page.getByText("[E2E-TEST] Full Form")).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("Full Stack Developer")).toBeVisible()
  })
})
