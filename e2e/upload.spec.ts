import { test, expect } from "@playwright/test"
import path from "path"
import { waitForFileProcessing, waitForEmpresaPopulated } from "./helpers/test-utils"

test.describe("Upload de Arquivos", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    // Wait for page to load
    await expect(page.getByTestId("vagas-card-title")).toBeVisible()
  })

  test("deve fazer upload de análise .md e preencher campos automaticamente", async ({ page }) => {
    await page.waitForLoadState("networkidle")

    // Abrir modal de adicionar vaga
    await page.getByRole("button", { name: /adicionar vaga/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/adicionar nova vaga/i)).toBeVisible()

    // Fazer upload do arquivo de análise
    const analiseFile = path.join(__dirname, "fixtures/analise-exemplo.md")
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(analiseFile)

    // Aguardar indicador de campos detectados aparecer
    await expect(dialog.getByText(/campos detectados automaticamente/i)).toBeVisible({ timeout: 10000 })

    // Aguardar que o campo empresa seja preenchido
    await waitForEmpresaPopulated(page)

    // Verificar se campos foram preenchidos automaticamente
    const empresaInput = dialog.getByLabel(/^empresa/i)
    const cargoInput = dialog.getByLabel(/^cargo/i)
    const localInput = dialog.getByLabel(/^local/i)

    await expect(empresaInput).toHaveValue(/Google/i)
    await expect(cargoInput).toHaveValue(/Engenheiro de Software/i)
    await expect(localInput).toHaveValue(/São Paulo/i)

    // Fechar modal sem salvar
    await page.keyboard.press("Escape")
  })

  test("deve fazer upload de currículo PDF", async ({ page }) => {
    await page.waitForLoadState("networkidle")

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
    await page.waitForLoadState("networkidle")

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
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: /adicionar vaga/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // Upload inicial
    const file1 = path.join(__dirname, "fixtures/analise-exemplo.md")
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(file1)

    // Aguardar indicador de campos detectados
    await expect(dialog.getByText(/campos detectados automaticamente/i)).toBeVisible({ timeout: 10000 })
    await waitForEmpresaPopulated(page)

    // Verificar primeiro arquivo
    await expect(dialog.getByLabel(/^empresa/i)).toHaveValue(/Google/i)

    // Remover arquivo usando o aria-label
    const removeButton = page.getByRole("button", { name: /remover arquivo/i }).first()
    await expect(removeButton).toBeVisible()
    await removeButton.click()

    // Aguardar remoção do arquivo - verificar que o botão de remover não está mais visível
    await expect(removeButton).not.toBeVisible({ timeout: 5000 })

    // Aguardar que a zona de upload do primeiro componente (análise .md) apareça novamente
    const uploadLabel = page.getByLabel(/upload.*análise/i)
    await expect(uploadLabel.getByText(/arraste ou clique para upload/i)).toBeVisible({ timeout: 5000 })

    // Fazer novo upload
    const file2 = path.join(__dirname, "fixtures/analise-exemplo-2.md")
    await fileInput.setInputFiles(file2)

    // Aguardar indicador de campos detectados do segundo upload
    await expect(dialog.getByText(/campos detectados automaticamente/i)).toBeVisible({ timeout: 10000 })
    await waitForEmpresaPopulated(page)

    // Verificar que foi substituído
    await expect(dialog.getByLabel(/^empresa/i)).toHaveValue(/Microsoft/i)

    await page.keyboard.press("Escape")
  })

  test("deve mostrar indicador de progresso durante upload", async ({ page }) => {
    await page.waitForLoadState("networkidle")

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

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    const analiseFile = path.join(__dirname, "fixtures/analise-exemplo.md")
    const fileInput = page.locator('input[type="file"]').first()

    await fileInput.setInputFiles(analiseFile)

    // Verificar que o texto de upload aparece (indica que o upload iniciou)
    const uploadingText = page.getByText(/enviando e processando/i)
    await expect(uploadingText).toBeVisible({ timeout: 2000 })

    // Localizar o componente de progresso
    // Radix UI Progress usa role="progressbar"
    const progressBar = page.locator('[role="progressbar"]').first()

    // Verificar que o indicador de progresso aparece durante o upload
    // O upload com delay deve manter o progresso visível por tempo suficiente
    await expect(progressBar).toBeVisible({ timeout: 2000 })

    // Aguardar um pouco para garantir que o progresso está sendo exibido
    await page.waitForTimeout(500)

    // Aguardar que o campo empresa seja preenchido para garantir que o processamento foi concluído
    await waitForEmpresaPopulated(page)

    // Verificar que upload completou
    await expect(dialog.getByLabel(/^empresa/i)).toHaveValue(/Google/i)

    // Verificar que a requisição foi interceptada
    expect(uploadIntercepted).toBe(true)

    await page.keyboard.press("Escape")
  })

  test("deve exibir preview dos campos detectados após upload", async ({ page }) => {
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: /adicionar vaga/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    const analiseFile = path.join(__dirname, "fixtures/analise-exemplo.md")
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(analiseFile)

    // Aguardar indicador de campos detectados aparecer
    await expect(dialog.getByText(/campos detectados automaticamente/i)).toBeVisible({ timeout: 10000 })

    // Aguardar que o campo empresa seja preenchido
    await waitForEmpresaPopulated(page)

    // Verificar que os campos foram preenchidos (o "preview" é o próprio formulário preenchido)
    await expect(dialog.getByLabel(/^empresa/i)).toHaveValue(/Google/i)
    await expect(dialog.getByLabel(/^cargo/i)).toHaveValue(/Engenheiro/i)

    await page.keyboard.press("Escape")
  })
})
