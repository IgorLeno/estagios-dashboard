// __tests__/lib/ai/user-profile.test.ts
import { describe, it, expect } from "vitest"
import { USER_PROFILE } from "@/lib/ai/user-profile"

describe("User Profile", () => {
  it("should have all required fields", () => {
    expect(USER_PROFILE).toHaveProperty("skills")
    expect(USER_PROFILE).toHaveProperty("experience")
    expect(USER_PROFILE).toHaveProperty("education")
    expect(USER_PROFILE).toHaveProperty("goals")
  })

  it("should have non-empty arrays for skills and experience", () => {
    expect(Array.isArray(USER_PROFILE.skills)).toBe(true)
    expect(USER_PROFILE.skills.length).toBeGreaterThan(0)
    expect(Array.isArray(USER_PROFILE.experience)).toBe(true)
    expect(USER_PROFILE.experience.length).toBeGreaterThan(0)
  })

  it("should have non-empty strings for education and goals", () => {
    expect(typeof USER_PROFILE.education).toBe("string")
    expect(USER_PROFILE.education.length).toBeGreaterThan(0)
    expect(typeof USER_PROFILE.goals).toBe("string")
    expect(USER_PROFILE.goals.length).toBeGreaterThan(0)
  })
})
