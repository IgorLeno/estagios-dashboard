/**
 * Pure access rules for the single-user dashboard. Kept free of Next/Auth.js imports so
 * the allowlist and routing decisions are unit-tested directly.
 *
 * Everything fails closed: an unset or blank `ALLOWED_EMAIL` allows nobody.
 */

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null
  const email = value.trim().toLowerCase()
  return email ? email : null
}

export function isAllowedEmail(email: unknown, allowedEmail: unknown): boolean {
  const allowed = normalizeEmail(allowedEmail)
  const candidate = normalizeEmail(email)
  return allowed !== null && candidate === allowed
}

/**
 * Google sign-in gate: the address must match the allowlist and Google must assert it is
 * verified, so an unverified alias of the same string cannot pass.
 */
export function isAllowedGoogleProfile(profile: unknown, allowedEmail: unknown): boolean {
  if (!profile || typeof profile !== "object") return false
  const { email, email_verified: emailVerified } = profile as Record<string, unknown>
  return emailVerified === true && isAllowedEmail(email, allowedEmail)
}

/** Paths reachable without a session: the login page and Auth.js' own endpoints. */
export function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/api/auth" || pathname.startsWith("/api/auth/")
}

export type AccessDecision = "allow" | "login" | "unauthorized"

/**
 * Decision for every request reaching the proxy. Pages redirect to the login page; API
 * paths get a 401 instead of an HTML redirect. The session email is re-checked on every
 * request, so changing `ALLOWED_EMAIL` revokes existing sessions.
 */
export function accessDecision(params: {
  pathname: string
  sessionEmail: unknown
  allowedEmail: unknown
}): AccessDecision {
  if (isPublicPath(params.pathname)) return "allow"
  if (isAllowedEmail(params.sessionEmail, params.allowedEmail)) return "allow"
  return params.pathname === "/api" || params.pathname.startsWith("/api/") ? "unauthorized" : "login"
}
