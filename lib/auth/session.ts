import "server-only"
import type { Session } from "next-auth"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { isAllowedEmail } from "@/lib/auth/access"

/**
 * Server-side session check, independent of `proxy.ts`: Next documents that a proxy
 * matcher alone does not protect Server Components or Server Functions.
 */
export async function getAllowedSession(): Promise<Session | null> {
  const session = await auth()
  return isAllowedEmail(session?.user?.email, process.env.ALLOWED_EMAIL) ? session : null
}

export async function requireAllowedSession(): Promise<Session> {
  const session = await getAllowedSession()
  if (!session) redirect("/login")
  return session
}
