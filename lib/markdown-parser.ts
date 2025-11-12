/**
 * Parser de arquivos .md de análise de vaga
 * Extrai campos estruturados do markdown para preencher automaticamente a vaga
 */

export interface ParsedVagaData {
  empresa?: string
  cargo?: string
  local?: string
  modalidade?: "Presencial" | "Híbrido" | "Remoto"
  requisitos?: number // Score 0-100
  fit?: number // Fit 0-10
  etapa?: string
  status?: "Pendente" | "Avançado" | "Melou" | "Contratado"
  observacoes?: string
}

/**
 * Parse markdown content to extract vaga fields
 * Suporta diversos formatos flexíveis:
 * - **Campo**: valor
 * - Campo: valor
 * - # Campo
 *   valor
 */
export function parseVagaFromMarkdown(markdown: string): ParsedVagaData {
  const parsed: ParsedVagaData = {}

  // Helper: extrair valor de um campo usando regex tolerante
  const extractField = (pattern: RegExp): string | undefined => {
    const match = markdown.match(pattern)
    return match ? match[1].trim() : undefined
  }

  // Helper: extrair número de um campo
  const extractNumber = (pattern: RegExp, min = 0, max = 100): number | undefined => {
    const value = extractField(pattern)
    if (!value) return undefined
    const num = Number.parseInt(value, 10)
    return !Number.isNaN(num) && num >= min && num <= max ? num : undefined
  }

  // Empresa (case insensitive, com/sem negrito, com/sem asteriscos)
  parsed.empresa =
    extractField(/\*?\*?empresa\*?\*?\s*:?\s*(.+)/i) ||
    extractField(/^#\s*empresa\s*\n+\s*(.+)/im) ||
    extractField(/^empresa\s*\n+\s*(.+)/im)

  // Cargo
  parsed.cargo =
    extractField(/\*?\*?cargo\*?\*?\s*:?\s*(.+)/i) ||
    extractField(/\*?\*?vaga\*?\*?\s*:?\s*(.+)/i) ||
    extractField(/^#\s*cargo\s*\n+\s*(.+)/im) ||
    extractField(/^cargo\s*\n+\s*(.+)/im)

  // Local
  parsed.local =
    extractField(/\*?\*?local\*?\*?\s*:?\s*(.+)/i) ||
    extractField(/\*?\*?localiza[çc][ãa]o\*?\*?\s*:?\s*(.+)/i) ||
    extractField(/\*?\*?cidade\*?\*?\s*:?\s*(.+)/i) ||
    extractField(/^#\s*local\s*\n+\s*(.+)/im)

  // Modalidade
  const modalidadeStr = extractField(/\*?\*?modalidade\*?\*?\s*:?\s*(.+)/i)
  if (modalidadeStr) {
    const lower = modalidadeStr.toLowerCase()
    if (lower.includes("presencial") && !lower.includes("remoto") && !lower.includes("h") && !lower.includes("í"))
      parsed.modalidade = "Presencial"
    else if (lower.includes("remoto") && !lower.includes("h") && !lower.includes("í")) parsed.modalidade = "Remoto"
    else if (lower.includes("h") || lower.includes("í")) parsed.modalidade = "Híbrido"
  }

  // Requisitos (score 0-100)
  parsed.requisitos =
    extractNumber(/\*?\*?requisitos?\*?\*?\s*:?\s*(\d+)/i, 0, 100) ||
    extractNumber(/\*?\*?score\*?\*?\s*:?\s*(\d+)/i, 0, 100) ||
    extractNumber(/\*?\*?nota\*?\*?\s*:?\s*(\d+)/i, 0, 100)

  // Fit (0-10)
  parsed.fit =
    extractNumber(/\*?\*?fit\*?\*?\s*:?\s*(\d+)/i, 0, 10) ||
    extractNumber(/\*?\*?adequa[çc][ãa]o\*?\*?\s*:?\s*(\d+)/i, 0, 10)

  // Etapa
  parsed.etapa =
    extractField(/\*?\*?etapa\*?\*?\s*:?\s*(.+)/i) ||
    extractField(/\*?\*?fase\*?\*?\s*:?\s*(.+)/i) ||
    extractField(/\*?\*?est[áa]gio\s+do\s+processo\*?\*?\s*:?\s*(.+)/i)

  // Status
  const statusStr = extractField(/\*?\*?status\*?\*?\s*:?\s*(.+)/i)
  if (statusStr) {
    const lower = statusStr.toLowerCase()
    if (lower.includes("contrat")) parsed.status = "Contratado"
    else if (lower.includes("avan") || lower.includes("progresso") || lower.includes("processo"))
      parsed.status = "Avançado"
    else if (lower.includes("melou") || lower.includes("reprov") || lower.includes("recus")) parsed.status = "Melou"
    else if (lower.includes("pendent") || lower.includes("aguard") || lower.includes("inscri"))
      parsed.status = "Pendente"
  }

  // Observações (busca seção "Observações" ou "Notas")
  const obsMatch =
    markdown.match(/\*?\*?observa[çc][õo]es?\*?\*?\s*:?\s*\n+([\s\S]+?)(?=\n\*?\*?[A-Z]|\n#|$)/i) ||
    markdown.match(/\*?\*?notas?\*?\*?\s*:?\s*\n+([\s\S]+?)(?=\n\*?\*?[A-Z]|\n#|$)/i) ||
    markdown.match(/^#\s*observa[çc][õo]es?\s*\n+([\s\S]+?)(?=\n#|$)/im)

  if (obsMatch) {
    parsed.observacoes = obsMatch[1].trim()
  }

  return parsed
}

/**
 * Valida se o arquivo é markdown
 */
export function isMarkdownFile(filename: string): boolean {
  return /\.md$/i.test(filename)
}

/**
 * Limpa/sanitiza conteúdo markdown
 */
export function sanitizeMarkdown(content: string): string {
  return content
    .replace(/\r\n/g, "\n") // Normalizar line endings
    .replace(/\n{3,}/g, "\n\n") // Remover quebras excessivas
    .trim()
}
