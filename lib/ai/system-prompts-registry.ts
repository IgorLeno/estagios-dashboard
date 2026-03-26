import {
  RESUME_SYSTEM_PROMPT,
  SUMMARY_PROMPT_INSTRUCTIONS,
  SKILLS_PROMPT_INSTRUCTIONS,
  PROJECTS_PROMPT_INSTRUCTIONS,
} from "./resume-prompts"
import { buildJobExtractionPrompt, SYSTEM_PROMPT } from "./prompts"
import { ANALYSIS_SYSTEM_PROMPT, buildJobAnalysisPrompt } from "./analysis-prompts"
import { CONSISTENCY_SYSTEM_PROMPT, buildConsistencyPrompt } from "./consistency-agent"
import { buildDossieFromProfile } from "./dossie-builder"
import { EMPTY_CANDIDATE_PROFILE } from "@/lib/types"
import type { CandidateProfile } from "@/lib/types"

export interface SystemPromptEntry {
  id: string
  title: string
  description: string
  sourceFile: string
  content: string
  category: "resume" | "analysis" | "skills" | "parsing"
}

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
        "Instruções de como selecionar e reordenar habilidades por relevância à vaga, usando apenas o perfil do candidato e skills aprovadas pelo usuário.",
      sourceFile: "lib/ai/resume-prompts.ts → SKILLS_PROMPT_INSTRUCTIONS",
      content: SKILLS_PROMPT_INSTRUCTIONS,
      category: "resume",
    },
    {
      id: "job_parser_system",
      title: "Parser de Vagas — System Prompt",
      description:
        "Instrução de sistema para extração de dados estruturados de vagas (campos: empresa, cargo, requisitos, etc.).",
      sourceFile: "lib/ai/prompts.ts → SYSTEM_PROMPT",
      content: SYSTEM_PROMPT,
      category: "parsing",
    },
    {
      id: "job_parser_user",
      title: "Parser de Vagas — User Prompt Template",
      description:
        "Template de prompt de usuário para extração de campos estruturados. Inclui regras de sanitização e formato JSON.",
      sourceFile: "lib/ai/prompts.ts → buildJobExtractionPrompt",
      content: buildJobExtractionPrompt("[DESCRICAO_DA_VAGA]"),
      category: "parsing",
    },
    {
      id: "job_analysis_system",
      title: "Análise de Vaga — System Prompt",
      description:
        "Instrução de sistema para análise qualitativa de vagas: fit, oportunidades, preparação para entrevista.",
      sourceFile: "lib/ai/analysis-prompts.ts → ANALYSIS_SYSTEM_PROMPT",
      content: ANALYSIS_SYSTEM_PROMPT,
      category: "analysis",
    },
    {
      id: "job_analysis_user",
      title: "Análise de Vaga — User Prompt Template",
      description: "Template de prompt de usuário para análise completa de vaga com perfil do candidato.",
      sourceFile: "lib/ai/analysis-prompts.ts → buildJobAnalysisPrompt",
      content: buildJobAnalysisPrompt("[DESCRICAO_DA_VAGA]", "[PERFIL_DO_CANDIDATO]"),
      category: "analysis",
    },
    {
      id: "consistency_system",
      title: "Agente de Consistência — System Prompt",
      description: "System prompt do agente que valida coerência entre seções do CV personalizado.",
      sourceFile: "lib/ai/consistency-agent.ts → CONSISTENCY_SYSTEM_PROMPT",
      content: CONSISTENCY_SYSTEM_PROMPT,
      category: "resume",
    },
    {
      id: "consistency_rules",
      title: "Agente de Consistência — Regras",
      description: "Template de validação com 7 regras de consistência aplicadas ao draft do CV.",
      sourceFile: "lib/ai/consistency-agent.ts → buildConsistencyPrompt",
      content: buildConsistencyPrompt(
        { summary: "[RESUMO]", skills: [], projects: [], certifications: [], language: "pt" },
        "[DESCRICAO_DA_VAGA]"
      ),
      category: "resume",
    },
    {
      id: "dossie_auto_template",
      title: "Dossiê — Template Automático",
      description: "Template usado por buildDossieFromProfile para gerar o dossiê do candidato a partir do perfil.",
      sourceFile: "lib/ai/dossie-builder.ts → buildDossieFromProfile",
      content: buildDossieFromProfile({
        ...EMPTY_CANDIDATE_PROFILE,
        id: "example",
        created_at: "",
        updated_at: "",
        nome: "[NOME]",
        localizacao_pt: "[LOCALIZACAO]",
        educacao: [{ degree_pt: "[CURSO]", institution_pt: "[INSTITUICAO]", period_pt: "[PERIODO]" }],
        habilidades: [{ category_pt: "[CATEGORIA]", items_pt: ["[HABILIDADE_1]", "[HABILIDADE_2]"] }],
        projetos: [{ title_pt: "[PROJETO]", description_pt: ["[DESCRICAO]"] }],
        certificacoes: [
          { title_pt: "[CERTIFICACAO]", institution_pt: "[INSTITUICAO]", year: "[ANO]" },
        ],
        idiomas: [{ language_pt: "[IDIOMA]", proficiency_pt: "[NIVEL]" }],
        objetivo_pt: "[OBJETIVO PROFISSIONAL]",
      } as CandidateProfile),
      category: "analysis",
    },
  ]
}
