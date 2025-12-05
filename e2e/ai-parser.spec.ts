import { test, expect } from "@playwright/test"
import { waitForToast } from "./helpers/test-utils"
import {
  mockParseJobSuccess,
  mockParseJobRateLimit,
  mockParseJobNetworkError,
  unmockAllApis,
} from "./helpers/api-mocks"

test.describe("AI Job Parser", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("vagas-card-title")).toBeVisible()
  })

  test.afterEach(async ({ page }) => {
    // Clean up mocks after each test
    await unmockAllApis(page)
  })

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

  test("deve parsear descrição de vaga com sucesso", async ({ page }) => {
    // Mock successful API response
    await mockParseJobSuccess(page)

    // 1. Abrir diálogo "Adicionar Estágio"
    await page.getByRole("button", { name: /adicionar estágio/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/adicionar nova vaga/i)).toBeVisible()

    // 2. Verificar que está na aba "Descrição"
    const descricaoTab = dialog.getByRole("tab", { name: /descrição/i })
    await expect(descricaoTab).toHaveAttribute("data-state", "active")

    // 3. Colar descrição de vaga no textarea
    const textarea = dialog.getByPlaceholder(/cole a descrição/i)
    await expect(textarea).toBeVisible()
    await textarea.fill(sampleJobDescription)

    // 4. Clicar em "Realizar Análise"
    const fillButton = dialog.getByRole("button", { name: /realizar análise/i })
    await expect(fillButton).toBeEnabled()
    await fillButton.click()

    // 5. Com mocks, resposta é instantânea - verificar mudança de tab diretamente
    const dadosTab = dialog.getByRole("tab", { name: /dados da vaga/i })
    await expect(dadosTab).toHaveAttribute("data-state", "active", { timeout: 10000 })

    // 8. Verificar que campos foram preenchidos
    const empresaInput = dialog.getByLabel(/^empresa/i)
    const cargoInput = dialog.getByLabel(/^cargo/i)
    const localInput = dialog.getByLabel(/^local/i)

    await expect(empresaInput).toHaveValue(/saipem/i)
    await expect(cargoInput).toHaveValue(/estagiário/i)
    await expect(localInput).toHaveValue(/guarujá|são paulo/i)

    // Fechar modal sem salvar
    await page.keyboard.press("Escape")
  })

  test("deve validar tamanho mínimo da descrição (50 chars)", async ({ page }) => {
    // 1. Abrir diálogo
    await page.getByRole("button", { name: /adicionar estágio/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // 2. Digitar menos de 50 caracteres
    const textarea = dialog.getByPlaceholder(/cole a descrição/i)
    await textarea.fill("Texto muito curto")

    // 3. Verificar que botão "Realizar Análise" está desabilitado
    const fillButton = dialog.getByRole("button", { name: /realizar análise/i })
    await expect(fillButton).toBeDisabled()

    // 4. Digitar 50+ caracteres
    const validDescription = "a".repeat(51)
    await textarea.fill(validDescription)

    // 5. Verificar que botão está habilitado
    await expect(fillButton).toBeEnabled()

    await page.keyboard.press("Escape")
  })

  test("deve permitir refazer análise", async ({ page }) => {
    // Mock successful API response
    await mockParseJobSuccess(page)

    // 1. Fazer análise inicial (fluxo completo)
    await page.getByRole("button", { name: /adicionar estágio/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    const textarea = dialog.getByPlaceholder(/cole a descrição/i)
    await textarea.fill(sampleJobDescription)

    const fillButton = dialog.getByRole("button", { name: /realizar análise/i })
    await fillButton.click()

    // Aguardar mudança para aba "Dados da Vaga" (resposta instantânea com mocks)
    const dadosTab = dialog.getByRole("tab", { name: /dados da vaga/i })
    await expect(dadosTab).toHaveAttribute("data-state", "active", { timeout: 10000 })

    // Verificar dados iniciais
    const empresaInput = dialog.getByLabel(/^empresa/i)
    const initialEmpresa = await empresaInput.inputValue()
    expect(initialEmpresa).toMatch(/saipem/i)

    // 3. Clicar em "Refazer Análise"
    const refazerButton = dialog.getByRole("button", { name: /refazer análise/i })
    await expect(refazerButton).toBeVisible()
    await refazerButton.click()

    // 4. Aguardar tab "Dados da Vaga" estar ativa novamente (resposta instantânea com mocks)
    await expect(dadosTab).toHaveAttribute("data-state", "active", { timeout: 10000 })

    // 5. Verificar que dados foram atualizados (devem ser os mesmos para mesma descrição)
    await expect(empresaInput).toHaveValue(/saipem/i)

    await page.keyboard.press("Escape")
  })

  test("deve lidar com erro de rate limit (429)", async ({ page }) => {
    // 1. Abrir diálogo PRIMEIRO
    await page.getByRole("button", { name: /adicionar estágio/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // 2. Setup mock AFTER dialog is open
    await mockParseJobRateLimit(page)

    // 3. Colar descrição
    const textarea = dialog.getByPlaceholder(/cole a descrição/i)
    await textarea.fill(sampleJobDescription)

    // 4. Clicar em "Realizar Análise"
    const fillButton = dialog.getByRole("button", { name: /realizar análise/i })
    await fillButton.click()

    // 5. Aguardar um momento para API call acontecer
    await page.waitForTimeout(500)

    // 6. Verificar que formulário não foi preenchido (ainda na aba Descrição)
    const descricaoTab = dialog.getByRole("tab", { name: /descrição/i })
    await expect(descricaoTab).toHaveAttribute("data-state", "active")

    // 7. Verificar que dados NÃO foram preenchidos
    const dadosTab = dialog.getByRole("tab", { name: /dados da vaga/i })
    await dadosTab.click()
    const empresaInput = dialog.getByLabel(/^empresa/i)
    await expect(empresaInput).toHaveValue("")

    await page.keyboard.press("Escape")
  })

  test("deve lidar com erro de rede/timeout", async ({ page }) => {
    // 1. Abrir diálogo PRIMEIRO
    await page.getByRole("button", { name: /adicionar estágio/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // 2. Setup mock AFTER dialog is open
    await mockParseJobNetworkError(page)

    // 3. Colar descrição
    const textarea = dialog.getByPlaceholder(/cole a descrição/i)
    await textarea.fill(sampleJobDescription)

    // 4. Clicar em "Realizar Análise"
    const fillButton = dialog.getByRole("button", { name: /realizar análise/i })
    await fillButton.click()

    // 5. Aguardar um momento para API call acontecer
    await page.waitForTimeout(500)

    // 6. Verificar que formulário não foi preenchido
    const descricaoTab = dialog.getByRole("tab", { name: /descrição/i })
    await expect(descricaoTab).toHaveAttribute("data-state", "active")

    //7. Verificar que dados NÃO foram preenchidos
    const dadosTab = dialog.getByRole("tab", { name: /dados da vaga/i })
    await dadosTab.click()
    const empresaInput = dialog.getByLabel(/^empresa/i)
    await expect(empresaInput).toHaveValue("")

    await page.keyboard.press("Escape")
  })

  test("deve alternar entre tabs sem perder dados", async ({ page }) => {
    // Mock successful API response
    await mockParseJobSuccess(page)

    // 1. Fazer análise (fluxo completo)
    await page.getByRole("button", { name: /adicionar estágio/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    const textarea = dialog.getByPlaceholder(/cole a descrição/i)
    await textarea.fill(sampleJobDescription)

    const fillButton = dialog.getByRole("button", { name: /realizar análise/i })
    await fillButton.click()

    // Aguardar mudança para aba "Dados da Vaga" (resposta instantânea com mocks)
    const dadosTab = dialog.getByRole("tab", { name: /dados da vaga/i })
    await expect(dadosTab).toHaveAttribute("data-state", "active", { timeout: 10000 })

    // Guardar valor de empresa
    const empresaInput = dialog.getByLabel(/^empresa/i)
    const empresaValue = await empresaInput.inputValue()

    // 3. Voltar para aba "Descrição"
    const descricaoTab = dialog.getByRole("tab", { name: /descrição/i })
    await descricaoTab.click()
    await expect(descricaoTab).toHaveAttribute("data-state", "active")

    // 4. Verificar que descrição ainda está lá
    await expect(textarea).toHaveValue(sampleJobDescription)

    // 5. Ir para aba "Currículo"
    const curriculoTab = dialog.getByRole("tab", { name: /currículo/i })
    await curriculoTab.click()
    await expect(curriculoTab).toHaveAttribute("data-state", "active")

    // 6. Voltar para "Dados da Vaga"
    await dadosTab.click()
    await expect(dadosTab).toHaveAttribute("data-state", "active")

    // 7. Verificar que dados não foram perdidos
    await expect(empresaInput).toHaveValue(empresaValue)

    await page.keyboard.press("Escape")
  })
})
