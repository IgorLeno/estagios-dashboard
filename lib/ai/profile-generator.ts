import { callGrok, type GrokMessage } from "./grok-client"
import { getCVTemplateForUser } from "./cv-templates"
import { loadUserAIConfig, getGenerationConfig } from "./config"
import { buildModelAttemptList, isRetryableModelError, isValidModelId, DEFAULT_MODEL } from "./models"
import { extractJsonFromResponse } from "./job-parser"
import type { JobDetails, TokenUsage } from "./types"

const MAX_PROFILE_CHARS = 530

function trimProfileToCharLimit(text: string, maxChars: number): string {
  const normalized = text.trim().replace(/\s+/g, " ")

  if (normalized.length <= maxChars) {
    return normalized
  }

  const truncated = normalized.slice(0, maxChars)
  const lastSentenceEnd = Math.max(truncated.lastIndexOf("."), truncated.lastIndexOf("!"), truncated.lastIndexOf("?"))

  if (lastSentenceEnd >= Math.floor(maxChars * 0.6)) {
    return truncated.slice(0, lastSentenceEnd + 1).trim()
  }

  const lastWordBoundary = truncated.lastIndexOf(" ")
  const safeText = (lastWordBoundary > 0 ? truncated.slice(0, lastWordBoundary) : truncated).trim()

  return safeText.endsWith(".") || safeText.endsWith("!") || safeText.endsWith("?") ? safeText : `${safeText}.`
}

function buildProfilePrompt(
  candidateSummary: string,
  candidateSkills: string[],
  candidateProjects: string[],
  candidateEducation: string[],
  candidateCertifications: string[],
  jobDetails: JobDetails,
  language: "pt" | "en"
): string {
  const isPt = language === "pt"

  const candidateContext = [
    `${isPt ? "Resumo atual" : "Current summary"}: ${candidateSummary}`,
    `${isPt ? "Competências" : "Skills"}: ${candidateSkills.join(", ")}`,
    `${isPt ? "Projetos" : "Projects"}: ${candidateProjects.join("; ")}`,
    candidateEducation.length > 0
      ? `${isPt ? "Formação" : "Education"}: ${candidateEducation.join("; ")}`
      : "",
    candidateCertifications.length > 0
      ? `${isPt ? "Certificações" : "Certifications"}: ${candidateCertifications.join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n")

  const jobContext = [
    `${isPt ? "Empresa" : "Company"}: ${jobDetails.empresa}`,
    `${isPt ? "Cargo" : "Position"}: ${jobDetails.cargo}`,
    `${isPt ? "Modalidade" : "Mode"}: ${jobDetails.modalidade}`,
    jobDetails.requisitos_obrigatorios.length > 0
      ? `${isPt ? "Requisitos" : "Requirements"}: ${jobDetails.requisitos_obrigatorios.join(", ")}`
      : "",
    jobDetails.responsabilidades.length > 0
      ? `${isPt ? "Responsabilidades" : "Responsibilities"}: ${jobDetails.responsabilidades.slice(0, 8).join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n")

  return `${isPt ? "TAREFA" : "TASK"}: ${isPt
    ? "Gere um resumo profissional de 3-4 frases naturais para o currículo do candidato, personalizado para a vaga descrita."
    : "Generate a 3-4 sentence professional summary for the candidate's resume, tailored to the described position."
  }

${isPt ? "PERFIL DO CANDIDATO" : "CANDIDATE PROFILE"}:
${candidateContext}

${isPt ? "VAGA" : "JOB"}:
${jobContext}

${isPt ? "REGRAS" : "RULES"}:
- ${isPt ? "ZERO fabricação: use apenas fatos do perfil acima" : "ZERO fabrication: only use facts from the profile above"}
- ${isPt ? "Síntese narrativa, NÃO lista de keywords disfarçada de parágrafo" : "Narrative synthesis, NOT a keyword list disguised as a paragraph"}
- ${isPt ? "Tom natural, profissional, sem clichês genéricos" : "Natural, professional tone, no generic clichés"}
- ${isPt
    ? 'NUNCA use primeira pessoa (eu, meu, minha, utilizo, padronizei, "Pronto para"). Use terceira pessoa implícita sem sujeito: "Estudante de... com experiência em...", "Utiliza...", "Desenvolve..."'
    : 'NEVER use first person (I, my, mine). Use implicit third person without subject: "Student of... with experience in...", "Uses...", "Develops..."'}
- ${isPt ? "Conecte competências reais do candidato com necessidades da vaga" : "Connect real candidate competencies with job needs"}
- ${isPt
    ? 'Gere também uma tagline: frase curta de posicionamento (8-15 palavras), em formato de frase natural e fluida, sem clichês, capturando formação + área de atuação + diferencial. NÃO use pipes, barras ou listas de palavras-chave. Ex: "Profissional com base em Engenharia Química e experiência em simulação de processos."'
    : 'Also generate a tagline: a short positioning sentence (8-15 words), written as a natural flowing phrase with no clichés, capturing background + field + differentiator. DO NOT use pipes, separators, or keyword lists. Example: "Professional with a Chemical Engineering background and process simulation expertise."'}
- ${isPt
    ? `O campo profileText deve ter NO MÁXIMO ${MAX_PROFILE_CHARS} caracteres contando espaços`
    : `The profileText field must be AT MOST ${MAX_PROFILE_CHARS} characters including spaces`}
- ${isPt
    ? "Use 3-4 frases curtas e diretas; se passar do limite, reescreva de forma mais enxuta"
    : "Use 3-4 short, direct sentences; if it exceeds the limit, rewrite it more concisely"}
- ${isPt ? 'Idioma do output: Português brasileiro' : 'Output language: English'}

${isPt ? "FORMATO DE RESPOSTA" : "RESPONSE FORMAT"}: JSON
\`\`\`json
{ "profileText": "...", "tagline": "..." }
\`\`\``
}

export async function generateProfile(
  jobDetails: JobDetails,
  language: "pt" | "en",
  model?: string,
  userId?: string
): Promise<{ profileText: string; tagline: string; tokenUsage: TokenUsage; model: string }> {
  const config = await loadUserAIConfig(userId)
  const genConfig = getGenerationConfig(config)
  const userModel = config.modelo_gemini
  const modelsToTry = buildModelAttemptList([
    model && isValidModelId(model) ? model : undefined,
    userModel && isValidModelId(userModel) ? userModel : undefined,
    DEFAULT_MODEL,
  ])

  const cv = await getCVTemplateForUser(language, userId)

  const allSkills = cv.skills.flatMap((g) => g.items)
  const projectTitles = cv.projects.map((p) => `${p.title}: ${p.description[0] || ""}`)
  const educationLines = cv.education.map((e) => `${e.degree} — ${e.institution}`)
  const certTitles = cv.certifications.map((c) =>
    typeof c === "string" ? c : c.title
  )

  const prompt = buildProfilePrompt(
    cv.summary,
    allSkills,
    projectTitles,
    educationLines,
    certTitles,
    jobDetails,
    language
  )

  const messages: GrokMessage[] = [
    {
      role: "system",
      content:
        "You are a professional resume writer. Generate concise, truthful professional summaries. Never fabricate information. Respond only with valid JSON.",
    },
    { role: "user", content: prompt },
  ]

  let lastError: Error | null = null

  for (const modelName of modelsToTry) {
    try {
      const response = await callGrok(messages, {
        temperature: genConfig.temperature ?? 0.7,
        max_tokens: 512,
        model: modelName,
      }, { userId })

      const parsed = extractJsonFromResponse(response.content) as { profileText?: unknown; tagline?: unknown }
      const profileText = parsed.profileText

      if (!profileText || typeof profileText !== "string") {
        throw new Error("LLM response missing profileText field")
      }

      const tagline = typeof parsed.tagline === "string" ? parsed.tagline.trim() : ""

      let finalText = profileText.trim().replace(/\s+/g, " ")

      if (finalText.length > MAX_PROFILE_CHARS) {
        const originalLength = finalText.length
        finalText = trimProfileToCharLimit(finalText, MAX_PROFILE_CHARS)
        console.warn(
          `[ProfileGenerator] Profile truncated from ${originalLength} to ${finalText.length} characters (limit: ${MAX_PROFILE_CHARS})`
        )
      }

      return {
        profileText: finalText,
        tagline,
        model: modelName,
        tokenUsage: {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
      }
    } catch (error: unknown) {
      const normalizedError = error instanceof Error ? error : new Error(String(error))
      lastError = normalizedError

      if (isRetryableModelError(normalizedError) && modelName !== modelsToTry[modelsToTry.length - 1]) {
        console.warn(
          `[ProfileGenerator] Model ${modelName} failed, trying fallback model: ${normalizedError.message}`
        )
        continue
      }

      throw normalizedError
    }
  }

  throw lastError ?? new Error("Profile generation failed")
}
