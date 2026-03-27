import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CurriculoTab } from "@/components/tabs/curriculo-tab"
import type { JobDetails } from "@/lib/ai/types"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/components/resume-preview-card", () => ({
  ResumePreviewCard: ({ language }: { language: "pt" | "en" }) => <div>Preview {language}</div>,
}))

const validJobAnalysis: JobDetails = {
  empresa: "Tech Corp",
  cargo: "Data Intern",
  local: "Sao Paulo",
  modalidade: "Hibrido",
  tipo_vaga: "Estágio",
  requisitos_obrigatorios: ["SQL"],
  requisitos_desejaveis: ["Python"],
  responsabilidades: ["Criar dashboards"],
  beneficios: ["VR"],
  salario: "Indefinido",
  idioma_vaga: "en",
  etapa: "Indefinido",
  status: "Pendente",
}

describe("CurriculoTab", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: {
            html: "<h1>Resume</h1><p>Generated preview</p>",
          },
        }),
      })
    )
  })

  it("sends tagline when generating EN preview", async () => {
    const user = userEvent.setup()

    render(
      <CurriculoTab
        jobAnalysisData={validJobAnalysis}
        jobDescription="Long enough job description to pass validation and enable EN preview generation in the tab."
        profileText="Perfil em portugues mantido fora do payload EN."
        tagline="Professional with data expertise."
        activeModel="x-ai/grok-4.1-fast"
        modelHistory={["x-ai/grok-4.1-fast"]}
        onModelChange={vi.fn()}
        onModelHistoryChange={vi.fn()}
      />
    )

    await user.click(screen.getByRole("button", { name: /gerar en/i }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    const requestInit = vi.mocked(fetch).mock.calls[0]?.[1]
    const body = JSON.parse(String(requestInit?.body))

    expect(body).toMatchObject({
      language: "en",
      tagline: "Professional with data expertise.",
    })
    expect(body).not.toHaveProperty("profileText")
  })
})
