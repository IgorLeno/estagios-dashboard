import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { FitTab } from "@/components/tabs/fit-tab"
import type { JobDetails } from "@/lib/ai/types"

const noop = vi.fn()

const validJobAnalysis: JobDetails = {
  empresa: "Tech Corp",
  cargo: "Dev",
  local: "São Paulo",
  modalidade: "Remoto",
  tipo_vaga: "Estágio",
  requisitos_obrigatorios: ["React"],
  requisitos_desejaveis: [],
  responsabilidades: ["Desenvolver"],
  beneficios: [],
  salario: "Indefinido",
  idioma_vaga: "pt",
  etapa: "Indefinido",
  status: "Pendente",
}

describe("FitTab", () => {
  it("disables profile generation when no job analysis is available", () => {
    render(
      <FitTab
        jobDescription=""
        jobAnalysisData={null}
        language="pt"
        profileText=""
        onProfileTextChange={noop}
        isGeneratingProfile={false}
        onGenerateProfile={noop}
        complements={null}
        onComplementsChange={noop}
        isSelectingComplements={false}
        onSelectComplements={noop}
        onContinueToCurriculo={noop}
      />
    )

    expect(screen.getByText(/análise da vaga necessária/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /gerar perfil/i })).toBeDisabled()
  })

  it("enables profile generation when job analysis is present", () => {
    render(
      <FitTab
        jobDescription=""
        jobAnalysisData={validJobAnalysis}
        language="pt"
        profileText=""
        onProfileTextChange={noop}
        isGeneratingProfile={false}
        onGenerateProfile={noop}
        complements={null}
        onComplementsChange={noop}
        isSelectingComplements={false}
        onSelectComplements={noop}
        onContinueToCurriculo={noop}
      />
    )

    expect(screen.getByRole("button", { name: /gerar perfil/i })).toBeEnabled()
  })
})
