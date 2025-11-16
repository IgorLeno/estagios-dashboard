"use client"

import { Star, StarHalf } from "lucide-react"
import { cn, toSafeNumber } from "@/lib/utils"

interface StarRatingProps {
  value: number // 0 to 5 with 0.5 increments
  onChange?: (value: number) => void
  readonly?: boolean
  size?: "sm" | "md" | "lg"
}

export function StarRating({ value, onChange: _onChange, readonly: _readonly = true, size = "md" }: StarRatingProps) {
  // Garantir que value seja sempre um número válido
  const safeValue = toSafeNumber(value)
  const fullStars = Math.floor(safeValue)
  const hasHalfStar = (safeValue % 1) >= 0.5

  // Tamanhos dos ícones (garantir que não sejam cortados)
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }

  const iconSize = sizeClasses[size]

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => {
        const isFull = i < fullStars
        const isHalf = i === fullStars && hasHalfStar

        return (
          <span key={i} className="flex-shrink-0">
            {" "}
            {/* Previne corte */}
            {isFull ? (
              <Star className={cn(iconSize, "fill-yellow-400 text-yellow-400")} />
            ) : isHalf ? (
              <StarHalf className={cn(iconSize, "fill-yellow-400 text-yellow-400")} />
            ) : (
              <Star className={cn(iconSize, "text-gray-300")} />
            )}
          </span>
        )
      })}
    </div>
  )
}
