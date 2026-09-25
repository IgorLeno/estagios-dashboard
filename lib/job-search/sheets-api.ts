import { createSign } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import type { RawSnapshot } from "@/lib/job-search/types"
import {
  ALLOWED_TAB,
  ARCHIVE_TAB,
  COVERAGE_TAB,
  DOSSIERS_TAB,
  EVENTS_TAB,
  findMainTab,
} from "@/lib/job-search/sheet-parse"

// Node-only Google Sheets API v4 client for the dashboard's read-only service account.
// Errors carry codes only: never cell values, tokens or key material.

export const READONLY_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly"
const API = "https://sheets.googleapis.com/v4/spreadsheets/"
const DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token"

export class JobSearchSourceError extends Error {
  constructor(public readonly code: string) {
    super(code)
    this.name = "JobSearchSourceError"
  }
}

export interface ServiceAccount {
  client_email: string
  private_key: string
  token_uri: string
}

type Env = Record<string, string | undefined>
type FetchLike = typeof fetch

/**
 * Credentials from `GOOGLE_SA_JSON_B64` (base64 of the key) or `GOOGLE_SA_JSON_PATH`
 * pointing to a file outside the repository.
 */
export function loadServiceAccount(env: Env = process.env, cwd: string = process.cwd()): ServiceAccount {
  let text: string
  if (env.GOOGLE_SA_JSON_B64) {
    text = Buffer.from(env.GOOGLE_SA_JSON_B64, "base64").toString("utf8")
  } else if (env.GOOGLE_SA_JSON_PATH) {
    const resolved = path.resolve(env.GOOGLE_SA_JSON_PATH.replace(/^~(?=\/)/, process.env.HOME ?? "~"))
    const relative = path.relative(path.resolve(cwd), resolved)
    if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
      throw new JobSearchSourceError("CREDENTIALS_INSIDE_REPOSITORY")
    }
    try {
      text = readFileSync(resolved, "utf8")
    } catch {
      throw new JobSearchSourceError("CREDENTIALS_UNREADABLE")
    }
  } else {
    throw new JobSearchSourceError("CREDENTIALS_MISSING")
  }
  let parsed: Partial<ServiceAccount>
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new JobSearchSourceError("CREDENTIALS_INVALID")
  }
  if (!parsed.client_email || !parsed.private_key) throw new JobSearchSourceError("CREDENTIALS_INVALID")
  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key,
    token_uri: parsed.token_uri || DEFAULT_TOKEN_URI,
  }
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url")
}

/** OAuth2 JWT-bearer grant (RFC 7523) signed with the service account key. */
export async function getAccessToken(
  account: ServiceAccount,
  scope: string = READONLY_SCOPE,
  fetchImpl: FetchLike = fetch,
  now: number = Date.now()
): Promise<string> {
  const iat = Math.floor(now / 1000)
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const claims = base64url(
    JSON.stringify({ iss: account.client_email, scope, aud: account.token_uri, iat, exp: iat + 3600 })
  )
  let signature: string
  try {
    signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(account.private_key, "base64url")
  } catch {
    throw new JobSearchSourceError("CREDENTIALS_INVALID")
  }
  const response = await fetchImpl(account.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
    cache: "no-store",
  })
  if (!response.ok) throw new JobSearchSourceError(`TOKEN_HTTP_${response.status}`)
  const body = (await response.json()) as { access_token?: string }
  if (!body.access_token) throw new JobSearchSourceError("TOKEN_MISSING")
  return body.access_token
}

export function quoteTab(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`
}

interface Client {
  spreadsheetId: string
  token: string
  fetchImpl: FetchLike
}

async function get<T>(client: Client, suffix: string, query: URLSearchParams): Promise<T> {
  const url = `${API}${encodeURIComponent(client.spreadsheetId)}${suffix}?${query}`
  const response = await client.fetchImpl(url, {
    headers: { Authorization: `Bearer ${client.token}` },
    cache: "no-store",
  })
  if (!response.ok) throw new JobSearchSourceError(`SHEETS_HTTP_${response.status}`)
  return (await response.json()) as T
}

async function batchGet(client: Client, ranges: string[]): Promise<string[][][]> {
  if (ranges.length === 0) return []
  const query = new URLSearchParams({ majorDimension: "ROWS", valueRenderOption: "FORMATTED_VALUE" })
  for (const range of ranges) query.append("ranges", range)
  const body = await get<{ valueRanges?: { values?: unknown[][] }[] }>(client, "/values:batchGet", query)
  return (body.valueRanges ?? []).map((range) =>
    (range.values ?? []).map((row) => row.map((cell) => String(cell ?? "")))
  )
}

/**
 * Reads the registry tabs the dashboard needs: headers of every tab first (to find the
 * main tab by header, like job-search `find_main_tab`), then the full values of the
 * main, archive, events, coverage, allowed-values and Dossiers tabs that exist.
 */
export async function fetchSheetSnapshot(options: {
  spreadsheetId: string
  token: string
  fetchImpl?: FetchLike
}): Promise<RawSnapshot> {
  const client: Client = { fetchImpl: fetch, ...options }
  const meta = await get<{ sheets?: { properties?: { title?: string } }[] }>(
    client,
    "",
    new URLSearchParams({ fields: "sheets.properties.title" })
  )
  const titles = (meta.sheets ?? []).map((sheet) => sheet.properties?.title ?? "").filter(Boolean)

  const headers = await batchGet(
    client,
    titles.map((title) => `${quoteTab(title)}!1:1`)
  )
  const headerTabs = Object.fromEntries(titles.map((title, i) => [title, headers[i] ?? []]))
  const { tab: mainTab } = findMainTab(headerTabs)

  const wanted = [mainTab, ARCHIVE_TAB, EVENTS_TAB, COVERAGE_TAB, ALLOWED_TAB, DOSSIERS_TAB].filter(
    (title): title is string => title !== null && titles.includes(title)
  )
  const values = await batchGet(client, wanted.map(quoteTab))
  const tabs: RawSnapshot["tabs"] = Object.fromEntries(wanted.map((title, i) => [title, values[i] ?? []]))
  // Keep header-only rows of other candidate tabs so an ambiguous main tab is still reported.
  for (const title of titles) {
    if (!(title in tabs) && !title.startsWith("backup-")) tabs[title] = headerTabs[title]
  }
  return { tabs }
}
