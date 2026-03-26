import { test, expect } from "@playwright/test"

test("check SHOW_TEST_DATA via console log", async ({ page }) => {
  const consoleLogs: string[] = []
  page.on("console", (msg) => {
    consoleLogs.push(msg.text())
  })

  await page.goto("/")
  await page.waitForLoadState("networkidle")
  // Wait for the data to load
  await page.waitForTimeout(2000)

  // Wait for either table or empty message to appear
  try {
    await Promise.race([
      page.locator("table").waitFor({ state: "visible", timeout: 15000 }),
      page.getByText(/nenhuma vaga/i).waitFor({ state: "visible", timeout: 15000 }),
      page.getByText(/carregando/i).waitFor({ state: "hidden", timeout: 15000 }),
    ])
  } catch {
    // continue anyway
  }
  await page.waitForTimeout(1000)

  // Check console for the [Page] log messages
  const pageLogs = consoleLogs.filter((l) => l.includes("[Page]"))
  console.log("Page console logs:", pageLogs)

  // Check the date displayed
  const dateButton = page.locator("button").filter({ hasText: /de 2026/ })
  const dateText = await dateButton.first().textContent()
  console.log("Displayed date:", dateText)

  // Check if table exists
  const tableCount = await page.locator("table").count()
  console.log("Table count:", tableCount)

  // Check if "nenhuma vaga" message exists
  const noVagasMsg = await page.getByText(/nenhuma vaga/i).isVisible()
  console.log("No vagas message visible:", noVagasMsg)

  // Check row count
  const rowCount = await page.locator("table tbody tr").count()
  console.log("Table rows:", rowCount)

  // Check for loading indicator
  const isLoading = await page.getByText(/carregando/i).isVisible().catch(() => false)
  console.log("Loading visible:", isLoading)

  // Get the card content text
  const cardContent = await page.locator("[data-testid='vagas-card-title']").textContent().catch(() => "NOT_FOUND")
  console.log("Card title:", cardContent)

  // Check the full content area
  const mainContent = await page.locator("main").textContent().catch(() => "ERROR")
  console.log("Main contains 'Carregando':", mainContent?.includes("Carregando"))
  console.log("Main contains 'Nenhuma':", mainContent?.includes("Nenhuma"))
  console.log("Main contains 'Empresa':", mainContent?.includes("Empresa"))

  // The test: vagas MUST appear
  expect(rowCount).toBeGreaterThan(0)
})
