import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { AiParserTab } from "@/components/tabs/ai-parser-tab"
import type { FormData } from "@/lib/utils/ai-mapper"

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("AiParserTab", () => {
  const mockFormData: FormData = {
    empresa: "",
    cargo: "",
    local: "",
    modalidade: "Presencial",
    requisitos: "",
    fit: "",
    etapa: "",
    status: "Pendente",
    observacoes: "",
    arquivo_analise_url: "",
    arquivo_cv_url: "",
  }

  const mockSetFormData = vi.fn()
  const mockOnComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it("should render textarea and analyze button", () => {
    render(<AiParserTab formData={mockFormData} setFormData={mockSetFormData} onComplete={mockOnComplete} />)

    expect(screen.getByRole("textbox")).toBeInTheDocument()
    expect(screen.getByText(/analyze with ai/i)).toBeInTheDocument()
  })

  it("should disable button when input < 50 chars", () => {
    render(<AiParserTab formData={mockFormData} setFormData={mockSetFormData} onComplete={mockOnComplete} />)

    const textarea = screen.getByRole("textbox")
    fireEvent.change(textarea, { target: { value: "short" } })

    const button = screen.getByText(/analyze with ai/i)
    expect(button).toBeDisabled()
  })

  it("should enable button when input >= 50 chars", () => {
    render(<AiParserTab formData={mockFormData} setFormData={mockSetFormData} onComplete={mockOnComplete} />)

    const textarea = screen.getByRole("textbox")
    const longText = "a".repeat(50)
    fireEvent.change(textarea, { target: { value: longText } })

    const button = screen.getByText(/analyze with ai/i)
    expect(button).not.toBeDisabled()
  })

  it("should call API on analyze with successful response", async () => {
    vi.useFakeTimers()

    const mockApiResponse = {
      success: true,
      data: {
        empresa: "Google",
        cargo: "Engineer",
        local: "SP",
        modalidade: "Híbrido",
        tipo_vaga: "Júnior",
        requisitos_obrigatorios: [],
        requisitos_desejaveis: [],
        responsabilidades: [],
        beneficios: [],
        salario: null,
        idioma_vaga: "pt",
        requisitos_score: 4.5,
        fit: 3.5,
      },
      metadata: {
        duration: 1000,
        model: "gemini-1.5-flash",
        tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        timestamp: new Date().toISOString(),
      },
    }

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockApiResponse),
      } as Response)
    )

    render(<AiParserTab formData={mockFormData} setFormData={mockSetFormData} onComplete={mockOnComplete} />)

    const textarea = screen.getByRole("textbox")
    const longText = "a".repeat(100)
    fireEvent.change(textarea, { target: { value: longText } })

    const button = screen.getByText(/analyze with ai/i)
    fireEvent.click(button)

    // Let promises settle
    await vi.runAllTimersAsync()

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/ai/parse-job",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    )
    expect(mockSetFormData).toHaveBeenCalled()
    expect(mockOnComplete).toHaveBeenCalled()

    vi.useRealTimers()
  })

  it("should handle 429 rate limit error", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ success: false, error: "Rate limit exceeded" }),
      } as Response)
    )

    render(<AiParserTab formData={mockFormData} setFormData={mockSetFormData} onComplete={mockOnComplete} />)

    const textarea = screen.getByRole("textbox")
    const longText = "a".repeat(100)
    fireEvent.change(textarea, { target: { value: longText } })

    const button = screen.getByText(/analyze with ai/i)
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText(/rate limit/i)).toBeInTheDocument()
    })

    expect(mockOnComplete).not.toHaveBeenCalled()
  })

  it("should handle network error", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("Network error")))

    render(<AiParserTab formData={mockFormData} setFormData={mockSetFormData} onComplete={mockOnComplete} />)

    const textarea = screen.getByRole("textbox")
    const longText = "a".repeat(100)
    fireEvent.change(textarea, { target: { value: longText } })

    const button = screen.getByText(/analyze with ai/i)
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })

    expect(mockOnComplete).not.toHaveBeenCalled()
  })
})
