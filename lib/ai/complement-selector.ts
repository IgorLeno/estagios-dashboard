import { callGrok, type GrokMessage } from "./grok-client"
import { getCVTemplateForUser } from "./cv-templates"
import { loadUserAIConfig, getGenerationConfig } from "./config"
import { loadUserSkillsBank } from "./skills-bank"
import { buildModelAttemptList, isRetryableModelError, isValidModelId, DEFAULT_MODEL } from "./models"
import { extractJsonFromResponse } from "./job-parser"
import { ComplementSelectionSchema, type ComplementSelection, type JobDetails, type TokenUsage } from "./types"

const MAX_SKILLS_TOTAL = 20
const MAX_PROJECTS = 3
const MAX_CERTIFICATIONS = 4

function buildComplementPrompt(
  profileText: string,
  skills: Array<{ category: string; items: string[] }>,
  bankSkills: Array<{ skill: string; category: string }>,
  projects: Array<{ title: string; description: string[] }>,
  certifications: string[],
  jobDetails: JobDetails,
  language: "pt" | "en"
): string {
  const isPt = language === "pt"

  const skillsJson = JSON.stringify(
    skills.map((s) => ({ category: s.category, items: s.items }))
  )
  const bankJson =
    bankSkills.length > 0
      ? JSON.stringify(bankSkills.map((s) => ({ skill: s.skill, category: s.category })))
      : "[]"
  const projectsJson = JSON.stringify(
    projects.map((p) => ({ title: p.title, summary: p.description[0] || "" }))
  )
  const certsJson = JSON.stringify(certifications)

  const jobContext = [
    `${isPt ? "Cargo" : "Position"}: ${jobDetails.cargo}`,
    `${isPt ? "Empresa" : "Company"}: ${jobDetails.empresa}`,
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
    ? "Selecione os itens mais relevantes do inventário do candidato para a vaga descrita."
    : "Select the most relevant items from the candidate's inventory for the described position."
  }

${isPt ? "PERFIL PROFISSIONAL JÁ REDIGIDO" : "ALREADY-WRITTEN PROFESSIONAL PROFILE"}:
${profileText}

${isPt ? "VAGA" : "JOB"}:
${jobContext}

${isPt ? "INVENTÁRIO DO CANDIDATO" : "CANDIDATE INVENTORY"}:
Skills (CV): ${skillsJson}
Skills (Bank): ${bankJson}
Projects: ${projectsJson}
Certifications: ${certsJson}

${isPt ? "REGRAS" : "RULES"}:
- ${isPt ? `Máximo ${MAX_SKILLS_TOTAL} skills no total (somando todas as categorias)` : `Maximum ${MAX_SKILLS_TOTAL} skills total (across all categories)`}
- ${isPt ? `Máximo ${MAX_PROJECTS} projetos` : `Maximum ${MAX_PROJECTS} projects`}
- ${isPt ? `Máximo ${MAX_CERTIFICATIONS} certificações` : `Maximum ${MAX_CERTIFICATIONS} certifications`}
- ${isPt ? "Cada exclusão DEVE ter uma reason justificada" : "Each exclusion MUST have a justified reason"}
- ${isPt ? "Priorize itens que alinham com requisitos da vaga" : "Prioritize items that align with job requirements"}
- ${isPt ? "Mantenha categorias de skills originais" : "Keep original skill categories"}
- ${isPt ? "selected=true para incluir, selected=false para excluir" : "selected=true to include, selected=false to exclude"}

${isPt ? "FORMATO DE RESPOSTA" : "RESPONSE FORMAT"}: JSON
\`\`\`json
{
  "skills": [{ "category": "...", "items": ["..."], "selected": true }],
  "projects": [{ "title": "...", "selected": true, "reason": "..." }],
  "certifications": [{ "title": "...", "selected": true, "reason": "..." }]
}
\`\`\``
}

export async function selectComplements(
  profileText: string,
  jobDetails: JobDetails,
  language: "pt" | "en",
  model?: string,
  userId?: string
): Promise<{ selection: ComplementSelection; tokenUsage: TokenUsage }> {
  const config = await loadUserAIConfig(userId)
  const genConfig = getGenerationConfig(config)
  const userModel = config.modelo_gemini
  const modelsToTry = buildModelAttemptList([
    model && isValidModelId(model) ? model : undefined,
    userModel && isValidModelId(userModel) ? userModel : undefined,
    DEFAULT_MODEL,
  ])

  const cv = await getCVTemplateForUser(language, userId)
  const skillsBank = await loadUserSkillsBank(userId)

  const certTitles = cv.certifications.map((c) =>
    typeof c === "string" ? c : c.title
  )

  const prompt = buildComplementPrompt(
    profileText,
    cv.skills,
    skillsBank,
    cv.projects,
    certTitles,
    jobDetails,
    language
  )

  const messages: GrokMessage[] = [
    {
      role: "system",
      content:
        "You are a resume optimization assistant. Select the most relevant items from the candidate's inventory for the target position. Respond only with valid JSON.",
    },
    { role: "user", content: prompt },
  ]

  let lastError: Error | null = null

  for (const modelName of modelsToTry) {
    try {
      const response = await callGrok(messages, {
        temperature: genConfig.temperature ?? 0.5,
        max_tokens: 2048,
        model: modelName,
      })

      const parsed = extractJsonFromResponse(response.content)
      const selection = ComplementSelectionSchema.parse(parsed)

      // Enforce hard limits — truncate excess items instead of throwing
      const totalSelectedSkills = selection.skills
        .filter((s) => s.selected)
        .reduce((sum, s) => sum + s.items.length, 0)

      if (totalSelectedSkills > MAX_SKILLS_TOTAL) {
        console.warn(
          `[ComplementSelector] Truncating skills: ${totalSelectedSkills} exceeds limit ${MAX_SKILLS_TOTAL}`
        )
        let remaining = MAX_SKILLS_TOTAL
        for (const skill of selection.skills) {
          if (!skill.selected) continue
          if (remaining <= 0) {
            skill.selected = false
          } else if (skill.items.length > remaining) {
            skill.items = skill.items.slice(0, remaining)
            remaining = 0
          } else {
            remaining -= skill.items.length
          }
        }
      }

      const selectedProjects = selection.projects.filter((p) => p.selected)
      if (selectedProjects.length > MAX_PROJECTS) {
        console.warn(
          `[ComplementSelector] Truncating projects: ${selectedProjects.length} exceeds limit ${MAX_PROJECTS}`
        )
        let kept = 0
        for (const proj of selection.projects) {
          if (!proj.selected) continue
          if (kept >= MAX_PROJECTS) {
            proj.selected = false
          } else {
            kept++
          }
        }
      }

      const selectedCerts = selection.certifications.filter((c) => c.selected)
      if (selectedCerts.length > MAX_CERTIFICATIONS) {
        console.warn(
          `[ComplementSelector] Truncating certifications: ${selectedCerts.length} exceeds limit ${MAX_CERTIFICATIONS}`
        )
        let kept = 0
        for (const cert of selection.certifications) {
          if (!cert.selected) continue
          if (kept >= MAX_CERTIFICATIONS) {
            cert.selected = false
          } else {
            kept++
          }
        }
      }

      return {
        selection,
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
          `[ComplementSelector] Model ${modelName} failed, trying fallback model: ${normalizedError.message}`
        )
        continue
      }

      throw normalizedError
    }
  }

  throw lastError ?? new Error("Complement selection failed")
}
