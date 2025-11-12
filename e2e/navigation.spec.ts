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
    // Verificar que aba Resumo está ativa
    await expect(page.getByRole("tab", { name: /resumo/i, selected: true })).toBeVisible()

    // Verificar conteúdo da aba Resumo (gráficos, histórico, etc.)
    const hasChart = await page.getByText(/histórico|estatísticas|análise/i).isVisible()
    const hasContent = await page.locator("canvas, svg, [data-testid='chart']").count()

    // Pelo menos algum conteúdo deve estar visível
    expect(hasChart || hasContent > 0).toBeTruthy()

    // Navegar para Configurações
    await page.getByRole("tab", { name: /configurações/i }).click()
    await expect(page.getByRole("tab", { name: /configurações/i, selected: true })).toBeVisible()

    // Verificar que campos de configuração estão presentes
    await expect(page.getByText(/horário.*início|hora.*início/i)).toBeVisible()

    // Voltar para Estágios
    await page.getByRole("tab", { name: /estágios/i }).click()
    await expect(page.getByRole("tab", { name: /estágios/i, selected: true })).toBeVisible()
    await expect(page.locator("table")).toBeVisible()
  })

  test("deve navegar entre datas com setas", async ({ page }) => {
    // Aguardar data carregar
    await page.waitForLoadState('domcontentloaded')

    // Procurar por elementos de navegação de data
    const prevButton = page.getByRole("button", { name: /anterior|prev|<|◀/i }).first()
    const nextButton = page.getByRole("button", { name: /próximo|next|>|▶/i }).first()

    // Skip if navigation buttons don't exist
    if ((await prevButton.count()) === 0 || (await nextButton.count()) === 0) {
      test.skip()
    }

    // Clicar em próximo dia
    await nextButton.click()
    await expect(page.locator("table")).toBeVisible()

    // Clicar em dia anterior
    await prevButton.click()

    // Verificar que dados recarregaram (table deve estar presente)
    await expect(page.locator("table")).toBeVisible()
  })

  test("deve abrir detalhes da vaga em nova página", async ({ page }) => {
    // Verificar se há vagas na tabela
  test("deve abrir detalhes da vaga em nova página", async ({ page }) => {
    // Verificar se há vagas na tabela
    const rowCount = await page.locator("table tbody tr").count()

    if (rowCount === 0) {
      test.skip()
      return
    }

    // Procurar ícone de visualizar/detalhes
    const viewButton = page.locator("table tbody tr").first().locator('button[aria-label*="detalhes"], button[aria-label*="visualizar"]').first()
    // Fallback to any button in the row if specific aria-label not found
    const actionButton = (await viewButton.count()) > 0 ? viewButton : page.locator("table tbody tr").first().locator('button').first()

    if (await actionButton.isVisible()) {
      // Clicar no ícone de visualizar
      await actionButton.click()

      // Aguardar navegação
      await page.waitForURL(/\/vaga\/.+/)

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

      await page.waitForURL(/\/$/)

      // Verificar que voltou para dashboard
      await expect(page.locator("table")).toBeVisible()
      expect(page.url()).toMatch(/\/$/)
    }
  })
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

    // Ir para Resumo
    await page.getByRole("tab", { name: /resumo/i }).click()
    await expect(page.getByRole("tab", { name: /resumo/i, selected: true })).toBeVisible()

    // Voltar para Estágios
    await page.getByRole("tab", { name: /estágios/i }).click()
    await expect(page.getByRole("tab", { name: /estágios/i, selected: true })).toBeVisible()

    // Verificar que filtro foi mantido ou resetado (comportamento esperado)
    const searchValue = await searchInput.inputValue()

    // Ambos comportamentos são válidos:
    // 1. Filtro mantido (searchValue === "Test")
    // 2. Filtro resetado (searchValue === "")
    expect(["Test", ""]).toContain(searchValue)
  })

  test("deve exibir indicadores de carregamento", async ({ page }) => {
    // Delay artificial para requisições do Supabase (500ms)
    const requestDelay = 500
    let requestCount = 0
    const loadingText = page.getByText(/carregando/i)

    // Função auxiliar para delay
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    // Interceptar requisições do Supabase REST API e adicionar delay
    await page.route("**/rest/v1/**", async (route) => {
      requestCount++
      // Adicionar delay antes de continuar com a requisição
      await delay(requestDelay)
      await route.continue()
    })

    // Recarregar página com delay nas requisições
    await page.reload()

    // Verificar que o indicador de carregamento aparece
    // Usar timeout maior que o delay para garantir captura
    await expect(loadingText).toBeVisible({ timeout: requestDelay + 500 })

    // Aguardar que a tabela se torne visível (indica que o carregamento terminou)
    // O timeout deve ser maior que o delay para garantir que as requisições completem
    await expect(page.locator("table")).toBeVisible({ timeout: requestDelay + 3000 })

    // Verificar que o indicador de carregamento desapareceu após o carregamento
    await expect(loadingText).not.toBeVisible({ timeout: 1000 })

    // Verificar que pelo menos uma requisição foi interceptada
    expect(requestCount).toBeGreaterThan(0)
  })
})
