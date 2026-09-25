import type { BrowserContext } from "@playwright/test"
import { encode } from "next-auth/jwt"

/**
 * E2E runs without Google. The server under test is started with these throwaway values
 * (see `playwright.config.ts`), and tests mint a session cookie with the same secret —
 * exactly what Auth.js issues after a real login. The app has no test bypass: a deploy
 * with its own `AUTH_SECRET` rejects these cookies.
 */
export const E2E_AUTH_ENV = {
  AUTH_SECRET: "e2e-only-secret-never-used-outside-local-tests-0000",
  AUTH_GOOGLE_ID: "e2e-google-client-id",
  AUTH_GOOGLE_SECRET: "e2e-google-client-secret",
  AUTH_TRUST_HOST: "true",
  ALLOWED_EMAIL: "owner@e2e.test",
  JOB_SEARCH_DATA_SOURCE: "fixture",
} as const

// Auth.js uses the cookie name as the JWE salt; no `__Secure-` prefix over plain http.
const SESSION_COOKIE = "authjs.session-token"

export async function sessionCookieValue(email: string, secret: string = E2E_AUTH_ENV.AUTH_SECRET) {
  return encode({ token: { email, name: "E2E", sub: "e2e-user" }, secret, salt: SESSION_COOKIE })
}

export async function signInAs(context: BrowserContext, email: string, secret?: string) {
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: await sessionCookieValue(email, secret),
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ])
}
