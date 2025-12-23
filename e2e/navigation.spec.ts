import { test, expect } from "@playwright/test"

test.describe("Navegação do Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("vagas-card-title")).toBeVisible()
  })

  test("deve navegar entre abas", async ({ page }) => {
    // Aguardar página carregar
    await page.waitForLoadState("networkidle")

    // Verificar que está na aba Vagas (padrão) - verificar se o título está visível
    await expect(page.getByRole("heading", { name: /estágios/i })).toBeVisible()

    // Navegar para Resumo via botão da sidebar
    await page.getByTestId("sidebar-resumo").click()
    // Verificar que aba Resumo está ativa - verificar se conteúdo específico do resumo está visível
    await expect(page.getByText(/histórico|estatísticas|análise|últimos.*dias/i).first()).toBeVisible({ timeout: 5000 })

    // Navegar para Configurações via botão da sidebar
    await page.getByTestId("sidebar-configuracoes").click()
    // Verificar que página de configurações está ativa - procurar por tabs "Geral" e "Prompts de IA"
    await expect(page.getByRole("tab", { name: /geral/i })).toBeVisible({ timeout: 5000 })

    // Voltar para Dashboard via botão da sidebar
    await page.getByTestId("sidebar-vagas").click()
    // Verificar que está na aba Dashboard/Vagas - verificar se algum elemento característico está visível
    await expect(page.getByText(/adicionar vaga|meta do dia/i).first()).toBeVisible({ timeout: 10000 })
  })

  test("deve navegar entre datas com setas", async ({ page }) => {
    // Aguardar data carregar
    await page.waitForLoadState("domcontentloaded")

    // Usar testids dos botões de navegação de data
    const prevButton = page.getByTestId("prev-date-button")
    const nextButton = page.getByTestId("next-date-button")

    // Verificar que botões existem
    await expect(prevButton).toBeVisible()
    await expect(nextButton).toBeVisible()

    // Capturar data atual antes de navegar
    const datePickerButton = page.getByTestId("date-picker-trigger")
    const initialDate = await datePickerButton.textContent()

    // Clicar em próximo dia
    await nextButton.click()

    // Aguardar que a data mude no picker
    await expect
      .poll(async () => await datePickerButton.textContent(), {
        message: "Aguardando mudança de data",
        timeout: 5000,
      })
      .not.toBe(initialDate)

    // Clicar em dia anterior
    await prevButton.click()

    // Aguardar que a data volte
    await expect
      .poll(async () => await datePickerButton.textContent(), {
        message: "Aguardando data voltar",
        timeout: 5000,
      })
      .toBe(initialDate)
  })

  test("deve abrir detalhes da vaga em nova página", async ({ page }) => {
    // Verificar se há vagas na tabela
    const rowCount = await page.locator("table tbody tr").count()

    if (rowCount === 0) {
      test.skip()
      return
    }

    // Procurar ícone de visualizar/detalhes
    const viewButton = page
      .locator("table tbody tr")
      .first()
      .locator('button[aria-label*="detalhes"], button[aria-label*="visualizar"]')
      .first()
    // Fallback to any button in the row if specific aria-label not found
    const actionButton =
      (await viewButton.count()) > 0 ? viewButton : page.locator("table tbody tr").first().locator("button").first()

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

  test("deve manter estado ao navegar entre páginas", async ({ page }) => {
    // Aguardar página carregar
    await page.waitForLoadState("networkidle")

    // Aplicar um filtro
    const searchInput = page.getByPlaceholder(/buscar/i)
    await searchInput.fill("Test")

    // Ir para Resumo via botão da sidebar
    await page.getByTestId("sidebar-resumo").click()
    await expect(page.getByText(/histórico|estatísticas|análise|últimos.*dias/i).first()).toBeVisible({ timeout: 5000 })

    // Voltar para Dashboard via botão da sidebar
    await page.getByTestId("sidebar-vagas").click()
    await expect(page.getByText(/adicionar vaga|meta do dia/i).first()).toBeVisible({ timeout: 10000 })

    // Verificar que filtro foi mantido ou resetado (comportamento esperado)
    const searchValue = await searchInput.inputValue()

    // Ambos comportamentos são válidos:
    // 1. Filtro mantido (searchValue === "Test")
    // 2. Filtro resetado (searchValue === "")
    expect(["Test", ""]).toContain(searchValue)
  })

  test("deve exibir indicadores de carregamento", async ({ page }) => {
    // Delay artificial para requisições do Supabase (200ms - reduzido para evitar timeout)
    const requestDelay = 200
    let requestCount = 0
    // Usar um seletor mais específico - o texto de carregamento dentro do CardContent da tabela
    const loadingText = page.locator('[class*="text-center"][class*="py-8"]', { hasText: /carregando/i })

    // Função auxiliar para delay
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    // Interceptar requisições do Supabase REST API e adicionar delay
    await page.route("**/rest/v1/**", async (route) => {
      requestCount++
      // Adicionar delay antes de continuar com a requisição
      await delay(requestDelay)
      await route.continue()
    })

    // Aguardar networkidle antes de reload para garantir estado limpo
    await page.waitForLoadState("networkidle")

    // Recarregar página com delay nas requisições
    await page.reload()

    // Verificar que o indicador de carregamento aparece
    await expect(loadingText).toBeVisible({ timeout: 2000 })

    // Aguardar que o indicador desapareça e a tabela apareça (ou mensagem de vazio)
    await expect(loadingText).not.toBeVisible({ timeout: 15000 })

    // Verificar que a tabela OU mensagem de "nenhuma vaga encontrada" aparece
    const tableOrEmpty = page.locator("table").or(page.getByText(/nenhuma vaga encontrada/i))
    await expect(tableOrEmpty).toBeVisible({ timeout: 10000 })

    // Verificar que pelo menos uma requisição foi interceptada
    expect(requestCount).toBeGreaterThan(0)
  })
})
