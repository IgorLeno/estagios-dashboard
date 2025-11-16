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
    return "shadow-lg shadow-green-500/50 scale-105 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:animate-shimmer"
  }
  return ""
}

/**
 * Converte qualquer valor para número de forma segura
 * Retorna 0 se o valor for inválido (null, undefined, NaN, string não numérica)
 *
 * @param value - Valor a ser convertido (number, string, null, undefined, etc.)
 * @returns Número válido ou 0
 *
 * @example
 * toSafeNumber(3.5) // 3.5
 * toSafeNumber("3.5") // 3.5
 * toSafeNumber(null) // 0
 * toSafeNumber("abc") // 0
 */
export function toSafeNumber(value: unknown): number {
  if (typeof value === "number") return isNaN(value) ? 0 : value
  if (typeof value === "string") {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

/**
 * Formata um valor numérico como porcentagem de forma segura
 *
 * @param value - Valor numérico (ou string convertível) a ser formatado
 * @param decimals - Número de casas decimais (padrão: 1)
 * @returns String formatada (ex: "75.0")
 *
 * @example
 * formatPercentage(75.5) // "75.5"
 * formatPercentage("75.5", 0) // "76"
 * formatPercentage(null) // "0.0"
 */
export function formatPercentage(value: unknown, decimals: number = 1): string {
  const d = Number(decimals)
  const normalized = Number.isFinite(d) ? Math.floor(d) : 0
  const safeDecimals = Math.max(0, Math.min(100, normalized))
  return toSafeNumber(value).toFixed(safeDecimals)
}

/**
 * Retorna a variante apropriada do Badge baseada no status da vaga
 *
 * @param status - Status da vaga (Pendente, Avançado, Melou, Contratado)
 * @returns Variante do badge para estilização
 *
 * @example
 * getStatusVariant("Pendente") // "secondary"
 * getStatusVariant("Avançado") // "default"
 */
export function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const statusMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    Pendente: "secondary",
    Avançado: "default",
    Melou: "destructive",
    Contratado: "outline",
  }

  return statusMap[status] || "secondary"
}

/**
 * Normaliza valores de fit (requisitos/perfil) para escala 0-5 com incrementos de 0.5
 * Converte automaticamente valores legados (0-100) para nova escala (0-5)
 *
 * @param value - Valor a ser normalizado (pode ser null, undefined, number, string)
 * @returns Número normalizado entre 0-5 com incrementos de 0.5
 *
 * @example
 * normalizeFitValue(4.5) // 4.5 (já está correto)
 * normalizeFitValue(90) // 4.5 (converte de 0-100 para 0-5)
 * normalizeFitValue(100) // 5.0 (converte de 0-100 para 0-5)
 * normalizeFitValue(null) // 0 (valor nulo)
 * normalizeFitValue("3.5") // 3.5 (string convertida)
 */
export function normalizeFitValue(value: number | null | undefined | string): number {
  if (value === null || value === undefined) return 0

  const num = toSafeNumber(value)

  // Se valor está entre 0-100 (formato antigo de porcentagem)
  if (num > 5) {
    // Converte para 0-5 com step 0.5
    return Math.round((num / 100) * 5 * 2) / 2
  }

  // Já está em formato correto (0-5), garantir step de 0.5
  return Math.round(num * 2) / 2
}
