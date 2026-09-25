import { test, expect } from "@playwright/test"
import { E2E_AUTH_ENV, signInAs } from "./auth"

// Smoke coverage for the read-only shell. Data-driven flows arrive with the job-search data layer.
test.describe("Navegação do Dashboard", () => {
  test.beforeEach(async ({ context }) => {
    await signInAs(context, E2E_AUTH_ENV.ALLOWED_EMAIL)
  })

  test("deve navegar entre abas", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("vagas-card-title")).toBeVisible()
    await expect(page.getByText(/nenhuma vaga encontrada/i)).toBeVisible()

    await page.getByTestId("sidebar-resumo").click()
    await expect(page.getByText(/últimos 7 dias/i).first()).toBeVisible()

    await page.getByTestId("sidebar-configuracoes").click()
    await expect(page.getByText("Aparência", { exact: true })).toBeVisible()

    await page.getByTestId("sidebar-vagas").click()
    await expect(page.getByTestId("vagas-card-title")).toBeVisible()
  })

  test("deve abrir aba pela query string", async ({ page }) => {
    await page.goto("/?tab=configuracoes")
    await expect(page.getByText("Aparência", { exact: true })).toBeVisible()
  })

  test("deve mostrar vaga inexistente sem quebrar", async ({ page }) => {
    await page.goto("/vaga/inexistente")
    await expect(page.getByText(/vaga não encontrada/i)).toBeVisible()

    await page.getByRole("button", { name: /voltar/i }).click()
    await expect(page).toHaveURL("/")
  })
})
