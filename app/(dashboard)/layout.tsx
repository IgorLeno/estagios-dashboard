import type React from "react"
import { requireAllowedSession } from "@/lib/auth/session"

// Every dashboard page lives in this group, so the session is checked server-side even if
// a request ever bypassed `proxy.ts`.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAllowedSession()
  return children
}
