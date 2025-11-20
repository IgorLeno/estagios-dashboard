import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AddVagaDialog } from "@/components/add-vaga-dialog"

// Mock Supabase
const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
const mockSelect = vi.fn(() => ({
  single: () => Promise.resolve({ data: null, error: null }),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: mockSelect,
      insert: mockInsert,
    }),
  }),
}))

// Mock date utils
vi.mock("@/lib/date-utils", () => ({
  getDataInscricao: () => "2025-01-19",
}))

// Mock utils
vi.mock("@/lib/utils", () => ({
  normalizeRatingForSave: (value: string) => parseFloat(value) || 0,
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}))

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("AI Job Auto-Fill Integration", () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should complete full flow: AI parse → auto-fill → manual review → save", async () => {
    const user = userEvent.setup({ delay: null })

    const mockApiResponse = {
      success: true,
      data: {
        empresa: "Google",
        cargo: "Software Engineer",
        local: "São Paulo, SP",
        modalidade: "Híbrido",
        tipo_vaga: "Júnior",
        requisitos_obrigatorios: ["React", "TypeScript"],
        requisitos_desejaveis: ["Node.js"],
        responsabilidades: ["Develop features"],
        beneficios: ["Health insurance"],
        salario: "R$ 5000",
        idioma_vaga: "pt",
        requisitos_score: 4.5,
        fit: 3.5,
        etapa: "Inscrição",
        status: "Pendente",
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

    render(
      <AddVagaDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    )

    // Step 1: Should default to AI Parser tab
    expect(screen.getByRole("textbox")).toBeInTheDocument()

    // Step 2: Paste job description
    const textarea = screen.getByRole("textbox")
    const jobDescription = "a".repeat(100)
    await user.clear(textarea)
    await user.type(textarea, jobDescription)

    // Step 3: Click Analyze
    const analyzeButton = screen.getByText(/analyze with ai/i)
    await user.click(analyzeButton)

    // Step 4: Wait for API call
    await vi.runAllTimersAsync()

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/ai/parse-job",
      expect.objectContaining({ method: "POST" })
    )

    // Step 5: Auto-switch should happen and manual tab should show with pre-filled data
    await waitFor(
      () => {
        expect(screen.getByDisplayValue("Google")).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // Step 6: Verify pre-filled data in manual tab
    expect(screen.getByDisplayValue("Software Engineer")).toBeInTheDocument()
    expect(screen.getByDisplayValue("São Paulo, SP")).toBeInTheDocument()
    expect(screen.getByDisplayValue("4.5")).toBeInTheDocument()
    expect(screen.getByDisplayValue("3.5")).toBeInTheDocument()

    // Step 7: Submit form
    const submitButton = screen.getByText(/salvar vaga/i)
    await user.click(submitButton)

    // Step 8: Verify Supabase insert called
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          empresa: "Google",
          cargo: "Software Engineer",
          local: "São Paulo, SP",
          modalidade: "Híbrido",
        })
      )
    })

    // Step 9: Verify success callback
    expect(mockOnSuccess).toHaveBeenCalled()
  })

  it("should allow manual entry without AI parsing", async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <AddVagaDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    )

    // Switch to manual tab directly
    const manualTab = screen.getByText("Manual Entry")
    await user.click(manualTab)

    // Wait for manual tab to render
    await waitFor(() => {
      expect(screen.getByLabelText(/empresa/i)).toBeInTheDocument()
    })

    // Fill form manually
    await user.type(screen.getByLabelText(/empresa/i), "Manual Company")
    await user.type(screen.getByLabelText(/cargo/i), "Manual Role")
    await user.type(screen.getByLabelText(/local/i), "Manual Location")

    // Submit
    const submitButton = screen.getByText(/salvar vaga/i)
    await user.click(submitButton)

    // Verify insert called with manual data
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          empresa: "Manual Company",
          cargo: "Manual Role",
          local: "Manual Location",
        })
      )
    })
  })
})
