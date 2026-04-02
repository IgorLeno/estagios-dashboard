import type { CandidateProfile } from "@/lib/types"

export type CoverLetterLanguage = "pt" | "en"

export interface CoverLetterPromptCandidateData {
  nome: string
  email?: string
  telefone?: string
  linkedin?: string
  github?: string
  location?: string
  educationSummary?: string
  experienceSummary?: string
}

export interface CoverLetterPromptJobData {
  empresa: string
  cargo: string
  descricao?: string | null
  requisitosObrigatorios?: string[]
  requisitosDesejaveis?: string[]
  responsabilidades?: string[]
}

interface CoverLetterRenderOptions {
  candidateName: string
  companyName: string
  jobTitle: string
  letterContent: string
  language: CoverLetterLanguage
  location?: string
  generatedAt?: Date
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function stripMarkdownArtifacts(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#+\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\r/g, "")
    .trim()
}

function truncateWords(value: string, maxWords: number): string {
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return words.join(" ")
  return `${words.slice(0, maxWords).join(" ")}...`
}

function excerptText(value: string | null | undefined, maxWords: number): string {
  if (!value) return ""
  return truncateWords(stripMarkdownArtifacts(value), maxWords)
}

function compactList(items: string[] | undefined, maxItems = 8): string {
  if (!items || items.length === 0) return ""
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .join("; ")
}

export function buildCandidateEducationSummary(
  profile: CandidateProfile | null | undefined,
  language: CoverLetterLanguage
): string {
  if (!profile?.educacao?.length) return ""

  return profile.educacao
    .slice(0, 2)
    .map((entry) => {
      const degree = language === "pt" ? entry.degree_pt : entry.degree_en || entry.degree_pt
      const institution = language === "pt" ? entry.institution_pt : entry.institution_en || entry.institution_pt
      const period = language === "pt" ? entry.period_pt : entry.period_en || entry.period_pt
      return [degree, institution, period].filter(Boolean).join(" — ")
    })
    .join(" | ")
}

export function buildCandidateExperienceSummary(
  profile: CandidateProfile | null | undefined,
  language: CoverLetterLanguage,
  profileText?: string | null
): string {
  const normalizedProfileText = excerptText(profileText, 90)
  if (normalizedProfileText) return normalizedProfileText

  if (!profile) return ""

  const objective = language === "pt" ? profile.objetivo_pt : profile.objetivo_en || profile.objetivo_pt
  const projectTitles = profile.projetos
    .slice(0, 3)
    .map((project) => (language === "pt" ? project.title_pt : project.title_en || project.title_pt))
    .filter(Boolean)

  const skills = profile.habilidades
    .slice(0, 3)
    .flatMap((group) => (language === "pt" ? group.items_pt : group.items_en || group.items_pt))
    .filter(Boolean)
    .slice(0, 8)

  return [excerptText(objective, 70), projectTitles.join(", "), skills.join(", ")]
    .filter(Boolean)
    .join(" | ")
}

export function buildCoverLetterPromptPayload(options: {
  candidate: CoverLetterPromptCandidateData
  job: CoverLetterPromptJobData
  resumeContent: string
  language: CoverLetterLanguage
}) {
  const { candidate, job, resumeContent, language } = options
  const normalizedLanguage = language === "pt" ? "português" : "English"
  const greeting = language === "pt" ? "Prezados Recrutadores" : "Dear Hiring Manager"
  const closing = language === "pt" ? "Atenciosamente" : "Sincerely"

  const systemPrompt = `Você é um especialista em recrutamento e redação profissional.
Sua tarefa é gerar uma carta de apresentação profissional e personalizada.

CONTEXTO DO CANDIDATO:
${candidate.nome || "[NOME]"}, ${candidate.educationSummary || "[FORMAÇÃO]"}, ${candidate.experienceSummary || "[EXPERIÊNCIA RESUMIDA]"}

Currículo resumido:
${excerptText(resumeContent, 500) || "[CONTEÚDO DO CURRÍCULO]"}

VAGA:
Empresa: ${job.empresa}
Posição: ${job.cargo}
Requisitos: ${compactList([...(job.requisitosObrigatorios || []), ...(job.requisitosDesejaveis || [])]) || "[REQUISITOS PRINCIPAIS]"}
Descrição resumida: ${excerptText(job.descricao, 160) || compactList(job.responsabilidades, 6) || "[DESCRIÇÃO DA VAGA]"}

INSTRUÇÕES:
1. Gere uma carta de apresentação em ${normalizedLanguage} com 220-300 palavras
2. A carta deve ser profissional, personalizada para a vaga específica
3. Destaque competências do currículo que alinham com requisitos
4. Use tom formal, objetivo e acessível
5. Comece com saudação (${greeting})
6. Termine com fecho profissional (${closing})
7. NÃO inclua o nome completo do candidato no corpo — apenas na assinatura
8. Estruture em 3-4 parágrafos: introdução, alinhamento de competências, interesse, fechamento
9. Priorize um texto que caiba confortavelmente em uma única página A4
10. Retorne apenas o texto final da carta, sem comentários extras, sem markdown e sem cercas de código`

  const userPrompt = [
    `Idioma solicitado: ${language.toUpperCase()}`,
    `Empresa: ${job.empresa}`,
    `Cargo: ${job.cargo}`,
    candidate.location ? `Local do candidato: ${candidate.location}` : "",
    candidate.email ? `Email: ${candidate.email}` : "",
    candidate.telefone ? `Telefone: ${candidate.telefone}` : "",
    candidate.linkedin ? `LinkedIn: ${candidate.linkedin}` : "",
    candidate.github ? `GitHub: ${candidate.github}` : "",
    job.descricao ? `Resumo da vaga: ${excerptText(job.descricao, 180)}` : "",
    job.responsabilidades?.length ? `Responsabilidades: ${compactList(job.responsabilidades, 8)}` : "",
    job.requisitosObrigatorios?.length
      ? `Requisitos obrigatórios: ${compactList(job.requisitosObrigatorios, 8)}`
      : "",
    job.requisitosDesejaveis?.length ? `Requisitos desejáveis: ${compactList(job.requisitosDesejaveis, 8)}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  return {
    systemPrompt,
    userPrompt,
  }
}

export function normalizeCoverLetterText(letter: string): string {
  return stripMarkdownArtifacts(letter)
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function buildLetterParagraphs(letterContent: string): string[] {
  return normalizeCoverLetterText(letterContent)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\n/g, " ").trim())
    .filter(Boolean)
}

function formatLetterDate(language: CoverLetterLanguage, date: Date): string {
  return new Intl.DateTimeFormat(language === "pt" ? "pt-BR" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)
}

export function buildCoverLetterFilename(language: CoverLetterLanguage, date = new Date()): string {
  const dateToken = date.toISOString().slice(0, 10)
  return language === "pt" ? `carta_apresentacao_${dateToken}.pdf` : `cover_letter_${dateToken}.pdf`
}

export function renderCoverLetterHtml(options: CoverLetterRenderOptions): string {
  const generatedAt = options.generatedAt ?? new Date()
  const dateLabel = formatLetterDate(options.language, generatedAt)
  const locationLabel =
    options.location?.trim() ||
    (options.language === "pt" ? "Local do candidato" : "Candidate location")
  const paragraphs = buildLetterParagraphs(options.letterContent)
  const titleLabel = options.language === "pt" ? "Carta de Apresentação" : "Cover Letter"
  const footerLabel = options.language === "pt" ? "Gerado em" : "Generated on"

  const paragraphHtml = paragraphs
    .map((paragraph, index) => {
      const isSignature = paragraph.trim().toLowerCase() === options.candidateName.trim().toLowerCase()
      const className = isSignature
        ? "signature-name"
        : index === paragraphs.length - 2 &&
            /^(atenciosamente|cordialmente|sincerely|best regards|kind regards)/i.test(paragraph)
          ? "signature-closing"
          : "body-paragraph"

      return `<p class="${className}">${escapeHtml(paragraph)}</p>`
    })
    .join("")

  return `<!DOCTYPE html>
<html lang="${options.language}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(titleLabel)}</title>
    <style>
      :root {
        --maryland-navy: #1e3a5f;
        --maryland-surface: #f4f1ea;
        --maryland-line: #d9dde3;
        --maryland-ink: #333333;
        --maryland-accent: #b8860b;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background:
          radial-gradient(circle at top left, rgba(184, 134, 11, 0.08), transparent 28%),
          linear-gradient(180deg, #f7f4ef 0%, #ece8df 100%);
        color: var(--maryland-ink);
        font-family: "Helvetica Neue", Arial, sans-serif;
      }

      .page-shell {
        padding: 32px;
      }

      .sheet {
        width: 794px;
        min-height: 1123px;
        margin: 0 auto;
        background: #ffffff;
        box-shadow: 0 24px 50px rgba(30, 58, 95, 0.12);
        border: 1px solid rgba(30, 58, 95, 0.08);
        position: relative;
        overflow: hidden;
      }

      .sheet::before {
        content: "";
        position: absolute;
        inset: 0 auto 0 0;
        width: 12px;
        background: linear-gradient(180deg, var(--maryland-navy), rgba(30, 58, 95, 0.55));
      }

      .content {
        padding: 38px 46px 40px 58px;
      }

      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 24px;
        margin-bottom: 26px;
      }

      .topbar-title {
        color: var(--maryland-navy);
        font-size: 13px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        font-weight: 700;
      }

      .topbar-meta {
        color: #5f6771;
        font-size: 11px;
      }

      .job-target {
        margin-bottom: 18px;
      }

      .job-target-label {
        margin: 0 0 4px;
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #6b7280;
      }

      .job-target-value {
        margin: 0;
        font-size: 22px;
        line-height: 1.2;
        color: var(--maryland-navy);
        font-weight: 700;
      }

      .job-target-company {
        margin: 6px 0 0;
        color: var(--maryland-accent);
        font-size: 14px;
        font-weight: 600;
      }

      .date-row {
        display: flex;
        justify-content: flex-end;
        color: #4b5563;
        font-size: 13px;
        margin-bottom: 12px;
      }

      .divider {
        height: 1px;
        background: linear-gradient(90deg, rgba(30, 58, 95, 0), var(--maryland-line) 12%, var(--maryland-line) 88%, rgba(30, 58, 95, 0));
        margin-bottom: 20px;
      }

      .letter-body {
        font-family: Georgia, "Times New Roman", serif;
      }

      .body-paragraph,
      .signature-closing,
      .signature-name {
        margin: 0 0 18px;
        font-size: 11.25pt;
        line-height: 1.66;
        white-space: pre-wrap;
      }

      .signature-closing {
        margin-top: 22px;
      }

      .signature-name {
        margin-top: -8px;
        font-size: 13pt;
        color: var(--maryland-navy);
        font-weight: 700;
      }

      .footer {
        margin-top: 24px;
        padding-top: 10px;
        border-top: 1px solid rgba(217, 221, 227, 0.9);
        font-size: 11px;
        color: #6b7280;
        display: flex;
        justify-content: space-between;
        gap: 16px;
      }

      @page {
        size: A4;
        margin: 0;
      }

      @media print {
        html, body {
          width: 210mm;
          height: 297mm;
          background: #ffffff;
        }

        .page-shell {
          padding: 0;
        }

        .sheet {
          width: 210mm;
          min-height: 297mm;
          margin: 0;
          border: none;
          box-shadow: none;
        }

        .content {
          padding: 14mm 12mm 12mm 16mm;
        }

        .topbar {
          margin-bottom: 8mm;
        }

        .job-target {
          margin-bottom: 6mm;
        }

        .date-row {
          margin-bottom: 4mm;
          font-size: 10.5pt;
        }

        .divider {
          margin-bottom: 6mm;
        }

        .body-paragraph,
        .signature-closing,
        .signature-name {
          font-size: 11pt;
          line-height: 1.58;
          margin-bottom: 4.2mm;
        }

        .signature-closing {
          margin-top: 5mm;
        }

        .signature-name {
          font-size: 12.5pt;
          margin-top: -1mm;
        }

        .footer {
          margin-top: 6mm;
          padding-top: 3mm;
          font-size: 9.5pt;
        }
      }
    </style>
  </head>
  <body>
    <div class="page-shell">
      <div class="sheet">
        <div class="content">
          <div class="topbar">
            <div class="topbar-title">${escapeHtml(options.candidateName)} — ${escapeHtml(titleLabel)}</div>
            <div class="topbar-meta">${escapeHtml(footerLabel)} ${escapeHtml(dateLabel)}</div>
          </div>

          <div class="job-target">
            <p class="job-target-label">${options.language === "pt" ? "Posição-alvo" : "Target role"}</p>
            <p class="job-target-value">${escapeHtml(options.jobTitle)}</p>
            <p class="job-target-company">${escapeHtml(options.companyName)}</p>
          </div>

          <div class="date-row">${escapeHtml(`${locationLabel}, ${dateLabel}`)}</div>
          <div class="divider"></div>

          <div class="letter-body">${paragraphHtml}</div>

          <div class="footer">
            <span>${escapeHtml(titleLabel)}</span>
            <span>${escapeHtml(`${footerLabel} ${dateLabel}`)}</span>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`
}
