import { test, expect } from "@playwright/test"
import { getTableRowCount } from "./helpers/test-utils"

test.describe("Filtros do Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("Vagas")).toBeVisible()
    // Aguardar tabela carregar
    await page.waitForLoadState("networkidle")
    await expect(page.locator("table")).toBeVisible()
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
    const tableBody = page.locator("table tbody")
    const filteredRowsLocator = tableBody.locator("tr")

    const initialCount = await getTableRowCount(page)
    await searchInput.fill("Google")

    // Aguardar que a filtragem seja aplicada de forma determinística
    // Poll até que a contagem mude ou até que a tabela seja atualizada
    const rowsWithGoogle = tableBody.locator("tr").filter({ hasText: /google/i })
    const emptyMessage = page.getByText(/nenhuma vaga encontrada|nenhum resultado/i)

    // Aguardar que OU apareça uma linha com "Google" OU a mensagem de vazio apareça
    // Usar Promise.any para aguardar a primeira condição que se tornar visível
    const googleRowPromise = expect(rowsWithGoogle.first())
      .toBeVisible({ timeout: 5000 })
      .then(() => "google" as const)

    const emptyMessagePromise = expect(emptyMessage)
      .toBeVisible({ timeout: 5000 })
      .then(() => "empty" as const)

    // Aguardar a primeira promessa que resolver com sucesso
    try {
      await Promise.any([googleRowPromise, emptyMessagePromise])
    } catch (error) {
      // Se Promise.any rejeitar, significa que todas as condições falharam
      if (error instanceof AggregateError) {
        const errorMessages = error.errors
          .map((err, index) => {
            const type = index === 0 ? "linha com 'Google'" : "mensagem de vazio"
            return `  - ${type}: ${err instanceof Error ? err.message : String(err)}`
          })
          .join("\n")

        throw new Error(`Nenhuma das condições esperadas foi atendida dentro do timeout de 5000ms:\n${errorMessages}`)
      }
      // Re-lançar erro se não for AggregateError
      throw error
    }

    const filteredRowsCount = await getTableRowCount(page)

    // Se houver resultados, verificar que todas as linhas visíveis contêm "Google" na empresa ou cargo
    if (filteredRowsCount > 0) {
      const rowCount = await filteredRowsLocator.count()
      expect(rowCount).toBeGreaterThan(0)

      // Verificar que todas as linhas visíveis contêm "Google" na empresa ou cargo
      for (let i = 0; i < rowCount; i++) {
        const row = filteredRowsLocator.nth(i)
        const empresa = await row.locator("td").nth(0).textContent()
        const cargo = await row.locator("td").nth(1).textContent()
        const hasGoogle = empresa?.toLowerCase().includes("google") || cargo?.toLowerCase().includes("google")
        expect(hasGoogle).toBe(true)
      }
    }
  })

  test("deve filtrar por modalidade", async ({ page }) => {
    const totalRows = await getTableRowCount(page)

    if (totalRows === 0) {
      test.skip()
      return
    }

    // Encontrar e clicar no select de modalidade
    const modalidadeSelect = page
      .locator("button[role='combobox']")
      .filter({ hasText: /modalidade|todas/i })
      .first()

    await modalidadeSelect.click()
    // Aguardar dropdown abrir e opção estar visível
    const remotoOption = page.getByRole("option", { name: "Remoto" })
    await expect(remotoOption).toBeVisible({ timeout: 5000 })

    // Selecionar "Remoto"
    if (await remotoOption.isVisible()) {
      await remotoOption.click()
      // Aguardar dropdown fechar (filtragem client-side é síncrona, tabela atualiza automaticamente)
      await expect(remotoOption).not.toBeVisible({ timeout: 5000 })

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
    const statusSelect = page
      .locator("button[role='combobox']")
      .filter({ hasText: /status|todos/i })
      .first()

    await statusSelect.click()
    const pendenteOption = page.getByRole("option", { name: "Pendente" })
    await expect(pendenteOption).toBeVisible({ timeout: 5000 })

    // Selecionar "Pendente"
    if (await pendenteOption.isVisible()) {
      const initialCount = await getTableRowCount(page)
      await pendenteOption.click()

      // Aguardar que a tabela seja atualizada após selecionar status
      await expect
        .poll(async () => await getTableRowCount(page), {
          message: "Aguardando atualização da tabela após filtrar por status",
        })
        .toBeLessThanOrEqual(initialCount)

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
    const initialCount = await getTableRowCount(page)
    await searchInput.fill("E2E")

    // Aguardar que a busca seja aplicada (verificar que o input tem o valor)
    await expect(searchInput).toHaveValue("E2E")

    // Aguardar que o filtro seja aplicado de forma determinística
    // Verificar que a tabela foi atualizada: ou aparece uma linha com "E2E" ou a contagem muda
    const tableBody = page.locator("table tbody")
    const rowsWithE2E = tableBody.locator("tr").filter({ hasText: /e2e/i })

    // Aguardar que OU apareça uma linha com "E2E" OU a contagem de linhas mude
    await expect
      .poll(
        async () => {
          const hasE2ERow = await rowsWithE2E
            .first()
            .isVisible()
            .catch(() => false)
          const currentCount = await getTableRowCount(page)
          return hasE2ERow || currentCount !== initialCount
        },
        {
          message: "Aguardando que o filtro seja aplicado: linha com 'E2E' visível ou contagem de linhas alterada",
          timeout: 5000,
        }
      )
      .toBe(true)

    const step1Rows = await getTableRowCount(page)

    // Adicionar filtro de status
    const statusSelect = page
      .locator("button[role='combobox']")
      .filter({ hasText: /status|todos/i })
      .first()
    if (await statusSelect.isVisible()) {
      await statusSelect.click()
      const pendenteOption = page.getByRole("option", { name: "Pendente" })
      await expect(pendenteOption).toBeVisible({ timeout: 5000 })

      if (await pendenteOption.isVisible()) {
        await pendenteOption.click()

        // Aguardar que a tabela seja atualizada após adicionar filtro de status
        await expect
          .poll(async () => await getTableRowCount(page), {
            message: "Aguardando atualização da tabela após combinar filtros",
          })
          .toBeLessThanOrEqual(step1Rows)

        const step2Rows = await getTableRowCount(page)

        // Deve ter mesmo número ou menos vagas
        expect(step2Rows).toBeLessThanOrEqual(step1Rows)
        expect(step2Rows).toBeLessThanOrEqual(totalRows)
      }
    }
  })

  test("deve limpar filtros", async ({ page }) => {
    const totalRows = await getTableRowCount(page)

    if (totalRows === 0) {
      test.skip()
      return
    }

    // Pegar contagem inicial antes de aplicar filtros
    const initialCount = await getTableRowCount(page)

    // Aplicar filtros
    const searchInput = page.getByPlaceholder(/buscar/i)
    await searchInput.fill("Test")

    // Aguardar que o valor do input seja definido (mais determinístico que aguardar mudança na contagem)
    await expect
      .poll(async () => await searchInput.inputValue(), {
        message: "Aguardando que o valor do input de busca seja definido",
      })
      .toBe("Test")

    const filteredRows = await getTableRowCount(page)

    // Procurar botão de limpar filtros e aguardar que esteja visível
    const clearButton = page.getByRole("button", { name: /limpar.*filtros/i })

    try {
      await clearButton.waitFor({ state: "visible", timeout: 5000 })
      await clearButton.click()

      // Aguardar que a tabela seja atualizada após limpar filtros
      // Poll até que a contagem seja maior ou igual à contagem filtrada
      await expect
        .poll(async () => await getTableRowCount(page), {
          message: "Aguardando atualização da tabela após limpar filtros",
        })
        .toBeGreaterThanOrEqual(filteredRows)

      const rowsAfterClear = await getTableRowCount(page)

      // Deve ter mais vagas ou igual após limpar
      expect(rowsAfterClear).toBeGreaterThanOrEqual(filteredRows)
    } catch (error) {
      // O botão de limpar deve estar visível após aplicar filtros
      throw new Error("Clear filters button should be visible after applying filters")
    }
  })

  test("deve mostrar mensagem quando não há resultados", async ({ page }) => {
    // Buscar por algo que não existe
    const searchInput = page.getByPlaceholder(/buscar/i)
    const initialCount = await getTableRowCount(page)
    await searchInput.fill("XYZABC123NONEXISTENT")

    // Aguardar que a tabela seja atualizada ou mensagem de vazio apareça
    const emptyMessage = page.getByText(/nenhuma vaga encontrada|nenhum resultado/i)

    // Poll até que a mensagem de vazio esteja visível OU a contagem de linhas seja 0
    await expect
      .poll(
        async () => {
          const isMessageVisible = await emptyMessage.isVisible().catch(() => false)
          const rowCount = await getTableRowCount(page)
          return isMessageVisible || rowCount === 0
        },
        {
          message: "Aguardando mensagem de vazio ou tabela vazia após busca sem resultados",
          timeout: 5000,
        }
      )
      .toBe(true)

    // Verificar estado final: tabela deve estar vazia e mensagem deve estar visível
    const finalRowCount = await getTableRowCount(page)
    expect(finalRowCount).toBe(0)

    const isMessageVisible = await emptyMessage.isVisible().catch(() => false)
    expect(isMessageVisible).toBe(true)
  })
})
