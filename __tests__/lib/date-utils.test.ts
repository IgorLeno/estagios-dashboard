import { describe, it, expect } from "vitest"
import {
  getDataInscricao,
  formatDateToYYYYMMDD,
  formatDateToDDMMYYYY,
  isValidTimeFormat,
  daysBetween,
} from "@/lib/date-utils"
import type { Configuracao } from "@/lib/types"

describe("date-utils", () => {
  describe("getDataInscricao", () => {
    it("should return current calendar date regardless of time", () => {
      // Any time returns the calendar date
      const morning = new Date("2025-01-15T03:00:00")
      expect(getDataInscricao(morning)).toBe("2025-01-15")

      const afternoon = new Date("2025-01-15T10:00:00")
      expect(getDataInscricao(afternoon)).toBe("2025-01-15")

      const midnight = new Date("2025-01-15T00:00:00")
      expect(getDataInscricao(midnight)).toBe("2025-01-15")
    })

    it("should use current date when no date provided", () => {
      const result = getDataInscricao()
      // Should be today's date in YYYY-MM-DD format
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it("should ignore deprecated config parameter", () => {
      const config: Configuracao = {
        id: "1",
        created_at: "",
        updated_at: "",
        hora_inicio: "06:00:00",
        hora_termino: "05:59:00",
      }

      const now = new Date("2025-01-15T03:00:00")
      // Config is ignored, returns calendar date
      const result = getDataInscricao(now, config)
      expect(result).toBe("2025-01-15")
    })
  })

  describe("formatDateToYYYYMMDD", () => {
    it("should format date correctly", () => {
      const date = new Date("2025-01-05T12:00:00")
      expect(formatDateToYYYYMMDD(date)).toBe("2025-01-05")
    })

    it("should pad single digits", () => {
      const date = new Date("2025-03-09T12:00:00")
      expect(formatDateToYYYYMMDD(date)).toBe("2025-03-09")
    })
  })

  describe("formatDateToDDMMYYYY", () => {
    it("should format date correctly", () => {
      const date = new Date("2025-01-15T12:00:00")
      expect(formatDateToDDMMYYYY(date)).toBe("15/01/2025")
    })

    it("should pad single digits", () => {
      const date = new Date("2025-03-05T12:00:00")
      expect(formatDateToDDMMYYYY(date)).toBe("05/03/2025")
    })
  })

  describe("isValidTimeFormat", () => {
    it("should validate correct time formats", () => {
      expect(isValidTimeFormat("06:00")).toBe(true)
      expect(isValidTimeFormat("23:59")).toBe(true)
      expect(isValidTimeFormat("00:00")).toBe(true)
      expect(isValidTimeFormat("12:30")).toBe(true)
    })

    it("should reject invalid time formats", () => {
      expect(isValidTimeFormat("24:00")).toBe(false)
      expect(isValidTimeFormat("12:60")).toBe(false)
      expect(isValidTimeFormat("6:00")).toBe(false)
      expect(isValidTimeFormat("06:0")).toBe(false)
      expect(isValidTimeFormat("invalid")).toBe(false)
    })
  })

  describe("daysBetween", () => {
    it("should calculate days between dates", () => {
      const date1 = new Date("2025-01-01")
      const date2 = new Date("2025-01-10")
      expect(daysBetween(date1, date2)).toBe(9)
    })

    it("should return absolute value", () => {
      const date1 = new Date("2025-01-10")
      const date2 = new Date("2025-01-01")
      expect(daysBetween(date1, date2)).toBe(9)
    })

    it("should return 0 for same dates", () => {
      const date1 = new Date("2025-01-01")
      const date2 = new Date("2025-01-01")
      expect(daysBetween(date1, date2)).toBe(0)
    })
  })

  describe("edge cases", () => {
    it("should handle midnight correctly", () => {
      const midnight = new Date("2025-01-15T00:00:00")
      expect(getDataInscricao(midnight)).toBe("2025-01-15")
    })

    it("should handle end of day correctly", () => {
      const endOfDay = new Date("2025-01-15T23:59:59")
      expect(getDataInscricao(endOfDay)).toBe("2025-01-15")
    })

    it("should handle leap year dates", () => {
      const date = new Date("2024-02-29T12:00:00") // Leap year
      expect(formatDateToYYYYMMDD(date)).toBe("2024-02-29")
      expect(formatDateToDDMMYYYY(date)).toBe("29/02/2024")
    })

    it("should handle end of year boundary", () => {
      // Any time on Jan 1st returns Jan 1st (calendar date)
      const newYearMorning = new Date("2025-01-01T03:00:00")
      const result = getDataInscricao(newYearMorning)
      expect(result).toBe("2025-01-01")
    })

    it("should handle last day of year", () => {
      const newYearEve = new Date("2024-12-31T23:59:59")
      expect(getDataInscricao(newYearEve)).toBe("2024-12-31")
    })

    it("should handle invalid time format edge cases", () => {
      expect(isValidTimeFormat("25:00")).toBe(false) // Invalid hour
      expect(isValidTimeFormat("12:61")).toBe(false) // Invalid minute
      expect(isValidTimeFormat("-01:00")).toBe(false) // Negative
      expect(isValidTimeFormat("12:30:00")).toBe(false) // Seconds not supported
      expect(isValidTimeFormat("")).toBe(false) // Empty string
      expect(isValidTimeFormat("  12:30  ")).toBe(false) // Whitespace
    })

    it("should calculate days between with time components", () => {
      // daysBetween uses getTime() which includes time, so < 24h = 0 days
      const date1 = new Date("2025-01-01T23:59:59")
      const date2 = new Date("2025-01-02T00:00:01")
      // These dates are only ~2 seconds apart, so 0 days
      expect(daysBetween(date1, date2)).toBe(0)

      // Test with full day difference
      const date3 = new Date("2025-01-01T00:00:00")
      const date4 = new Date("2025-01-02T00:00:00")
      expect(daysBetween(date3, date4)).toBe(1)
    })

    it("should handle large date differences", () => {
      const date1 = new Date("2025-01-01")
      const date2 = new Date("2026-01-01")
      expect(daysBetween(date1, date2)).toBe(365)
    })
  })
})
