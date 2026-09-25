import { describe, expect, it } from "vitest"
import { accessDecision, isAllowedEmail, isAllowedGoogleProfile, isPublicPath, normalizeEmail } from "@/lib/auth/access"

const ALLOWED = "owner@example.com"

describe("isAllowedEmail", () => {
  it("matches the allowlisted address ignoring case and surrounding spaces", () => {
    expect(isAllowedEmail("owner@example.com", ALLOWED)).toBe(true)
    expect(isAllowedEmail(" Owner@Example.COM ", ALLOWED)).toBe(true)
    expect(isAllowedEmail("owner@example.com", " OWNER@example.com ")).toBe(true)
  })

  it("rejects any other address, including look-alikes", () => {
    expect(isAllowedEmail("other@example.com", ALLOWED)).toBe(false)
    expect(isAllowedEmail("owner@example.com.evil.test", ALLOWED)).toBe(false)
    expect(isAllowedEmail("xowner@example.com", ALLOWED)).toBe(false)
  })

  it("fails closed when the allowlist or the email is missing", () => {
    for (const allowed of [undefined, null, "", "   ", 42]) {
      expect(isAllowedEmail("owner@example.com", allowed)).toBe(false)
      expect(isAllowedEmail("", allowed)).toBe(false)
    }
    expect(isAllowedEmail(undefined, ALLOWED)).toBe(false)
    expect(isAllowedEmail(null, ALLOWED)).toBe(false)
    expect(isAllowedEmail("", ALLOWED)).toBe(false)
  })

  it("normalizes only strings", () => {
    expect(normalizeEmail(" A@B.C ")).toBe("a@b.c")
    expect(normalizeEmail({})).toBeNull()
  })
})

describe("isAllowedGoogleProfile", () => {
  it("requires Google to assert the allowlisted email is verified", () => {
    expect(isAllowedGoogleProfile({ email: ALLOWED, email_verified: true }, ALLOWED)).toBe(true)
    expect(isAllowedGoogleProfile({ email: ALLOWED, email_verified: false }, ALLOWED)).toBe(false)
    expect(isAllowedGoogleProfile({ email: ALLOWED, email_verified: "true" }, ALLOWED)).toBe(false)
    expect(isAllowedGoogleProfile({ email: ALLOWED }, ALLOWED)).toBe(false)
  })

  it("rejects other accounts and missing profiles", () => {
    expect(isAllowedGoogleProfile({ email: "other@example.com", email_verified: true }, ALLOWED)).toBe(false)
    expect(isAllowedGoogleProfile(undefined, ALLOWED)).toBe(false)
    expect(isAllowedGoogleProfile({ email: ALLOWED, email_verified: true }, undefined)).toBe(false)
  })
})

describe("isPublicPath", () => {
  it("exposes only the login page and Auth.js endpoints", () => {
    expect(isPublicPath("/login")).toBe(true)
    expect(isPublicPath("/api/auth")).toBe(true)
    expect(isPublicPath("/api/auth/callback/google")).toBe(true)
    expect(isPublicPath("/")).toBe(false)
    expect(isPublicPath("/login/extra")).toBe(false)
    expect(isPublicPath("/api/authx")).toBe(false)
    expect(isPublicPath("/api/other")).toBe(false)
    expect(isPublicPath("/vaga/1")).toBe(false)
  })
})

describe("accessDecision", () => {
  const decide = (pathname: string, sessionEmail?: string, allowedEmail: string | undefined = ALLOWED) =>
    accessDecision({ pathname, sessionEmail, allowedEmail })

  it("lets the allowlisted session through everywhere", () => {
    expect(decide("/", ALLOWED)).toBe("allow")
    expect(decide("/vaga/job-1", ALLOWED)).toBe("allow")
    expect(decide("/api/anything", ALLOWED)).toBe("allow")
  })

  it("sends anonymous and non-allowlisted page requests to login", () => {
    expect(decide("/")).toBe("login")
    expect(decide("/vaga/job-1", "other@example.com")).toBe("login")
  })

  it("answers 401 on API paths instead of redirecting", () => {
    expect(decide("/api/anything")).toBe("unauthorized")
    expect(decide("/api", "other@example.com")).toBe("unauthorized")
  })

  it("revokes a valid-looking session when ALLOWED_EMAIL is unset or changed", () => {
    expect(accessDecision({ pathname: "/", sessionEmail: ALLOWED, allowedEmail: undefined })).toBe("login")
    expect(decide("/", ALLOWED, "someone-else@example.com")).toBe("login")
  })

  it("keeps login and Auth.js endpoints public", () => {
    expect(decide("/login")).toBe("allow")
    expect(decide("/api/auth/signin/google")).toBe("allow")
  })
})
