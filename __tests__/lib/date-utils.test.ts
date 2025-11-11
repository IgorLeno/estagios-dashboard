import { describe, it, expect } from "vitest"
import { getDataInscricao, formatDateToYYYYMMDD, formatDateToDDMMYYYY, isValidTimeFormat, daysBetween } from "@/lib/date-utils"
import type { Configuracao } from "@/lib/types"

describe("date-utils", () => {
  describe("getDataInscricao", () => {
    it("should return current date when after hora_inicio", () => {
      const config: Configuracao = {
        id: "1",
        created_at: "",
        updated_at: "",
        hora_inicio: "06:00:00",
        hora_termino: "05:59:00",
      }

      // 10:00 AM - after 6:00 AM, should be today
      const now = new Date("2025-01-15T10:00:00")
      const result = getDataInscricao(now, config)
      expect(result).toBe("2025-01-15")
    })

    it("should return previous date when before hora_inicio", () => {
      const config: Configuracao = {
        id: "1",
        created_at: "",
        updated_at: "",
        hora_inicio: "06:00:00",
        hora_termino: "05:59:00",
      }

      // 3:00 AM - before 6:00 AM, should be yesterday
      const now = new Date("2025-01-15T03:00:00")
      const result = getDataInscricao(now, config)
      expect(result).toBe("2025-01-14")
    })

    it("should use default hora_inicio (06:00) when no config", () => {
      // 4:00 AM - before default 6:00 AM
      const now = new Date("2025-01-15T04:00:00")
      const result = getDataInscricao(now)
      expect(result).toBe("2025-01-14")
    })

    it("should handle midnight correctly", () => {
      const config: Configuracao = {
        id: "1",
        created_at: "",
        updated_at: "",
        hora_inicio: "06:00:00",
        hora_termino: "05:59:00",
      }

      // Midnight - before 6:00 AM
      const now = new Date("2025-01-15T00:00:00")
      const result = getDataInscricao(now, config)
      expect(result).toBe("2025-01-14")
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
})
