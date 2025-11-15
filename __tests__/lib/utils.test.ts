import { describe, it, expect } from "vitest"
import { cn, getMetaProgressColor, getMetaTextColor, getMetaCompletionEffects } from "@/lib/utils"

describe("utils", () => {
  describe("cn", () => {
    it("should combine class names", () => {
      const result = cn("text-red-500", "bg-blue-500")
      expect(result).toBe("text-red-500 bg-blue-500")
    })

    it("should merge conflicting tailwind classes", () => {
      // tailwind-merge should keep the last conflicting class
      const result = cn("px-2 py-1", "px-4")
      expect(result).toBe("py-1 px-4")
    })

    it("should handle conditional classes", () => {
      const isActive = true
      const isDisabled = false
      const result = cn("base-class", isActive && "active-class", isDisabled && "disabled-class")
      expect(result).toBe("base-class active-class")
    })

    it("should handle array of classes", () => {
      const result = cn(["text-sm", "font-bold"])
      expect(result).toBe("text-sm font-bold")
    })

    it("should handle objects with conditional classes", () => {
      const result = cn({
        "text-red-500": true,
        "text-blue-500": false,
        "bg-white": true,
      })
      expect(result).toBe("text-red-500 bg-white")
    })

    it("should remove falsy values", () => {
      const result = cn("base", null, undefined, false, "active")
      expect(result).toBe("base active")
    })

    it("should handle empty input", () => {
      const result = cn()
      expect(result).toBe("")
    })

    it("should merge multiple conflicting classes", () => {
      // Multiple overlapping utilities should merge correctly
      // p-2 sets all padding, pt-4 and px-6 override specific sides
      const result = cn("p-2", "pt-4", "px-6")
      expect(result).toBe("p-2 pt-4 px-6")
    })

    it("should handle complex real-world case", () => {
      const isError = true
      const isDisabled = false
      const size = "lg"

      const result = cn(
        "px-4 py-2 rounded-md font-medium transition-colors",
        size === "lg" && "px-6 py-3 text-lg",
        isError && "border-red-500 text-red-600",
        isDisabled && "opacity-50 cursor-not-allowed"
      )

      expect(result).toContain("py-3")
      expect(result).toContain("px-6")
      expect(result).toContain("border-red-500")
      expect(result).toContain("text-red-600")
      expect(result).not.toContain("opacity-50")
    })
  })

  describe("getMetaProgressColor", () => {
    it("should return red for 0-19%", () => {
      expect(getMetaProgressColor(0)).toBe("bg-red-500")
      expect(getMetaProgressColor(10)).toBe("bg-red-500")
      expect(getMetaProgressColor(19)).toBe("bg-red-500")
    })

    it("should return orange for 20-49%", () => {
      expect(getMetaProgressColor(20)).toBe("bg-orange-500")
      expect(getMetaProgressColor(35)).toBe("bg-orange-500")
      expect(getMetaProgressColor(49)).toBe("bg-orange-500")
    })

    it("should return yellow for 50-69%", () => {
      expect(getMetaProgressColor(50)).toBe("bg-yellow-500")
      expect(getMetaProgressColor(60)).toBe("bg-yellow-500")
      expect(getMetaProgressColor(69)).toBe("bg-yellow-500")
    })

    it("should return green for 70-99%", () => {
      expect(getMetaProgressColor(70)).toBe("bg-green-500")
      expect(getMetaProgressColor(85)).toBe("bg-green-500")
      expect(getMetaProgressColor(99)).toBe("bg-green-500")
    })

    it("should return green with pulse animation for 100%+", () => {
      expect(getMetaProgressColor(100)).toBe("bg-green-500 animate-pulse")
      expect(getMetaProgressColor(150)).toBe("bg-green-500 animate-pulse")
    })
  })

  describe("getMetaTextColor", () => {
    it("should return red text for 0-19%", () => {
      expect(getMetaTextColor(0)).toBe("text-red-600 dark:text-red-500")
      expect(getMetaTextColor(15)).toBe("text-red-600 dark:text-red-500")
    })

    it("should return orange text for 20-49%", () => {
      expect(getMetaTextColor(20)).toBe("text-orange-600 dark:text-orange-500")
      expect(getMetaTextColor(40)).toBe("text-orange-600 dark:text-orange-500")
    })

    it("should return yellow text for 50-69%", () => {
      expect(getMetaTextColor(50)).toBe("text-yellow-600 dark:text-yellow-500")
      expect(getMetaTextColor(65)).toBe("text-yellow-600 dark:text-yellow-500")
    })

    it("should return green text for 70-99%", () => {
      expect(getMetaTextColor(70)).toBe("text-green-600 dark:text-green-500")
      expect(getMetaTextColor(90)).toBe("text-green-600 dark:text-green-500")
    })

    it("should return bold green text for 100%+", () => {
      expect(getMetaTextColor(100)).toBe("text-green-600 dark:text-green-500 font-bold")
      expect(getMetaTextColor(120)).toBe("text-green-600 dark:text-green-500 font-bold")
    })
  })

  describe("getMetaCompletionEffects", () => {
    it("should return empty string for less than 100%", () => {
      expect(getMetaCompletionEffects(0)).toBe("")
      expect(getMetaCompletionEffects(50)).toBe("")
      expect(getMetaCompletionEffects(99)).toBe("")
    })

    it("should return shadow and scale effects for 100%+", () => {
      const result = getMetaCompletionEffects(100)
      expect(result).toContain("shadow-lg")
      expect(result).toContain("shadow-green-500/50")
      expect(result).toContain("scale-105")
    })

    it("should apply effects for values over 100%", () => {
      const result = getMetaCompletionEffects(150)
      expect(result).toContain("shadow-lg")
      expect(result).toContain("scale-105")
    })
  })
})
