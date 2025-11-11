/**
 * Utilitários para lógica de data com horário customizável
 * O "dia" de inscrição é determinado pelo horário configurado (ex: 6h-5:59)
 */

import type { Configuracao } from "./types"

/**
 * Calcula a data de inscrição considerando o horário de início do "dia"
 * Ex: Se hora_inicio é 06:00 e agora são 03:00, a data é de ontem
 * @param now Data/hora atual
 * @param config Configuração com hora_inicio
 * @returns Data de inscrição no formato YYYY-MM-DD
 */
export function getDataInscricao(now: Date = new Date(), config?: Configuracao): string {
  const horaInicio = config?.hora_inicio || "06:00:00"
  const [hora, minuto] = horaInicio.split(":").map(Number)

  // Cria data de referência com hora de início
  const dataReferencia = new Date(now)
  dataReferencia.setHours(hora, minuto, 0, 0)

  // Se agora é antes da hora de início, o "dia" é de ontem
  let dataInscricao = new Date(now)
  if (now < dataReferencia) {
    dataInscricao.setDate(dataInscricao.getDate() - 1)
  }

  return formatDateToYYYYMMDD(dataInscricao)
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
