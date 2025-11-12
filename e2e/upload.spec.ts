import { test, expect } from "@playwright/test"
import path from "path"
import { waitForFileProcessing, waitForEmpresaPopulated } from "./helpers/test-utils"

test.describe("Upload de Arquivos", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    // Wait for page to load
    await expect(page.getByText("Vagas")).toBeVisible()
  })

  test("deve fazer upload de análise .md e preencher campos automaticamente", async ({ page }) => {
    // Abrir modal de adicionar vaga
    await page.getByRole("button", { name: /adicionar vaga/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByText(/adicionar nova vaga/i)).toBeVisible()

    // Fazer upload do arquivo de análise
    const analiseFile = path.join(__dirname, "fixtures/analise-exemplo.md")
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(analiseFile)

    // Aguardar processamento completo (toast de sucesso + preenchimento dos campos)
    await waitForFileProcessing(page)

    // Verificar se campos foram preenchidos automaticamente
    const empresaInput = page.getByLabel(/empresa/i)
    const cargoInput = page.getByLabel(/cargo/i)
    const localInput = page.getByLabel(/local/i)

    await expect(empresaInput).toHaveValue(/Google/i)
    await expect(cargoInput).toHaveValue(/Engenheiro de Software/i)
    await expect(localInput).toHaveValue(/São Paulo/i)

    // Fechar modal sem salvar
    await page.keyboard.press("Escape")
  })

  test("deve fazer upload de currículo PDF", async ({ page }) => {
    await page.getByRole("button", { name: /adicionar vaga/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // Scroll para seção de arquivos
    await page.getByText(/arquivos/i).scrollIntoViewIfNeeded()

    // Fazer upload do CV
    const cvFile = path.join(__dirname, "fixtures/curriculo.pdf")
    const cvInputs = page.locator('input[type="file"]')
    const cvInput = cvInputs.last() // Last input is CV

    await cvInput.setInputFiles(cvFile)

    // Aguardar upload
    await page.waitForTimeout(1500)

    // Verificar que arquivo foi carregado
    await expect(page.getByText(/curriculo\.pdf/i)).toBeVisible()

    await page.keyboard.press("Escape")
  })

  test("deve mostrar erro para arquivo com extensão inválida", async ({ page }) => {
    await page.getByRole("button", { name: /adicionar vaga/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // Tentar fazer upload de arquivo inválido
    const invalidFile = path.join(__dirname, "fixtures/analise-invalida.txt")
    const fileInput = page.locator('input[type="file"]').first()

    await fileInput.setInputFiles(invalidFile)

    // Verificar erro
    await expect(page.getByText(/apenas.*markdown/i)).toBeVisible({ timeout: 3000 })

    await page.keyboard.press("Escape")
  })

  test("deve permitir substituir arquivo já enviado", async ({ page }) => {
    await page.getByRole("button", { name: /adicionar vaga/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // Upload inicial
    const file1 = path.join(__dirname, "fixtures/analise-exemplo.md")
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(file1)

    // Aguardar processamento completo
    await waitForFileProcessing(page)

    // Verificar primeiro arquivo
    await expect(page.getByLabel(/empresa/i)).toHaveValue(/Google/i)

    // Remover arquivo
    const removeButton = page.getByRole("button", { name: /^X$/i }).first()
    await expect(removeButton).toBeVisible()
    await removeButton.click()
    // Aguardar remoção do arquivo
    await expect(fileInput).toBeVisible()

    // Fazer novo upload
    const file2 = path.join(__dirname, "fixtures/analise-exemplo-2.md")
    await fileInput.setInputFiles(file2)

    // Aguardar processamento completo
    await waitForFileProcessing(page)

    // Verificar que foi substituído
    await expect(page.getByLabel(/empresa/i)).toHaveValue(/Microsoft/i)

    await page.keyboard.press("Escape")
  })

  test("deve mostrar indicador de progresso durante upload", async ({ page }) => {
    // Configurar delay controlado para o upload do Supabase Storage
    const uploadDelay = 1000 // 1 segundo de delay
    let uploadIntercepted = false

    // Interceptar requisições de upload do Supabase Storage e adicionar delay
    await page.route("**", async (route) => {
      const url = route.request().url()
      const method = route.request().method()
      // Interceptar requisições POST para endpoints de storage (uploads)
      if (method === "POST" && url.includes("/storage/v1/object/")) {
        uploadIntercepted = true
        // Adicionar delay antes de continuar com a requisição
        await page.waitForTimeout(uploadDelay)
        await route.continue()
      } else {
        await route.continue()
      }
    })

    await page.getByRole("button", { name: /adicionar vaga/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    const analiseFile = path.join(__dirname, "fixtures/analise-exemplo.md")
    const fileInput = page.locator('input[type="file"]').first()

    await fileInput.setInputFiles(analiseFile)

    // Verificar que o texto de upload aparece (indica que o upload iniciou)
    const uploadingText = page.getByText(/enviando e processando/i)
    await expect(uploadingText).toBeVisible({ timeout: 2000 })

    // Localizar o componente de progresso
    // Radix UI Progress usa role="progressbar"
    const progressBar = page.locator('[role="progressbar"]').first()

    // Verificar que o indicador de progresso aparece
    await expect(progressBar).toBeVisible({ timeout: 2000 })

    // Verificar que o progresso atualiza (valor > 0)
    // Aguardar que o progresso seja maior que 0 usando waitForFunction
    await page.waitForFunction(
      () => {
        const progressBar = document.querySelector('[role="progressbar"]') as HTMLElement | null
        if (!progressBar) return false
        const value = progressBar.getAttribute("aria-valuenow")
        return value !== null && parseInt(value) > 0
      },
      { timeout: 3000 }
    )

    // Verificar que o progresso continua visível durante o upload
    // Com o delay de 1s, o progresso deve estar visível por tempo suficiente
    await expect(progressBar).toBeVisible({ timeout: uploadDelay + 500 })

    // Aguardar que o campo empresa seja preenchido para garantir que o processamento foi concluído
    await waitForEmpresaPopulated(page)

    // Verificar que upload completou
    await expect(page.getByLabel(/empresa/i)).toHaveValue(/Google/i)

    // Verificar que a requisição foi interceptada
    expect(uploadIntercepted).toBe(true)

    await page.keyboard.press("Escape")
  })

  test("deve exibir preview dos campos detectados após upload", async ({ page }) => {
    await page.getByRole("button", { name: /adicionar vaga/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    const analiseFile = path.join(__dirname, "fixtures/analise-exemplo.md")
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(analiseFile)

    // Aguardar preview de campos detectados aparecer
    await page.getByText(/campos detectados automaticamente/i).waitFor({ state: "visible" })

    // Verificar preview de campos detectados
    await expect(page.getByText(/campos detectados automaticamente/i)).toBeVisible()
    await expect(page.getByText(/empresa.*google/i)).toBeVisible()
    await expect(page.getByText(/cargo.*engenheiro/i)).toBeVisible()

    await page.keyboard.press("Escape")
  })
})
