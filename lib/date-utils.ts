/**
 * Utilitários para lógica de data
 * O "dia" de inscrição segue o calendário padrão (meia-noite como início)
 */

/**
 * Retorna a data de inscrição (sempre a data atual do calendário)
 * @param now Data/hora atual
 * @returns Data de inscrição no formato YYYY-MM-DD
 */
/** @deprecated The second parameter is ignored and will be removed in the next major. */
export function getDataInscricao(now?: Date, _config?: unknown): string {
  const dt = now ?? new Date()
  return formatDateToYYYYMMDD(dt)
   return formatDateToYYYYMMDD(dt)
 }
}

/**
 * Formata data para YYYY-MM-DD
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Formata data para exibição (DD/MM/YYYY)
 */
export function formatDateToDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Valida se uma string de horário está no formato HH:MM
 */
export function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time)
}

/**
 * Calcula diferença em dias entre duas datas
 */
export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay))
}
