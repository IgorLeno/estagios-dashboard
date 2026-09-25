import type { NextFetchEvent, NextRequest } from "next/server"
import { auth } from "@/auth"
import { stripSessionSetCookies } from "@/lib/auth/session-cookie"

// Auth.js' inline middleware form (`export { auth as proxy }`); its typings only expose
// the wrapper form, which would run a handler even when `authorized` returns false.
const authorize = auth as unknown as (request: NextRequest, event: NextFetchEvent) => Promise<Response>

// Every request except Next's build assets and files in `public/` goes through the
// `authorized` callback in `auth.ts` (pages, route handlers and server actions alike).
// Server-side code still checks the session itself: the proxy is not the only gate.
//
// The proxy only reads the session: it never writes the session cookie, so a response
// that lands after "Sair" cannot bring the session back. The cookie is written only by
// sign-in and sign-out, and a session lasts `maxAge` from sign-in (no sliding renewal).
export async function proxy(request: NextRequest, event: NextFetchEvent): Promise<Response> {
  const response = await authorize(request, event)
  stripSessionSetCookies(response.headers)
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
}
