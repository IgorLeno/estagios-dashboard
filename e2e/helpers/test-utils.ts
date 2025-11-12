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
 * Close all open dialogs
 */
export async function closeAllDialogs(page: Page) {
  const dialogs = page.locator('[role="dialog"]')
  const count = await dialogs.count()

  for (let i = 0; i < count; i++) {
    const escapeKey = page.keyboard.press("Escape")
    await Promise.race([escapeKey, page.waitForTimeout(500)])
  }
}

/**
 * Fill form field by label
 */
export async function fillFieldByLabel(page: Page, label: string, value: string) {
  await page.getByLabel(label).fill(value)
}

/**
 * Select option by label
 */
export async function selectOptionByLabel(page: Page, label: string, value: string) {
  await page.getByLabel(label).click()
  await page.getByRole("option", { name: value }).click()
}

/**
 * Wait for table to have specific row count
 */
export async function waitForTableRows(page: Page, minCount: number = 1) {
  await expect(page.locator("table tbody tr")).toHaveCount(minCount, { timeout: 10000 })
}

/**
 * Get table row count
 */
export async function getTableRowCount(page: Page): Promise<number> {
  return await page.locator("table tbody tr").count()
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
