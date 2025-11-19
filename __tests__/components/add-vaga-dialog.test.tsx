import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
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
    render(
      <AddVagaDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText(/add new job/i)).toBeInTheDocument()
  })

  it("should default to AI Parser tab", () => {
    render(
      <AddVagaDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    )

    // AI Parser tab should be active (has textarea)
    expect(screen.getByRole("textbox")).toBeInTheDocument()
    expect(screen.getByText(/analyze with ai/i)).toBeInTheDocument()
  })

  it("should allow switching to manual tab", async () => {
    render(
      <AddVagaDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    )

    const manualTab = screen.getByText("Manual Entry")
    fireEvent.click(manualTab)

    // Manual tab should show form fields
    expect(await screen.findByLabelText(/empresa/i)).toBeInTheDocument()
    expect(screen.getByText(/salvar vaga/i)).toBeInTheDocument()
  })

  it("should allow switching to upload tab", async () => {
    render(
      <AddVagaDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    )

    const uploadTab = screen.getByText("Upload .md")
    fireEvent.click(uploadTab)

    // Upload tab should show description
    expect(
      await screen.findByText(/upload a markdown analysis file/i)
    ).toBeInTheDocument()
  })

  it("should share formData across tabs", async () => {
    render(
      <AddVagaDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    )

    // Switch to manual tab
    const manualTab = screen.getByText("Manual Entry")
    fireEvent.click(manualTab)

    // Fill empresa field
    const empresaInput = await screen.findByLabelText(/empresa/i)
    fireEvent.change(empresaInput, { target: { value: "Google" } })

    // Switch to AI Parser tab and back
    const aiTab = screen.getByText("AI Parser")
    fireEvent.click(aiTab)
    fireEvent.click(manualTab)

    // Data should persist
    const empresaInputAfter = await screen.findByLabelText(/empresa/i)
    expect(empresaInputAfter).toHaveValue("Google")
  })
})
