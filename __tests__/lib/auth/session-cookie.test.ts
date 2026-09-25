import { describe, expect, it } from "vitest"
import { stripSessionSetCookies, type HeadersWithSetCookie } from "@/lib/auth/session-cookie"

function headersWith(cookies: string[]): HeadersWithSetCookie {
  const headers = new Headers({ "content-type": "text/html" }) as HeadersWithSetCookie
  for (const cookie of cookies) headers.append("set-cookie", cookie)
  return headers
}

describe("stripSessionSetCookies", () => {
  it("removes the session token in every form Auth.js writes it", () => {
    const headers = headersWith([
      "authjs.session-token=abc; Path=/; HttpOnly",
      "__Secure-authjs.session-token=abc; Path=/; Secure",
      "authjs.session-token.0=part; Path=/",
      "authjs.session-token.1=part; Path=/",
      "authjs.session-token=; Max-Age=0; Path=/",
    ])
    stripSessionSetCookies(headers)
    expect(headers.getSetCookie()).toEqual([])
  })

  it("keeps other cookies and headers untouched", () => {
    const headers = headersWith([
      "authjs.callback-url=%2F; Path=/",
      "authjs.session-token=abc; Path=/",
      "authjs.csrf-token=xyz; Path=/",
      "my-authjs.session-token=1; Path=/",
    ])
    stripSessionSetCookies(headers)
    expect(headers.getSetCookie()).toEqual([
      "authjs.callback-url=%2F; Path=/",
      "authjs.csrf-token=xyz; Path=/",
      "my-authjs.session-token=1; Path=/",
    ])
    expect(headers.get("content-type")).toBe("text/html")
  })
})
