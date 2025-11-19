/**
 * Utilitários auxiliares para operações AI
 */

/**
 * Erro customizado para timeouts
 */
export class TimeoutError extends Error {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Envolve uma Promise com um timeout configurável
 * Rejeita com TimeoutError se a Promise não resolver dentro do tempo limite
 * 
 * @param promise - Promise a ser envolvida com timeout
 * @param timeoutMs - Tempo limite em milissegundos
 * @param errorMessage - Mensagem de erro customizada (opcional)
 * @returns Promise que rejeita com TimeoutError se exceder o timeout
 * 
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   parseJobWithGemini(jobDescription),
 *   30000,
 *   'Parsing took too long'
 * )
 * ```
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const message = errorMessage || `Operation timed out after ${timeoutMs}ms`
      reject(new TimeoutError(message, timeoutMs))
    }, timeoutMs)

    promise
      .then((result) => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

