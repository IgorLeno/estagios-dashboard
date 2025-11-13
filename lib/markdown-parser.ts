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
 * Mapeamento de nomes alternativos para campos normalizados
 */
const FIELD_MAPPINGS: Record<string, string> = {
  empresa: "empresa",
  cargo: "cargo",
  vaga: "cargo",
  local: "local",
  localização: "local",
  localizacao: "local",
  cidade: "local",
  cidadeestado: "local",
  modalidade: "modalidade",
  requisitos: "requisitos",
  requisito: "requisitos",
  score: "requisitos",
  fit: "fit",
  adequação: "fit",
  adequacao: "fit",
  combinação: "fit",
  combinacao: "fit",
  etapa: "etapa",
  fase: "etapa",
  status: "status",
  observações: "obs",
  observacoes: "obs",
  observação: "obs",
  observacao: "obs",
  notas: "obs",
  nota: "obs",
}

/**
 * Normaliza nome de campo para comparação
 */
function normalizeFieldName(field: string): string {
  return field
    .toLowerCase()
    .trim()
    .replace(/\*\*/g, "") // Remove negrito
    .replace(/[^\w\sçãõáéíóúâêôà]/gi, "") // Remove caracteres especiais exceto acentos
    .replace(/\s+/g, "") // Remove espaços
}

/**
 * Extrai campos de tabelas Markdown (formato: | Campo | Detalhes |)
 */
function extractFromTable(markdown: string): Record<string, string> {
  const fields: Record<string, string> = {}

  // Processar linha por linha
  const lines = markdown.split("\n")

  for (const line of lines) {
    // Verificar se é uma linha de tabela (começa e termina com |)
    if (!line.trim().startsWith("|") || !line.trim().endsWith("|")) continue

    // Dividir a linha em colunas
    const columns = line
      .split("|")
      .map((col) => col.trim())
      .filter((col) => col.length > 0)

    // Precisa ter exatamente 2 colunas (Campo | Valor)
    if (columns.length !== 2) continue

    const rawField = columns[0]
    const rawValue = columns[1]

    if (rawField.includes("---") || rawValue.includes("---")) continue
    // Ignorar linhas de cabeçalho (match exato, case-insensitive)
    const isHeader = normalizeFieldName(rawField) === "campo" && normalizeFieldName(rawValue).includes("detalhe")
    if (isHeader) continue

    // Limpar valor: remover asteriscos extras e espaços
    const value = rawValue.replace(/\*\*/g, "").trim()

    // Ignorar valores vazios
    if (!value) continue

    // Normalizar nome do campo
    const normalizedField = normalizeFieldName(rawField)

    // Mapear para nome padrão
    const mappedField = FIELD_MAPPINGS[normalizedField]
    if (mappedField) {
      fields[mappedField] = value
    }
  }

  return fields
}

/**
 * Parse markdown content to extract vaga fields
 * Suporta diversos formatos flexíveis:
 * - Tabelas Markdown: | Campo | Detalhes |
 * - **Campo**: valor
 * - Campo: valor
 * - # Campo
 *   valor
 */
export function parseVagaFromMarkdown(markdown: string): ParsedVagaData {
  const parsed: ParsedVagaData = {}

  // Primeiro tenta extrair de tabela
  const tableFields = extractFromTable(markdown)

  // Helper: extrair valor de um campo usando regex tolerante
  const extractField = (pattern: RegExp): string | undefined => {
    const match = markdown.match(pattern)
    if (!match) return undefined

    // Limpar valor: remover pipes e espaços extras
    const value = match[1]
      .trim()
      .replace(/^\|+|\|+$/g, "")
      .trim()

    // Retornar undefined se valor estiver vazio após limpeza
    return value.length > 0 ? value : undefined
  }

  // Helper: extrair número de um campo
  const extractNumber = (pattern: RegExp, min = 0, max = 100): number | undefined => {
    const value = extractField(pattern)
    if (!value) return undefined
    const num = Number.parseInt(value, 10)
    return !Number.isNaN(num) && num >= min && num <= max ? num : undefined
  }

  // Helper: processar modalidade (prioriza Remoto > Híbrido > Presencial quando múltiplas)
  const processModalidade = (value: string): "Presencial" | "Híbrido" | "Remoto" | undefined => {
    // Remove escapes de barra invertida (ex: \| vira |)
    const cleaned = value.replace(/\\/g, "")
    const lower = cleaned.toLowerCase()

    // Se múltiplas opções separadas por | ou /
    if (lower.includes("|") || lower.includes("/")) {
      if (lower.includes("remoto")) return "Remoto"
      if (lower.includes("híbrido") || lower.includes("hibrido")) return "Híbrido"
      if (lower.includes("presencial")) return "Presencial"
    }

    // Caso único
    // Caso único - aplicar prioridade
    if (lower.includes("remoto")) return "Remoto"
    if (lower.includes("híbrido") || lower.includes("hibrido")) return "Híbrido"
    if (lower.includes("presencial")) return "Presencial"

    return undefined
  }

  // Helper: processar status (remove emojis e extrai texto relevante)
  const processStatus = (value: string): "Pendente" | "Avançado" | "Melou" | "Contratado" | undefined => {
    // Remove emojis comuns
    const cleaned = value.replace(/[⏳📝✅❌🔄⏰]/g, "").trim()
    const lower = cleaned.toLowerCase()

    if (lower.includes("contrat")) return "Contratado"
    if (lower.includes("avan") || lower.includes("progresso") || lower.includes("processo")) return "Avançado"
    if (lower.includes("melou") || lower.includes("reprov") || lower.includes("recus")) return "Melou"
    if (lower.includes("pendent") || lower.includes("aguard") || lower.includes("inscri")) return "Pendente"

    return undefined
  }

  // Helper: extrair número de string (para requisitos/fit de tabela)
  const parseNumber = (value: string, min = 0, max = 100): number | undefined => {
    const num = Number.parseInt(value, 10)
    return !Number.isNaN(num) && num >= min && num <= max ? num : undefined
  }

  // Empresa (prioriza tabela, fallback para regex)
  const empresa =
    tableFields.empresa ||
    extractField(/\*?\*?empresa\*?\*?\s*:?\s*(.+)/i) ||
    extractField(/^#\s*empresa\s*\n+\s*(.+)/im) ||
    extractField(/^empresa\s*\n+\s*(.+)/im)
  if (empresa) parsed.empresa = empresa

  // Cargo (prioriza tabela, fallback para regex)
  const cargo =
    tableFields.cargo ||
    extractField(/\*?\*?cargo\*?\*?\s*:?\s*(.+)/i) ||
    extractField(/\*?\*?vaga\*?\*?\s*:?\s*(.+)/i) ||
    extractField(/^#\s*cargo\s*\n+\s*(.+)/im) ||
    extractField(/^cargo\s*\n+\s*(.+)/im)
  if (cargo) parsed.cargo = cargo

  // Local (prioriza tabela, fallback para regex)
  const local =
    tableFields.local ||
    extractField(/\*?\*?local\*?\*?\s*:?\s*(.+)/i) ||
    extractField(/\*?\*?localiza[çc][ãa]o\*?\*?\s*:?\s*(.+)/i) ||
    extractField(/\*?\*?cidade\*?\*?\s*:?\s*(.+)/i) ||
    extractField(/^#\s*local\s*\n+\s*(.+)/im)
  if (local) parsed.local = local

  // Modalidade (prioriza tabela, fallback para regex)
  const modalidadeStr = tableFields.modalidade || extractField(/\*?\*?modalidade\*?\*?\s*:?\s*(.+)/i)
  if (modalidadeStr) {
    const processed = processModalidade(modalidadeStr)
    if (processed) parsed.modalidade = processed
  }

  // Requisitos (score 0-100) - prioriza tabela
  const requisitosStr = tableFields.requisitos
  const requisitos =
    (requisitosStr ? parseNumber(requisitosStr, 0, 100) : undefined) ??
    extractNumber(/\*?\*?requisitos?\*?\*?\s*:?\s*(\d+)/i, 0, 100) ??
    extractNumber(/\*?\*?score\*?\*?\s*:?\s*(\d+)/i, 0, 100) ??
    extractNumber(/\*?\*?nota\*?\*?\s*:?\s*(\d+)/i, 0, 100)
  if (requisitos !== undefined) parsed.requisitos = requisitos

  // Fit (0-10) - prioriza tabela
  const fitStr = tableFields.fit
  const fit =
    (fitStr ? parseNumber(fitStr, 0, 10) : undefined) ??
    extractNumber(/\*?\*?fit\*?\*?\s*:?\s*(\d+)/i, 0, 10) ??
    extractNumber(/\*?\*?adequa[çc][ãa]o\*?\*?\s*:?\s*(\d+)/i, 0, 10)
  if (fit !== undefined) parsed.fit = fit

  // Etapa (prioriza tabela, fallback para regex)
  const etapa =
    tableFields.etapa ||
    extractField(/\*?\*?etapa\*?\*?\s*:?\s*(.+)/i) ||
    extractField(/\*?\*?fase\*?\*?\s*:?\s*(.+)/i) ||
    extractField(/\*?\*?est[áa]gio\s+do\s+processo\*?\*?\s*:?\s*(.+)/i)
  if (etapa) parsed.etapa = etapa

  // Status (prioriza tabela, fallback para regex)
  const statusStr = tableFields.status || extractField(/\*?\*?status\*?\*?\s*:?\s*(.+)/i)
  if (statusStr) {
    const processed = processStatus(statusStr)
    if (processed) parsed.status = processed
  }

  // Observações (prioriza tabela, fallback para seção multilinha)
  const obs = tableFields.obs
  if (obs) {
    parsed.observacoes = obs
  } else {
    const obsMatch =
      markdown.match(/\*?\*?observa[çc][õo]es?\*?\*?\s*:?\s*\n+([\s\S]+?)(?=\n\*?\*?[A-Z]|\n#|$)/i) ||
      markdown.match(/\*?\*?notas?\*?\*?\s*:?\s*\n+([\s\S]+?)(?=\n\*?\*?[A-Z]|\n#|$)/i) ||
      markdown.match(/^#\s*observa[çc][õo]es?\s*\n+([\s\S]+?)(?=\n#|$)/im)

    if (obsMatch) {
      parsed.observacoes = obsMatch[1].trim()
    }
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
