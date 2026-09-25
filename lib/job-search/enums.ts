// Exact domains mirrored from job-search `scripts/sheets_client.py` (ALLOWED_VALUES),
// `scripts/classification.py` and `scripts/dossier.py`. The dashboard never extends
// them: a value outside the domain is surfaced as invalid, never coerced.

export const LEGACY = "NAO_CLASSIFICADO" as const

export const FAMILIA_FUNCAO = [
  "PROCESSOS_ENGENHARIA",
  "PD_MODELAGEM",
  "LABORATORIO_QUALIDADE",
  "DADOS_BI",
  "DATA_SCIENCE_ML",
  "AUTOMACAO",
  "OUTRA",
] as const
export const TIPO_PROGRAMA = ["REGULAR", "TRAINEE", "GRADUATE", "BANCO_TALENTOS", "OUTRO"] as const
export const PROXIMIDADE_EQ = ["DIRETA", "CORRELATA", "CONTEXTUAL", "NENHUMA"] as const
export const SETORES_AMPLIFICADORES = [
  "MINERACAO_MINERAIS",
  "QUIMICA_PETROQUIMICA",
  "PETROLEO_GAS",
  "ENERGIA",
  "ALIMENTOS",
  "PAPEL_CELULOSE",
  "FARMACEUTICA",
  "COSMETICOS_PERFUMARIA",
] as const
export const SETOR = [...SETORES_AMPLIFICADORES, "OUTRO", "NAO_CONFIRMADO"] as const
export const INTEREST_LEVELS = ["BAIXO", "NORMAL", "ALTO", "MUITO_ALTO"] as const
export const INTERESSE = [...INTEREST_LEVELS, "INDEFINIDO"] as const

export const STATUS_ANALISE = ["SELECIONADA", "NÃO PRIORIZADA", "DESCARTADA"] as const
export const STATUS_DISPONIBILIDADE = ["ABERTA", "ENCERRADA", "NÃO CONFIRMADA"] as const
export const STATUS_CANDIDATURA = [
  "NÃO INICIADA",
  "EM PREPARAÇÃO",
  "PRONTA PARA REVISÃO",
  "ENVIADA",
  "ENVIO INCERTO",
  "RETIRADA",
] as const
export const APPLICATION_MODELS = ["ATTACHMENT", "PROFILE_BASED", "HYBRID", "UNKNOWN"] as const
export const EVENTOS = [
  "CLAIMED",
  "DRAFT_POSSIBLE",
  "DRAFT_CONFIRMED",
  "SUBMIT_INTENT",
  "SUBMITTED",
  "SUBMIT_UNCERTAIN",
  "CLOSED",
] as const
export const SUBMIT_MODES = ["REVIEW", "CONFIRM", "AUTO"] as const
export const RESULTADO_COBERTURA = [
  "OK",
  "SEM RESULTADOS RELEVANTES",
  "INDISPONÍVEL",
  "LOGIN NECESSÁRIO",
  "CAPTCHA/BLOQUEIO",
] as const

// Domains that only live inside dossier/1.
export const SENIORITY = ["ENTRADA/JÚNIOR", "COMPATÍVEL", "INTERMEDIÁRIA", "SÊNIOR"] as const
export const REQUIREMENT_TYPES = ["OBRIGATÓRIO", "DESEJÁVEL", "NÃO CLARO"] as const
export const EVIDENCE = ["ADERÊNCIA REAL", "ADERÊNCIA TRANSFERÍVEL", "LACUNA", "NÃO CONFIRMADO"] as const
export const CENTRALITY = ["CENTRAL", "PERIFÉRICA"] as const
export const HINT_SOURCES = ["PORTAL_NOTES", "POSTING", "UNKNOWN"] as const
export const RISK_TYPES = [
  "REQ_TEMPO_EXPERIENCIA",
  "REQ_EXPERIENCIA_PROFISSIONAL",
  "CAPACIDADE_AUSENTE_EXIGIDA",
  "FORMACAO_CONCLUIDA_EXIGIDA",
  "REGISTRO_CREA_CRQ",
  "RESIDENCIA_EXIGIDA",
  "TITULO_ENGENHEIRO",
  "CERTIFICADO_IDIOMA",
] as const
export const RISK_STATUS = ["RESOLVED", "NEEDS_HUMAN"] as const
export const RISK_STAGES = ["ANALISE", "FORMULARIO"] as const
export const STRONG_AMPLIFIERS = ["LOCAL_BH_RMBH", "REMOTO", "SETOR_AMPLIFICADOR", "OPORTUNIDADE_EXCEPCIONAL"] as const
export const WEAK_POSITIVES = ["HIBRIDO", "HORARIO_07_15", "HORARIO_09_17"] as const
export const NEGATIVES = [
  "JORNADA_ACIMA_8H_HABITUAL",
  "FIM_DE_SEMANA_REGULAR",
  "TURNO_NOTURNO",
  "TURNO_ROTATIVO",
  "TURNO_TARDE_NOITE",
  "CAMPO_PREDOMINANTE",
  "LABORATORIO_PREDOMINANTE_SEM_PROCESSO",
  "SETOR_BAIXO_INTERESSE",
] as const
export const JORNADA_CLASSES = [
  "HORARIO_07_15",
  "HORARIO_09_17",
  "OUTRO_HORARIO_ATE_8H",
  "JORNADA_ACIMA_8H_HABITUAL",
  "TURNO_NOTURNO",
  "TURNO_ROTATIVO",
  "TURNO_TARDE_NOITE",
  "NAO_CONFIRMADO",
] as const
export const MODALIDADES = ["PRESENCIAL", "HIBRIDO", "REMOTO", "NAO_CONFIRMADO"] as const
export const ZONES = [
  "BH_RMBH",
  "SP_CAPITAL",
  "CAMPINAS",
  "BAIXADA_PRIORITARIA",
  "BAIXADA",
  "SP_ENTORNO",
  "REMOTO_BR",
  "FORA",
  "NAO_CONFIRMADO",
] as const
export const UNRESOLVED_VARIABLES = [
  "SETOR_EMPRESA",
  "CONTEXTO_DE_APLICACAO",
  "LOCAL_DE_TRABALHO",
  "MODALIDADE",
] as const

// Main-tab enum columns and their domain (classification axes accept the legacy marker).
export const MAIN_ENUM_DOMAINS = {
  familia_funcao: [...FAMILIA_FUNCAO, LEGACY],
  tipo_programa: [...TIPO_PROGRAMA, LEGACY],
  proximidade_eq: [...PROXIMIDADE_EQ, LEGACY],
  setor: [...SETOR, LEGACY],
  interesse: [...INTERESSE, LEGACY],
  application_model: APPLICATION_MODELS,
  status_analise: STATUS_ANALISE,
  status_disponibilidade: STATUS_DISPONIBILIDADE,
  status_candidatura: STATUS_CANDIDATURA,
} as const

export type MainEnumField = keyof typeof MAIN_ENUM_DOMAINS
export type MainEnumValue<F extends MainEnumField> = (typeof MAIN_ENUM_DOMAINS)[F][number]

export type FamiliaFuncao = (typeof FAMILIA_FUNCAO)[number]
export type Setor = (typeof SETOR)[number]
export type Interesse = (typeof INTERESSE)[number]
export type StatusAnalise = (typeof STATUS_ANALISE)[number]
export type StatusDisponibilidade = (typeof STATUS_DISPONIBILIDADE)[number]
export type StatusCandidatura = (typeof STATUS_CANDIDATURA)[number]
export type Evento = (typeof EVENTOS)[number]
export type SubmitMode = (typeof SUBMIT_MODES)[number]
export type ResultadoCobertura = (typeof RESULTADO_COBERTURA)[number]
export type Evidence = (typeof EVIDENCE)[number]
export type Zone = (typeof ZONES)[number]
export type Modalidade = (typeof MODALIDADES)[number]

/** Human-readable PT labels for snake_case tokens; exact domain strings (already PT) pass through. */
export const LABELS: Record<string, string> = {
  NAO_CLASSIFICADO: "Não classificado",
  NAO_CONFIRMADO: "Não confirmado",
  PROCESSOS_ENGENHARIA: "Processos / engenharia",
  PD_MODELAGEM: "P&D / modelagem",
  LABORATORIO_QUALIDADE: "Laboratório / qualidade",
  DADOS_BI: "Dados / BI",
  DATA_SCIENCE_ML: "Data science / ML",
  AUTOMACAO: "Automação",
  OUTRA: "Outra",
  OUTRO: "Outro",
  REGULAR: "Regular",
  TRAINEE: "Trainee",
  GRADUATE: "Graduate",
  BANCO_TALENTOS: "Banco de talentos",
  DIRETA: "Direta",
  CORRELATA: "Correlata",
  CONTEXTUAL: "Contextual",
  NENHUMA: "Nenhuma",
  MINERACAO_MINERAIS: "Mineração / minerais",
  QUIMICA_PETROQUIMICA: "Química / petroquímica",
  PETROLEO_GAS: "Petróleo e gás",
  ENERGIA: "Energia",
  ALIMENTOS: "Alimentos",
  PAPEL_CELULOSE: "Papel e celulose",
  FARMACEUTICA: "Farmacêutica",
  COSMETICOS_PERFUMARIA: "Cosméticos / perfumaria",
  BAIXO: "Baixo",
  NORMAL: "Normal",
  ALTO: "Alto",
  MUITO_ALTO: "Muito alto",
  INDEFINIDO: "Indefinido",
  ATTACHMENT: "Anexo",
  PROFILE_BASED: "Perfil no portal",
  HYBRID: "Híbrido",
  UNKNOWN: "Desconhecido",
  PRESENCIAL: "Presencial",
  HIBRIDO: "Híbrido",
  REMOTO: "Remoto",
  BH_RMBH: "BH / RMBH",
  SP_CAPITAL: "São Paulo (capital)",
  CAMPINAS: "Campinas",
  BAIXADA_PRIORITARIA: "Baixada (prioritária)",
  BAIXADA: "Baixada",
  SP_ENTORNO: "Entorno de SP",
  REMOTO_BR: "Remoto (Brasil)",
  FORA: "Fora da área",
}

export function labelFor(value: string): string {
  return LABELS[value] ?? value
}

export function isInDomain<T extends string>(domain: readonly T[], value: string): value is T {
  return (domain as readonly string[]).includes(value)
}
