import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AddVagaDialog } from "@/components/add-vaga-dialog"

// Mock Supabase
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
      }),
      insert: () => Promise.resolve({ error: null }),
    }),
  }),
}))

// Mock date utils
vi.mock("@/lib/date-utils", () => ({
  getDataInscricao: () => "2025-01-19",
}))

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("AddVagaDialog", () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render dialog when open", () => {
    render(<AddVagaDialog open={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />)

    expect(screen.getByText(/add new job/i)).toBeInTheDocument()
  })

  it("should default to AI Parser tab", () => {
    render(<AddVagaDialog open={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />)

    // AI Parser tab should be active (has textarea)
    expect(screen.getByRole("textbox")).toBeInTheDocument()
    expect(screen.getByText(/analyze with ai/i)).toBeInTheDocument()
  })

  it("should allow switching to manual tab", async () => {
    const user = userEvent.setup()

    render(<AddVagaDialog open={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />)

    // Verify initial state (AI Parser tab)
    expect(screen.getByRole("textbox")).toBeInTheDocument()

    // Click Manual Entry tab trigger with userEvent for better simulation
    const manualTabTrigger = screen.getByText("Manual Entry")
    await user.click(manualTabTrigger)

    // Wait for TabsContent to render
    await waitFor(
      () => {
        expect(screen.getByLabelText(/empresa/i)).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    expect(screen.getByText(/salvar vaga/i)).toBeInTheDocument()
  })

  it("should allow switching to upload tab", async () => {
    const user = userEvent.setup()

    render(<AddVagaDialog open={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />)

    const uploadTabTrigger = screen.getByText("Upload .md")
    await user.click(uploadTabTrigger)

    // Wait for upload section to appear
    await waitFor(
      () => {
        expect(screen.getByText(/upload a markdown analysis file/i)).toBeInTheDocument()
      },
      { timeout: 2000 }
    )
  })

  it("should share formData across tabs", async () => {
    const user = userEvent.setup()

    render(<AddVagaDialog open={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />)

    // Switch to manual tab
    const manualTab = screen.getByText("Manual Entry")
    await user.click(manualTab)

    // Wait for manual tab content to render
    await waitFor(
      () => {
        expect(screen.getByLabelText(/empresa/i)).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    // Fill empresa field
    const empresaInput = screen.getByLabelText(/empresa/i)
    await user.clear(empresaInput)
    await user.type(empresaInput, "Google")

    // Switch to AI Parser tab
    const aiTab = screen.getByText("AI Parser")
    await user.click(aiTab)

    // Wait for AI Parser content
    await waitFor(
      () => {
        expect(screen.getByRole("textbox")).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    // Switch back to manual tab
    await user.click(manualTab)

    // Wait for manual tab content again
    await waitFor(
      () => {
        expect(screen.getByLabelText(/empresa/i)).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    // Data should persist
    const empresaInputAfter = screen.getByLabelText(/empresa/i)
    expect(empresaInputAfter).toHaveValue("Google")
  })
})
