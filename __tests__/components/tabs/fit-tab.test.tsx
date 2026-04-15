import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { FitTab } from "@/components/tabs/fit-tab"
import type { JobDetails } from "@/lib/ai/types"

// Silence sonner toasts in tests
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Minimal stub for RefineResumeDialog so it does not try to render real Radix Portal
vi.mock("@/components/refine-resume-dialog", () => ({
  RefineResumeDialog: () => null,
}))

const noop = vi.fn()

const validJobAnalysis: JobDetails = {
  empresa: "Tech Corp",
  cargo: "Analista de BI",
  local: "São Paulo",
  modalidade: "Remoto",
  tipo_vaga: "Estágio",
  requisitos_obrigatorios: ["SQL", "Power BI"],
  requisitos_desejaveis: [],
  responsabilidades: ["Construir dashboards"],
  beneficios: [],
  salario: "Indefinido",
  idioma_vaga: "pt",
  etapa: "Indefinido",
  status: "Pendente",
}

const BASE_PROPS = {
  vagaId: "00000000-0000-0000-0000-000000000001",
  language: "pt" as const,
  jobAnalysisData: validJobAnalysis,
  currentMarkdown: null,
  onFitGenerated: noop,
  activeModel: "x-ai/grok-4.1-fast",
}

describe("FitTab (simplified)", () => {
  it("renders the section header and description", () => {
    render(<FitTab {...BASE_PROPS} />)

    expect(screen.getByText("Fit para Currículo")).toBeInTheDocument()
    expect(screen.getByText(/adapta o perfil profissional/i)).toBeInTheDocument()
  })

  it("shows 'Gerar Fit' button when no existing fit markdown", () => {
    render(<FitTab {...BASE_PROPS} currentMarkdown={null} />)

    expect(screen.getByRole("button", { name: /gerar fit/i })).toBeInTheDocument()
  })

  it("shows warning alert when jobAnalysisData is null", () => {
    render(<FitTab {...BASE_PROPS} jobAnalysisData={null} />)

    expect(screen.getByText(/análise da vaga necessária/i)).toBeInTheDocument()
  })

  it("disables generate button when jobAnalysisData is null", () => {
    render(<FitTab {...BASE_PROPS} jobAnalysisData={null} />)

    expect(screen.getByRole("button", { name: /gerar fit/i })).toBeDisabled()
  })

  it("enables generate button when jobAnalysisData is provided", () => {
    render(<FitTab {...BASE_PROPS} />)

    expect(screen.getByRole("button", { name: /gerar fit/i })).toBeEnabled()
  })

  it("shows 'Regenerar Fit' when markdown already exists", () => {
    render(<FitTab {...BASE_PROPS} currentMarkdown="# Currículo\n\nConteúdo existente." />)

    expect(screen.getByRole("button", { name: /regenerar fit/i })).toBeInTheDocument()
  })

  it("shows editable markdown area and action buttons when fit exists", () => {
    render(<FitTab {...BASE_PROPS} currentMarkdown="# Currículo\n\nConteúdo." />)

    expect(screen.getByRole("button", { name: /salvar edições/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /refinar/i })).toBeInTheDocument()
  })

  it("shows success alert when fit markdown is present and not generating", () => {
    render(<FitTab {...BASE_PROPS} currentMarkdown="# Currículo\n\nConteúdo." />)

    expect(screen.getByText(/fit gerado/i)).toBeInTheDocument()
  })

  it("'Salvar edições' is disabled when no local changes have been made", () => {
    // When the markdown equals currentMarkdown (no edits yet), save should be disabled
    render(<FitTab {...BASE_PROPS} currentMarkdown="# Conteúdo original." />)

    expect(screen.getByRole("button", { name: /salvar edições/i })).toBeDisabled()
  })
})
