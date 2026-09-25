/**
 * Auth.js session cookie, with the `__Secure-` prefix it gets over https and the `.N`
 * suffix of a chunked token.
 */
const SESSION_SET_COOKIE = /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?=/

// `Headers.getSetCookie()` exists at runtime (Node 20+, Auth.js calls it too) but is
// missing from TypeScript 5.0's DOM lib.
export type HeadersWithSetCookie = Headers & { getSetCookie(): string[] }

/**
 * Removes every `Set-Cookie` for the Auth.js session token, keeping the others.
 *
 * With JWT sessions Auth.js re-signs the token and re-sends the cookie on every `auth()`
 * call (`session.updateAge` only applies to database sessions). Coming from the proxy,
 * that means any response to a request sent with the old cookie (prefetch,
 * `router.refresh()`, a server action) that arrives after "Sair" sets it again.
 */
export function stripSessionSetCookies(headers: Headers): void {
  const kept = (headers as HeadersWithSetCookie).getSetCookie().filter((cookie) => !SESSION_SET_COOKIE.test(cookie))
  headers.delete("set-cookie")
  for (const cookie of kept) headers.append("set-cookie", cookie)
}
