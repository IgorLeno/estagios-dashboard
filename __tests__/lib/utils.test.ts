import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

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
})
