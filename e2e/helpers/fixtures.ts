import { test as base } from "@playwright/test"
import { ensureTestData } from "./seed-data"

/**
 * Extend Playwright test with custom fixtures
 */
export const test = base.extend({
  /**
   * Ensures test data exists before each test
   */
  testData: async ({}, use) => {
    // Setup: ensure test data exists
    const count = await ensureTestData()

    // Provide the count to the test
    await use(count)

    // No teardown - keep data between tests for performance
    // Cleanup can be done manually if needed via cleanupTestData()
  },
})

export { expect } from "@playwright/test"
