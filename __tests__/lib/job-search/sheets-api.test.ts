// @vitest-environment node
import { createVerify, generateKeyPairSync } from "node:crypto"
import { mkdtempSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, it, vi } from "vitest"
import {
  READONLY_SCOPE,
  fetchSheetSnapshot,
  getAccessToken,
  loadServiceAccount,
  quoteTab,
} from "@/lib/job-search/sheets-api"

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
const account = {
  client_email: "reader@example.iam.gserviceaccount.com",
  private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  token_uri: "https://oauth2.example.invalid/token",
}
const accountJson = JSON.stringify({ type: "service_account", ...account })

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

describe("loadServiceAccount", () => {
  it("reads GOOGLE_SA_JSON_B64", () => {
    const env = { GOOGLE_SA_JSON_B64: Buffer.from(accountJson).toString("base64") }
    expect(loadServiceAccount(env)).toEqual(account)
  })

  it("reads GOOGLE_SA_JSON_PATH outside the repository", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "sa-"))
    const file = path.join(dir, "sa.json")
    writeFileSync(file, accountJson, { mode: 0o600 })
    expect(loadServiceAccount({ GOOGLE_SA_JSON_PATH: file }, "/some/repo").client_email).toBe(account.client_email)
  })

  it("refuses credentials inside the repository and reports missing/invalid ones by code", () => {
    expect(() => loadServiceAccount({ GOOGLE_SA_JSON_PATH: "/repo/secrets/sa.json" }, "/repo")).toThrow(
      "CREDENTIALS_INSIDE_REPOSITORY"
    )
    expect(() => loadServiceAccount({})).toThrow("CREDENTIALS_MISSING")
    expect(() => loadServiceAccount({ GOOGLE_SA_JSON_B64: Buffer.from("{}").toString("base64") })).toThrow(
      "CREDENTIALS_INVALID"
    )
  })
})

describe("getAccessToken", () => {
  it("posts a JWT-bearer assertion signed by the key with the read-only scope", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const assertion = new URLSearchParams(init?.body as URLSearchParams).get("assertion") ?? ""
      const [header, claims, signature] = assertion.split(".")
      const verified = createVerify("RSA-SHA256")
        .update(`${header}.${claims}`)
        .verify(publicKey, signature, "base64url")
      const payload = JSON.parse(Buffer.from(claims, "base64url").toString())
      return json({ access_token: verified ? `ok:${payload.scope}:${payload.iss}` : "bad" })
    })
    const token = await getAccessToken(account, READONLY_SCOPE, fetchImpl as unknown as typeof fetch, 0)
    expect(token).toBe(`ok:${READONLY_SCOPE}:${account.client_email}`)
    expect(fetchImpl.mock.calls[0][0]).toBe(account.token_uri)
  })

  it("fails with a code on HTTP errors", async () => {
    const fetchImpl = vi.fn(async () => json({ error: "invalid_grant" }, 400))
    await expect(getAccessToken(account, READONLY_SCOPE, fetchImpl as unknown as typeof fetch)).rejects.toThrow(
      "TOKEN_HTTP_400"
    )
  })
})

describe("fetchSheetSnapshot", () => {
  const tabs: Record<string, string[][]> = {
    Registro: [
      ["job_id", "status_analise"],
      ["j-1", "SELECIONADA"],
    ],
    "Eventos de Candidatura": [["job_id", "attempt_id", "evento"]],
    "backup-v1": [["job_id", "status_analise"]],
    "Lixo's": [["x"]],
  }

  function fakeSheets() {
    const requests: { method: string; url: URL }[] = []
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      requests.push({ method: init?.method ?? "GET", url })
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer tkn")
      if (url.pathname.endsWith("/values:batchGet")) {
        return json({
          valueRanges: url.searchParams.getAll("ranges").map((range) => {
            const match = /^'((?:[^']|'')*)'(!1:1)?$/.exec(range)
            if (!match) throw new Error(`unexpected range ${range}`)
            const values = tabs[match[1].replace(/''/g, "'")]
            return { values: match[2] ? values.slice(0, 1) : values }
          }),
        })
      }
      return json({ sheets: Object.keys(tabs).map((title) => ({ properties: { title } })) })
    })
    return { fetchImpl, requests }
  }

  it("reads headers first, then only the contract tabs, with GET requests only", async () => {
    const { fetchImpl, requests } = fakeSheets()
    const raw = await fetchSheetSnapshot({
      spreadsheetId: "sheet-id",
      token: "tkn",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(requests.every((request) => request.method === "GET")).toBe(true)
    expect(requests).toHaveLength(3)
    expect(requests[2].url.searchParams.getAll("ranges")).toEqual(["'Registro'", "'Eventos de Candidatura'"])
    expect(raw.tabs["Registro"]).toEqual(tabs["Registro"])
    expect(raw.tabs["Lixo's"]).toEqual([["x"]])
    expect(raw.tabs["backup-v1"]).toBeUndefined()
  })

  it("surfaces HTTP failures as codes", async () => {
    const fetchImpl = vi.fn(async () => json({ error: { message: "secret detail" } }, 403))
    await expect(
      fetchSheetSnapshot({ spreadsheetId: "id", token: "tkn", fetchImpl: fetchImpl as unknown as typeof fetch })
    ).rejects.toThrow(/^SHEETS_HTTP_403$/)
  })

  it("quotes tab names for A1 ranges", () => {
    expect(quoteTab("Lixo's")).toBe("'Lixo''s'")
  })
})
