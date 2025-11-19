/**
 * Utilities for error detection and handling
 */

/**
 * Detecta se um erro é relacionado a quota/rate limit (429)
 * @param error - Erro a ser verificado
 * @returns true se o erro for de quota/rate limit
 */
export function isQuotaError(error: unknown): boolean {
  // Verifica se é um objeto com status === 429 (numérico ou string)
  if (typeof error === "object" && error !== null && ("status" in error || "statusCode" in error)) {
    const status =
      (error as { status?: unknown; statusCode?: unknown }).status ??
      (error as { statusCode?: unknown }).statusCode ??
      null
    if (Number(status) === 429) {
      return true
    }
  }

  // Verifica se é um Error com mensagem contendo '429' ou 'quota'
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes("429") || message.includes("quota")
  }

  return false
}
