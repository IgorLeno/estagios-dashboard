import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}))

vi.mock("@/lib/ai/config", () => ({
  createGeminiClient: vi.fn(() => ({
    getGenerativeModel: vi.fn(({ model }: { model: string }) => ({
      generateContent: vi.fn(() => mockGenerateContent(model)),
    })),
  })),
  GEMINI_CONFIG: {
    temperature: 0.7,
    maxOutputTokens: 4096,
    topP: 0.9,
    topK: 40,
  },
  MODEL_FALLBACK_CHAIN: ["x-ai/grok-4.1-fast"],
  loadUserAIConfig: vi.fn(async () => ({
    modelo_gemini: "x-ai/grok-4.1-fast",
    temperatura: 0.7,
    max_tokens: 4096,
    top_p: 0.9,
    top_k: 40,
    dossie_prompt: "Perfil de teste",
    analise_prompt: "",
    curriculo_prompt: "",
  })),
  getGenerationConfig: vi.fn((config: { temperatura: number; max_tokens: number; top_p: number }) => ({
    temperature: config.temperatura,
    maxOutputTokens: config.max_tokens,
    topP: config.top_p,
  })),
}))

vi.mock("@/lib/supabase/candidate-profile", () => ({
  getCandidateProfile: vi.fn(async () => ({
    id: "empty",
    nome: "",
    educacao: [],
    habilidades: [],
    projetos: [],
    certificacoes: [],
    idiomas: [],
  })),
}))

import { parseJobWithAnalysis } from "@/lib/ai/job-parser"

function makeAnalysisResponse(tipoVaga: string = "Estágio") {
  return {
    response: {
      text: () =>
        `\`\`\`json
{
  "structured_data": {
    "empresa": "Tech Corp",
    "cargo": "Dev",
    "local": "SP",
    "modalidade": "Remoto",
    "tipo_vaga": "${tipoVaga}",
    "requisitos_obrigatorios": ["React"],
    "requisitos_desejaveis": [],
    "responsabilidades": ["Code"],
    "beneficios": [],
    "salario": null,
    "idioma_vaga": "pt"
  },
  "analise_markdown": "# Análise da Vaga\\n\\n## 🏢 Sobre a Empresa\\nTech Corp\\n\\n## 💡 Oportunidades para se Destacar\\nReact\\n\\n## 🎯 Fit Técnico e Cultural\\nBom match\\n\\n## 🗣️ Preparação para Entrevista\\nPerguntas relevantes"
}
\`\`\``,
      usageMetadata: {
        promptTokenCount: 200,
        candidatesTokenCount: 300,
        totalTokenCount: 500,
      },
    },
  }
}

describe("parseJobWithAnalysis fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("falls back to the default fast model after repeated timeout failures from a manual model", async () => {
    mockGenerateContent.mockImplementation(async (modelName: string) => {
      if (modelName === "xiaomi/mimo-v2-pro") {
        throw new Error("504 Gateway Timeout")
      }

      return makeAnalysisResponse()
    })

    const result = await parseJobWithAnalysis(
      "Vaga longa o suficiente para acionar a análise completa do parser.",
      "user-1",
      90000,
      "xiaomi/mimo-v2-pro"
    )

    expect(result.model).toBe("x-ai/grok-4.1-fast")
    expect(mockGenerateContent.mock.calls.map(([modelName]) => modelName)).toEqual([
      "xiaomi/mimo-v2-pro",
      "xiaomi/mimo-v2-pro",
      "x-ai/grok-4.1-fast",
    ])
  })

  it("normalizes composite tipo_vaga values in the parsed analysis payload", async () => {
    mockGenerateContent.mockResolvedValue(makeAnalysisResponse("Júnior/Estágio"))

    const result = await parseJobWithAnalysis("Descrição longa suficiente para análise completa.")

    expect(result.data.tipo_vaga).toBe("Estágio")
  })
})
