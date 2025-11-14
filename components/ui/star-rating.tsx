"use client"

import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, type KeyboardEvent } from "react"

interface StarRatingProps {
  value: number // 0 to 5 with 0.5 increments
  onChange?: (value: number) => void
  readonly?: boolean
  size?: "sm" | "md" | "lg"
}

export function StarRating({ value, onChange, readonly = false, size = "md" }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)

  const displayValue = hoverValue !== null ? hoverValue : value

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }

  function handleClick(starIndex: number, isHalf: boolean) {
    if (readonly || !onChange) return
    const newValue = starIndex + (isHalf ? 0.5 : 1)
    onChange(newValue)
  }

  function handleMouseMove(starIndex: number, isHalf: boolean) {
    if (readonly || !onChange) return
    const newValue = starIndex + (isHalf ? 0.5 : 1)
    setHoverValue(newValue)
  }

  function handleMouseLeave() {
    if (readonly || !onChange) return
    setHoverValue(null)
  }

function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (readonly || !onChange) return

  const step = 0.5
  let newValue = value

  switch (event.key) {
    case "ArrowRight":
    case "ArrowUp":
      event.preventDefault()
      newValue = Math.min(5, value + step)
      break
    case "ArrowLeft":
    case "ArrowDown":
      event.preventDefault()
      newValue = Math.max(0, value - step)
      break
    case " ":
    case "Enter":
      event.preventDefault()
      return
    default:
      return
  }

  onChange(newValue)
}

  return (
    <div
      role="slider"
      tabIndex={readonly || !onChange ? undefined : 0}
      aria-label="Star rating"
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={value}
      aria-valuetext={`${value.toFixed(1)} out of 5`}
      aria-readonly={readonly || !onChange ? true : undefined}
      onKeyDown={handleKeyDown}
      onMouseLeave={handleMouseLeave}
      className="flex items-center gap-1"
    >
      {[0, 1, 2, 3, 4].map((starIndex) => {
        const isFull = displayValue >= starIndex + 1
        const isHalf = displayValue >= starIndex + 0.5 && displayValue < starIndex + 1

        return (
          <div key={starIndex} className="relative" style={{ width: "1.25em", height: "1.25em" }} role="presentation">
            {/* Left half (for 0.5 rating) */}
            <div
              className={cn(
                "absolute left-0 top-0 w-1/2 h-full overflow-hidden",
                !readonly && onChange && "cursor-pointer"
              )}
              onClick={() => handleClick(starIndex, true)}
              onMouseMove={() => handleMouseMove(starIndex, true)}
              role="presentation"
              aria-hidden="true"
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  isHalf || isFull ? "fill-amber-400 text-amber-400" : "fill-none text-gray-300"
                )}
              />
            </div>

            {/* Right half (for full rating) */}
            <div
              className={cn(
                "absolute right-0 top-0 w-1/2 h-full overflow-hidden",
                !readonly && onChange && "cursor-pointer"
              )}
              style={{ clipPath: "inset(0 0 0 50%)" }}
              onClick={() => handleClick(starIndex, false)}
              onMouseMove={() => handleMouseMove(starIndex, false)}
              role="presentation"
              aria-hidden="true"
            >
              <Star
                className={cn(sizeClasses[size], isFull ? "fill-amber-400 text-amber-400" : "fill-none text-gray-300")}
                style={{ marginLeft: "-100%" }}
              />
            </div>
          </div>
        )
      })}
      <span className="ml-2 text-sm font-medium text-foreground">{displayValue.toFixed(1)}</span>
    </div>
  )
}
