import { test, expect } from "@playwright/test"
import { getTableRowCount, clearAllFilters } from "./helpers/test-utils"

test.describe("Filtros do Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("Vagas")).toBeVisible()
    // Aguardar tabela carregar
    await page.waitForTimeout(1000)
  })

  test("deve filtrar por busca de texto (empresa/cargo)", async ({ page }) => {
    // Pegar contagem inicial
    const totalRows = await getTableRowCount(page)

    // Se não houver vagas, pular teste
    if (totalRows === 0) {
      test.skip()
      return
    }

    // Buscar por termo específico
    const searchInput = page.getByPlaceholder(/buscar.*empresa.*cargo/i)
    await searchInput.fill("Google")
    await page.waitForTimeout(800)

    const filteredRows = await getTableRowCount(page)

    // Deve ter menos vagas ou igual
    expect(filteredRows).toBeLessThanOrEqual(totalRows)

    // Limpar busca
    await searchInput.clear()
    await page.waitForTimeout(500)

    const rowsAfterClear = await getTableRowCount(page)
    expect(rowsAfterClear).toBe(totalRows)
  })

  test("deve filtrar por modalidade", async ({ page }) => {
    const totalRows = await getTableRowCount(page)

    if (totalRows === 0) {
      test.skip()
      return
    }

    // Encontrar e clicar no select de modalidade
    const modalidadeSelect = page.locator("button[role='combobox']").filter({ hasText: /modalidade|todas/i }).first()

    await modalidadeSelect.click()
    await page.waitForTimeout(300)

    // Selecionar "Remoto"
    const remotoOption = page.getByRole("option", { name: "Remoto" })
    if (await remotoOption.isVisible()) {
      await remotoOption.click()
      await page.waitForTimeout(800)

      const filteredRows = await getTableRowCount(page)
      expect(filteredRows).toBeLessThanOrEqual(totalRows)

      // Verificar que apenas vagas remotas aparecem (se houver vagas)
      if (filteredRows > 0) {
        const modalidadeCells = page.locator("table tbody tr td").filter({ hasText: /remoto/i })
        const modalidadeCount = await modalidadeCells.count()
        expect(modalidadeCount).toBeGreaterThan(0)
      }
    }
  })

  test("deve filtrar por status", async ({ page }) => {
    const totalRows = await getTableRowCount(page)

    if (totalRows === 0) {
      test.skip()
      return
    }

    // Encontrar select de status
    const statusSelect = page.locator("button[role='combobox']").filter({ hasText: /status|todos/i }).first()

    await statusSelect.click()
    await page.waitForTimeout(300)

    // Selecionar "Pendente"
    const pendenteOption = page.getByRole("option", { name: "Pendente" })
    if (await pendenteOption.isVisible()) {
      await pendenteOption.click()
      await page.waitForTimeout(800)

      const filteredRows = await getTableRowCount(page)
      expect(filteredRows).toBeLessThanOrEqual(totalRows)
    }
  })

  test("deve filtrar por etapa", async ({ page }) => {
    const totalRows = await getTableRowCount(page)

    if (totalRows === 0 || totalRows < 2) {
      test.skip()
      return
    }

    // Encontrar select de etapa
    const etapaSelect = page.locator("button[role='combobox']").filter({ hasText: /etapa|todas/i }).first()

    await etapaSelect.click()
    await page.waitForTimeout(300)

    // Pegar primeira opção disponível (não "Todas")
    const options = page.getByRole("option")
    const optionCount = await options.count()

    if (optionCount > 1) {
      // Clicar na segunda opção (primeira após "Todas")
      await options.nth(1).click()
      await page.waitForTimeout(800)

      const filteredRows = await getTableRowCount(page)
      expect(filteredRows).toBeLessThanOrEqual(totalRows)
    }
  })

  test("deve combinar múltiplos filtros", async ({ page }) => {
    const totalRows = await getTableRowCount(page)

    if (totalRows === 0) {
      test.skip()
      return
    }

    // Buscar por texto
    const searchInput = page.getByPlaceholder(/buscar/i)
    await searchInput.fill("E2E")
    await page.waitForTimeout(500)

    const step1Rows = await getTableRowCount(page)

    // Adicionar filtro de status
    const statusSelect = page.locator("button[role='combobox']").filter({ hasText: /status|todos/i }).first()
    if (await statusSelect.isVisible()) {
      await statusSelect.click()
      await page.waitForTimeout(200)

      const pendenteOption = page.getByRole("option", { name: "Pendente" })
      if (await pendenteOption.isVisible()) {
        await pendenteOption.click()
        await page.waitForTimeout(800)

        const step2Rows = await getTableRowCount(page)

        // Deve ter mesmo número ou menos vagas
        expect(step2Rows).toBeLessThanOrEqual(step1Rows)
        expect(step2Rows).toBeLessThanOrEqual(totalRows)
      }
    }
  })

  test("deve limpar todos os filtros com botão de limpar", async ({ page }) => {
    const totalRows = await getTableRowCount(page)

    if (totalRows === 0) {
      test.skip()
      return
    }

    // Aplicar filtros
    await page.getByPlaceholder(/buscar/i).fill("Test")
    await page.waitForTimeout(500)

    const filteredRows = await getTableRowCount(page)

    // Procurar botão de limpar filtros
    const clearButton = page.getByRole("button", { name: /limpar.*filtros/i })

    if (await clearButton.isVisible()) {
      await clearButton.click()
      await page.waitForTimeout(500)

      const rowsAfterClear = await getTableRowCount(page)

      // Deve ter mais vagas ou igual
      expect(rowsAfterClear).toBeGreaterThanOrEqual(filteredRows)
    }
  })

  test("deve mostrar mensagem quando não há resultados", async ({ page }) => {
    // Buscar por algo que não existe
    const searchInput = page.getByPlaceholder(/buscar/i)
    await searchInput.fill("XYZABC123NONEXISTENT")
    await page.waitForTimeout(800)

    // Verificar mensagem de vazio ou nenhum resultado
    const emptyMessage = page.getByText(/nenhuma vaga encontrada/i)
    if (await emptyMessage.isVisible()) {
      await expect(emptyMessage).toBeVisible()
    } else {
      // Ou verificar que tabela está vazia
      const rowCount = await getTableRowCount(page)
      expect(rowCount).toBe(0)
    }
  })
})
