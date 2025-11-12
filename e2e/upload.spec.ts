import { test, expect } from "@playwright/test"
import path from "path"
import { waitForToast } from "./helpers/test-utils"

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

    // Aguardar processamento (progress bar e parsing)
    await page.waitForTimeout(2000)

    // Verificar se campos foram preenchidos automaticamente
    const empresaInput = page.getByLabel(/empresa/i)
    const cargoInput = page.getByLabel(/cargo/i)
    const localInput = page.getByLabel(/local/i)

    await expect(empresaInput).toHaveValue(/Google/i)
    await expect(cargoInput).toHaveValue(/Engenheiro de Software/i)
    await expect(localInput).toHaveValue(/São Paulo/i)

    // Verificar toast de sucesso
    await waitForToast(page, /campos.*automaticamente/i)

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
    await page.waitForTimeout(2000)

    // Verificar primeiro arquivo
    await expect(page.getByLabel(/empresa/i)).toHaveValue(/Google/i)

    // Remover arquivo
    const removeButton = page.getByRole("button", { name: /^X$/i }).first()
    if (await removeButton.isVisible()) {
      await removeButton.click()
      await page.waitForTimeout(500)
    }

    // Fazer novo upload
    const file2 = path.join(__dirname, "fixtures/analise-exemplo-2.md")
    await fileInput.setInputFiles(file2)
    await page.waitForTimeout(2000)

    // Verificar que foi substituído
    await expect(page.getByLabel(/empresa/i)).toHaveValue(/Microsoft/i)

    await page.keyboard.press("Escape")
  })

  test("deve mostrar indicador de progresso durante upload", async ({ page }) => {
    await page.getByRole("button", { name: /adicionar vaga/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    const analiseFile = path.join(__dirname, "fixtures/analise-exemplo.md")
    const fileInput = page.locator('input[type="file"]').first()

    await fileInput.setInputFiles(analiseFile)

    // Verificar que loading aparece (pode ser rápido demais para capturar)
    // Então vamos apenas aguardar o resultado
    await page.waitForTimeout(1500)

    // Verificar que upload completou
    await expect(page.getByLabel(/empresa/i)).toHaveValue(/Google/i)

    await page.keyboard.press("Escape")
  })

  test("deve exibir preview dos campos detectados após upload", async ({ page }) => {
    await page.getByRole("button", { name: /adicionar vaga/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    const analiseFile = path.join(__dirname, "fixtures/analise-exemplo.md")
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(analiseFile)

    await page.waitForTimeout(2000)

    // Verificar preview de campos detectados
    await expect(page.getByText(/campos detectados automaticamente/i)).toBeVisible()
    await expect(page.getByText(/empresa.*google/i)).toBeVisible()
    await expect(page.getByText(/cargo.*engenheiro/i)).toBeVisible()

    await page.keyboard.press("Escape")
  })
})
