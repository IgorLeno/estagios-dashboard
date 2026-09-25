import { test, expect } from "@playwright/test"
import { E2E_AUTH_ENV, signInAs } from "./auth"

test.describe("Autenticação", () => {
  test("redireciona visitante anônimo para o login", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/login\?callbackUrl=/)
    await expect(page.getByTestId("login-google")).toBeVisible()

    await page.goto("/vaga/qualquer")
    await expect(page).toHaveURL(/\/login\?callbackUrl=.*%2Fvaga%2Fqualquer/)
    await expect(page.getByText(/vaga não encontrada/i)).toHaveCount(0)
  })

  test("responde 401 em rotas de API sem sessão", async ({ request }) => {
    const response = await request.get("/api/qualquer", { maxRedirects: 0 })
    expect(response.status()).toBe(401)
    expect(await response.json()).toEqual({ error: "UNAUTHORIZED" })
  })

  test("recusa sessão de email fora da allowlist", async ({ page, context }) => {
    await signInAs(context, "intruso@e2e.test")
    await page.goto("/")
    await expect(page).toHaveURL(/\/login/)
  })

  test("recusa cookie assinado com outro segredo", async ({ page, context }) => {
    await signInAs(context, E2E_AUTH_ENV.ALLOWED_EMAIL, "another-secret-that-the-server-does-not-know-000")
    await page.goto("/")
    await expect(page).toHaveURL(/\/login/)
  })

  test("mostra erro de acesso negado", async ({ page }) => {
    await page.goto("/login?error=AccessDenied")
    await expect(page.getByTestId("login-error")).toHaveText(/não tem acesso/i)
  })

  test("sessão autorizada entra e sai", async ({ page, context }) => {
    await signInAs(context, E2E_AUTH_ENV.ALLOWED_EMAIL)
    await page.goto("/login")
    await expect(page).toHaveURL("/")
    await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible()

    await page.getByTestId("sidebar-sair").click()
    await expect(page).toHaveURL(/\/login/)
    await page.goto("/")
    await expect(page).toHaveURL(/\/login/)
  })
})
