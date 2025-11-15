import { Page, expect } from "@playwright/test"

/**
 * Helper functions for E2E tests
 */

/**
 * Wait for toast message to appear
 */
export async function waitForToast(page: Page, message: string | RegExp) {
  await expect(page.getByRole("status").filter({ hasText: message })).toBeVisible({ timeout: 5000 })
}

/**
 * Wait for empresa field to be populated after file upload processing
 * Aguarda que o campo empresa seja preenchido, indicando que o processamento foi concluído
 */
export async function waitForEmpresaPopulated(page: Page) {
  // Aguarda que o campo empresa dentro do dialog tenha um valor não vazio
  // Usa waitForFunction para verificar o valor diretamente no contexto do navegador
  await page.waitForFunction(
    () => {
      // Busca todos os inputs dentro do dialog
      const dialog = document.querySelector('[role="dialog"]')
      if (!dialog) return false

      const inputs = Array.from(dialog.querySelectorAll("input, textarea"))
      for (const input of inputs) {
        const htmlInput = input as HTMLInputElement | HTMLTextAreaElement
        // Verifica se o input está associado a um label com "empresa"
        const label =
          htmlInput.labels?.[0] ||
          (htmlInput.id ? (document.querySelector(`label[for="${htmlInput.id}"]`) as HTMLLabelElement | null) : null)
        if (label && label.textContent && /empresa/i.test(label.textContent)) {
          return htmlInput.value.trim().length > 0
        }
      }
      return false
    },
    { timeout: 10000 }
  )
}

/**
 * Aguarda o processamento completo de upload de arquivo
 * Espera pelo toast de sucesso e pelo preenchimento do campo empresa
 */
export async function waitForFileProcessing(page: Page) {
  await waitForToast(page, /campos.*automaticamente/i)
  await waitForEmpresaPopulated(page)
}

/**
 * Close all open dialogs
 * Verifica que cada diálogo foi realmente fechado antes de prosseguir
 */
export async function closeAllDialogs(page: Page) {
  const dialogs = page.locator('[role="dialog"]')
  const maxRetriesPerDialog = 3
  const verificationTimeout = 2000
  const maxTotalAttempts = 10
  let totalAttempts = 0

  while ((await dialogs.count()) > 0 && totalAttempts < maxTotalAttempts) {
    totalAttempts++
    const countBefore = await dialogs.count()
    let dialogClosed = false
    let retries = 0

    // Tenta fechar um diálogo com retries
    while (!dialogClosed && retries < maxRetriesPerDialog) {
      // Pressiona Escape para fechar o diálogo
      await page.keyboard.press("Escape")

      // Aguarda verificação de que um diálogo foi fechado
      try {
        // Espera que o count diminua ou que um diálogo seja removido do DOM
        await Promise.race([
          // Opção 1: Verifica que o count diminuiu usando waitForFunction
          page.waitForFunction(
            (expectedCount) => {
              const dialogs = document.querySelectorAll('[role="dialog"]')
              return dialogs.length < expectedCount
            },
            countBefore,
            { timeout: verificationTimeout }
          ),
          // Opção 2: Espera que o primeiro diálogo seja removido do DOM
          dialogs.first().waitFor({ state: "detached", timeout: verificationTimeout }),
        ])
        dialogClosed = true
      } catch (error) {
        // Se a verificação falhou, tenta novamente
        retries++
      }
    }

    // Se não conseguiu fechar após todas as tentativas, lança erro
    if (!dialogClosed) {
      const remainingCount = await dialogs.count()
      throw new Error(
        `Falha ao fechar diálogo. ${remainingCount} diálogo(s) ainda aberto(s) após ${maxRetriesPerDialog} tentativas.`
      )
    }
  }

  // Check if we exited due to max attempts
  const remainingDialogs = await dialogs.count()
  if (remainingDialogs > 0) {
    throw new Error(
      `Falha ao fechar todos os diálogos. ${remainingDialogs} diálogo(s) ainda aberto(s) após ${maxTotalAttempts} tentativas totais.`
    )
  }
}

/**
 * Fill form field by label
 */
export async function fillFieldByLabel(page: Page, label: string, value: string) {
  await page.getByLabel(label).fill(value)
}

/**
 * Wait for expected number of table rows
 */
export async function waitForTableRows(page: Page, expectedCount: number = 1) {
  await expect(page.locator("table tbody tr")).toHaveCount(expectedCount, { timeout: 10000 })
}

/**
 * Get table row count
 */
export async function getTableRowCount(page: Page): Promise<number> {
  return await page.locator("table tbody tr").count()
}

/**
 * Wait for data to finish loading (loading indicator disappears)
 * Aguarda que o indicador de carregamento desapareça
 */
export async function waitForDataLoad(page: Page) {
  // Primeiro, verificar se o loading apareceu (pode aparecer muito rápido)
  // Se não aparecer em 1s, assumir que já carregou
  const loadingIndicator = page.getByText(/carregando/i)
  const isLoadingVisible = await loadingIndicator.isVisible().catch(() => false)

  if (isLoadingVisible) {
    // Se o loading está visível, aguardar que desapareça
    await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 })
  } else {
    // Se não está visível, aguardar um pouco para garantir que a rede estabilizou
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {
      // Ignorar timeout de networkidle, pode não atingir esse estado
    })
  }
}

/**
 * Wait for vaga to appear in table
 * Aguarda que uma vaga específica apareça na tabela após criação/edição
 */
export async function waitForVagaInTable(page: Page, empresaName: string) {
  // Aguardar que o loading desapareça primeiro
  await waitForDataLoad(page)

  // Aguardar que a empresa apareça como célula na tabela (mais específico que getByText)
  // Usar locator de célula da tabela para garantir que está visível na viewport
  const tableCell = page.locator("table tbody td").filter({ hasText: empresaName }).first()
  await expect(tableCell).toBeVisible({ timeout: 15000 })

  // Scroll para garantir que o elemento está na viewport
  await tableCell.scrollIntoViewIfNeeded()
}

/**
 * Clear all filters
 */
export async function clearAllFilters(page: Page) {
  const clearButton = page.getByRole("button", { name: /limpar.*filtros/i })
  if (await clearButton.isVisible()) {
    await clearButton.click()
  }
}

/**
 * Generate unique test name with timestamp
 */
export function generateUniqueTestName(baseName: string): string {
  return `${baseName}-${Date.now()}`
}
