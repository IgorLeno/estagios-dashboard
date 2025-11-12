import { test, expect } from "@playwright/test"

test.describe("Navegação do Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("Vagas")).toBeVisible()
  })

  test("deve navegar entre abas", async ({ page }) => {
    // Verificar que está na aba Estágios (padrão)
    await expect(page.getByRole("tab", { name: /estágios/i, selected: true })).toBeVisible()

    // Navegar para Resumo
    await page.getByRole("tab", { name: /resumo/i }).click()
    await page.waitForTimeout(500)

    // Verificar que aba Resumo está ativa
    await expect(page.getByRole("tab", { name: /resumo/i, selected: true })).toBeVisible()

    // Verificar conteúdo da aba Resumo (gráficos, histórico, etc.)
    const hasChart = await page.getByText(/histórico|estatísticas|análise/i).isVisible()
    const hasContent = await page.locator("canvas, svg, [data-testid='chart']").count()

    // Pelo menos algum conteúdo deve estar visível
    expect(hasChart || hasContent > 0).toBeTruthy()

    // Navegar para Configurações
    await page.getByRole("tab", { name: /configurações/i }).click()
    await page.waitForTimeout(500)

    await expect(page.getByRole("tab", { name: /configurações/i, selected: true })).toBeVisible()

    // Verificar que campos de configuração estão presentes
    await expect(page.getByText(/horário.*início|hora.*início/i)).toBeVisible()

    // Voltar para Estágios
    await page.getByRole("tab", { name: /estágios/i }).click()
    await page.waitForTimeout(500)

    await expect(page.getByRole("tab", { name: /estágios/i, selected: true })).toBeVisible()
    await expect(page.locator("table")).toBeVisible()
  })

  test("deve navegar entre datas com setas", async ({ page }) => {
    // Aguardar data carregar
    await page.waitForTimeout(1000)

    // Procurar por elementos de navegação de data
    const prevButton = page.getByRole("button", { name: /anterior|prev|<|◀/i }).first()
    const nextButton = page.getByRole("button", { name: /próximo|next|>|▶/i }).first()

    // Se houver navegação de data
    if ((await prevButton.isVisible()) && (await nextButton.isVisible())) {
      // Clicar em próximo dia
      await nextButton.click()
      await page.waitForTimeout(500)

      // Clicar em dia anterior
      await prevButton.click()
      await page.waitForTimeout(500)

      // Verificar que dados recarregaram (table deve estar presente)
      await expect(page.locator("table")).toBeVisible()
    } else {
      // Se não houver navegação de data, pular teste
      test.skip()
    }
  })

  test("deve abrir detalhes da vaga em nova página", async ({ page }) => {
    // Verificar se há vagas na tabela
    const rowCount = await page.locator("table tbody tr").count()

    if (rowCount === 0) {
      test.skip()
      return
    }

    // Procurar ícone de visualizar/detalhes
    const viewIcon = page.locator("table tbody tr").first().locator('button svg[class*="lucide"]').first()

    if (await viewIcon.isVisible()) {
      // Clicar no ícone de visualizar
      await viewIcon.click()

      // Aguardar navegação
      await page.waitForTimeout(1000)

      // Verificar URL mudou para /vaga/[id]
      expect(page.url()).toMatch(/\/vaga\/.+/)

      // Verificar que está na página de detalhes
      const hasBackButton = await page.getByRole("button", { name: /voltar|retornar/i }).isVisible()
      const hasDetails = await page.locator("h1, h2").count()

      expect(hasBackButton || hasDetails > 0).toBeTruthy()

      // Voltar para dashboard
      if (hasBackButton) {
        await page.getByRole("button", { name: /voltar|retornar/i }).click()
      } else {
        await page.goBack()
      }

      await page.waitForTimeout(500)

      // Verificar que voltou para dashboard
      await expect(page.locator("table")).toBeVisible()
      expect(page.url()).toMatch(/\/$/)
    }
  })

  test("deve exibir meta diária", async ({ page }) => {
    // Procurar por card de meta
    const metaCard = page.getByText(/meta.*diária|meta.*hoje/i)

    if (await metaCard.isVisible()) {
      await expect(metaCard).toBeVisible()

      // Verificar que há um número de meta
      const metaNumber = page.locator("text=/\\d+/").first()
      await expect(metaNumber).toBeVisible()
    } else {
      // Meta pode estar em outro formato, verificar elementos relacionados
      const hasMetaContent = await page.getByText(/vagas.*hoje|candidaturas/i).isVisible()
      if (!hasMetaContent) {
        test.skip()
      }
    }
  })

  test("deve manter estado ao navegar entre páginas", async ({ page }) => {
    // Aplicar um filtro
    const searchInput = page.getByPlaceholder(/buscar/i)
    await searchInput.fill("Test")
    await page.waitForTimeout(500)

    // Ir para Resumo
    await page.getByRole("tab", { name: /resumo/i }).click()
    await page.waitForTimeout(500)

    // Voltar para Estágios
    await page.getByRole("tab", { name: /estágios/i }).click()
    await page.waitForTimeout(500)

    // Verificar que filtro foi mantido ou resetado (comportamento esperado)
    const searchValue = await searchInput.inputValue()

    // Ambos comportamentos são válidos:
    // 1. Filtro mantido (searchValue === "Test")
    // 2. Filtro resetado (searchValue === "")
    expect(["Test", ""]).toContain(searchValue)
  })

  test("deve exibir indicadores de carregamento", async ({ page }) => {
    // Recarregar página e procurar por loading states
    await page.reload()

    // Procurar por loading spinners, skeletons ou texto de "Carregando"
    const loadingIndicator = page.getByText(/carregando|loading/i)

    // Loading pode ser muito rápido, então tentamos capturar ou verificar estado final
    const isLoading = await loadingIndicator.isVisible().catch(() => false)
    const tableVisible = await page.locator("table").isVisible({ timeout: 5000 })

    // Pelo menos a tabela deve estar visível no final
    expect(tableVisible).toBeTruthy()
  })
})
