import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Retorna a cor de fundo da barra de progresso baseada no percentual da meta
 * 0-19%: Vermelho
 * 20-49%: Laranja
 * 50-69%: Amarelo
 * 70-99%: Verde
 * 100%+: Verde com animação pulse
 */
export function getMetaProgressColor(percentage: number): string {
  if (percentage < 20) return "bg-red-500"
  if (percentage < 50) return "bg-orange-500"
  if (percentage < 70) return "bg-yellow-500"
  if (percentage < 100) return "bg-green-500"
  return "bg-green-500 animate-pulse"
}

/**
 * Retorna a cor do texto do percentual baseada no progresso da meta
 * 0-19%: Vermelho
 * 20-49%: Laranja
 * 50-69%: Amarelo
 * 70-99%: Verde
 * 100%+: Verde com fonte negrito
 */
export function getMetaTextColor(percentage: number): string {
  if (percentage < 20) return "text-red-600 dark:text-red-500"
  if (percentage < 50) return "text-orange-600 dark:text-orange-500"
  if (percentage < 70) return "text-yellow-600 dark:text-yellow-500"
  if (percentage < 100) return "text-green-600 dark:text-green-500"
  return "text-green-600 dark:text-green-500 font-bold"
}

/**
 * Retorna classes adicionais para efeitos visuais quando a meta é atingida (100%+)
 */
export function getMetaCompletionEffects(percentage: number): string {
  if (percentage >= 100) {
    return "shadow-lg shadow-green-500/50 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:animate-shimmer"
  }
  return ""
}
