import { beforeEach, describe, expect, it } from "vitest"
import {
  clearModelAttemptHistory,
  getModelFailureWarning,
  recordModelFailure,
  recordModelSuccess,
} from "@/lib/model-attempt-tracker"

describe("model-attempt-tracker", () => {
  beforeEach(() => {
    clearModelAttemptHistory()
  })

  it("warns after three consecutive failures for the same model", () => {
    recordModelFailure("xiaomi/mimo-v2-pro", "generate-profile")
    recordModelFailure("xiaomi/mimo-v2-pro", "select-complements")
    recordModelFailure("xiaomi/mimo-v2-pro", "extract-profile")

    expect(getModelFailureWarning("xiaomi/mimo-v2-pro")).toEqual({
      consecutiveFailures: 3,
      threshold: 3,
    })
  })

  it("clears the warning after a successful attempt", () => {
    recordModelFailure("xiaomi/mimo-v2-pro", "generate-profile")
    recordModelFailure("xiaomi/mimo-v2-pro", "select-complements")
    recordModelFailure("xiaomi/mimo-v2-pro", "extract-profile")
    recordModelSuccess("xiaomi/mimo-v2-pro", "generate-profile")

    expect(getModelFailureWarning("xiaomi/mimo-v2-pro")).toBeNull()
  })
})
