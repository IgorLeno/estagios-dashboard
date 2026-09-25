"use server"

import { updateTag } from "next/cache"
import { getAllowedSession } from "@/lib/auth/session"
import { JOB_SEARCH_CACHE_TAG } from "@/lib/job-search/source"

/**
 * "Sincronizar": drops the cached Sheet snapshot so the next render reads it again.
 * Server Functions are not covered by `proxy.ts`, so the session is checked here.
 */
export async function syncJobSearch(): Promise<void> {
  if (!(await getAllowedSession())) throw new Error("UNAUTHENTICATED")
  updateTag(JOB_SEARCH_CACHE_TAG)
}
