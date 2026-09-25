// Every request except Next's build assets and files in `public/` goes through the
// `authorized` callback in `auth.ts` (pages, route handlers and server actions alike).
// Server-side code still checks the session itself: the proxy is not the only gate.
export { auth as proxy } from "@/auth"

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
}
