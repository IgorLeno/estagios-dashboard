import type { JobContext } from "./job-context-detector"
import {
  RESUME_SYSTEM_PROMPT,
  SUMMARY_PROMPT_INSTRUCTIONS,
  SKILLS_PROMPT_INSTRUCTIONS,
  PROJECTS_PROMPT_INSTRUCTIONS,
} from "./resume-prompts"
import { SKILLS_EXTRACTION_SYSTEM_PROMPT, getSkillsExtractionPrompt } from "./skills-extractor-prompt"
import { buildJobExtractionPrompt, SYSTEM_PROMPT } from "./prompts"
import { getSummaryContextInstructions, getProjectsContextInstructions } from "./context-specific-instructions"

export interface SystemPromptEntry {
  id: string
  title: string
  description: string
  sourceFile: string
  content: string
  category: "resume" | "analysis" | "skills" | "parsing"
}

const CONTEXTS: JobContext[] = ["laboratory", "data_science", "qhse", "engineering", "general"]

export function getSystemPromptsRegistry(): SystemPromptEntry[] {
  return [
    {
      id: "resume_system",
      title: "Sistema — Gerador de Currículo",
      description:
        "Regras globais aplicadas em todas as gerações de currículo. Define o que a IA pode e não pode fazer.",
      sourceFile: "lib/ai/resume-prompts.ts → RESUME_SYSTEM_PROMPT",
      content: RESUME_SYSTEM_PROMPT,
      category: "resume",
    },
    {
      id: "resume_summary_instructions",
      title: "Currículo — Perfil Profissional",
      description:
        "Instruções de como reescrever o perfil profissional para ATS, incluindo estrutura, terminologia, tom de estágio e regras de localização.",
      sourceFile: "lib/ai/resume-prompts.ts → SUMMARY_PROMPT_INSTRUCTIONS",
      content: SUMMARY_PROMPT_INSTRUCTIONS,
      category: "resume",
    },
    {
      id: "resume_projects_instructions",
      title: "Currículo — Reescrita de Projetos",
      description:
        "Instruções de como reescrever descrições de projetos, incluindo competências transferíveis e proibição de domain injection.",
      sourceFile: "lib/ai/resume-prompts.ts → PROJECTS_PROMPT_INSTRUCTIONS",
      content: PROJECTS_PROMPT_INSTRUCTIONS,
      category: "resume",
    },
    {
      id: "resume_skills_instructions",
      title: "Currículo — Seleção de Habilidades",
      description:
        "Instruções de como selecionar e reordenar habilidades por relevância à vaga, incluindo integração com o Banco de Skills.",
      sourceFile: "lib/ai/resume-prompts.ts → SKILLS_PROMPT_INSTRUCTIONS",
      content: SKILLS_PROMPT_INSTRUCTIONS,
      category: "resume",
    },
    {
      id: "context_instructions_summary",
      title: "Contexto — Perfil (por tipo de vaga)",
      description:
        "Instruções específicas por contexto detectado aplicadas ao perfil profissional, com exemplos por domínio.",
      sourceFile: "lib/ai/context-specific-instructions.ts → getSummaryContextInstructions",
      content: getAllContextInstructions("summary"),
      category: "resume",
    },
    {
      id: "context_instructions_projects",
      title: "Contexto — Projetos (por tipo de vaga)",
      description: "Instruções específicas por contexto aplicadas à reescrita de projetos.",
      sourceFile: "lib/ai/context-specific-instructions.ts → getProjectsContextInstructions",
      content: getAllContextInstructions("projects"),
      category: "resume",
    },
    {
      id: "skills_extractor",
      title: "Extrator de Skills do Perfil",
      description: "Prompt usado ao importar skills do perfil profissional via IA.",
      sourceFile: "lib/ai/skills-extractor-prompt.ts",
      content: getSkillsExtractionPromptContent(),
      category: "skills",
    },
    {
      id: "job_parser",
      title: "Parser de Vagas",
      description:
        "Prompt usado para extrair estrutura de uma descrição de vaga colada, incluindo regras de sanitização e formato JSON.",
      sourceFile: "lib/ai/job-parser.ts → JOB_PARSER_SYSTEM_PROMPT / buildJobExtractionPrompt",
      content: getJobParserPromptContent(),
      category: "parsing",
    },
  ]
}

function getAllContextInstructions(type: "summary" | "projects"): string {
  const fn = type === "summary" ? getSummaryContextInstructions : getProjectsContextInstructions

  return CONTEXTS.map((context) => {
    const title = context.toUpperCase()
    return [
      `=== CONTEXTO: ${title} | PT ===`,
      fn(context, "pt").trim(),
      "",
      `=== CONTEXTO: ${title} | EN ===`,
      fn(context, "en").trim(),
    ].join("\n")
  }).join("\n\n")
}

function getSkillsExtractionPromptContent(): string {
  return [
    "=== SYSTEM PROMPT ===",
    SKILLS_EXTRACTION_SYSTEM_PROMPT,
    "",
    "=== USER PROMPT TEMPLATE ===",
    getSkillsExtractionPrompt("[PERFIL_DO_USUARIO]"),
  ].join("\n")
}

function getJobParserPromptContent(): string {
  return [
    "=== SYSTEM PROMPT ===",
    SYSTEM_PROMPT,
    "",
    "=== USER PROMPT TEMPLATE ===",
    buildJobExtractionPrompt("[DESCRICAO_DA_VAGA]"),
  ].join("\n")
}
