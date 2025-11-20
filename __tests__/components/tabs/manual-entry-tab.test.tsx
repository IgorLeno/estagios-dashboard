import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ManualEntryTab } from "@/components/tabs/manual-entry-tab"
import type { FormData } from "@/lib/utils/ai-mapper"

describe("ManualEntryTab", () => {
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

  it("should render all form fields", () => {
    const mockSetFormData = vi.fn()
    const mockOnSubmit = vi.fn((e) => e.preventDefault())

    render(
      <ManualEntryTab formData={mockFormData} setFormData={mockSetFormData} onSubmit={mockOnSubmit} loading={false} />
    )

    expect(screen.getByLabelText(/empresa/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cargo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/local/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/modalidade/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/fit requisitos/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/fit perfil/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  it("should display pre-filled data from props", () => {
    const preFilledData: FormData = {
      ...mockFormData,
      empresa: "Google",
      cargo: "Software Engineer",
      local: "São Paulo",
      requisitos: "4.5",
      fit: "3.5",
    }

    const mockSetFormData = vi.fn()
    const mockOnSubmit = vi.fn((e) => e.preventDefault())

    render(
      <ManualEntryTab formData={preFilledData} setFormData={mockSetFormData} onSubmit={mockOnSubmit} loading={false} />
    )

    expect(screen.getByDisplayValue("Google")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Software Engineer")).toBeInTheDocument()
    expect(screen.getByDisplayValue("São Paulo")).toBeInTheDocument()
    expect(screen.getByDisplayValue("4.5")).toBeInTheDocument()
    expect(screen.getByDisplayValue("3.5")).toBeInTheDocument()
  })

  it("should call onSubmit when form submitted", () => {
    const validFormData: FormData = {
      ...mockFormData,
      empresa: "Test Company",
      cargo: "Test Role",
      local: "Test Location",
    }

    const mockSetFormData = vi.fn()
    const mockOnSubmit = vi.fn((e) => e.preventDefault())

    render(
      <ManualEntryTab formData={validFormData} setFormData={mockSetFormData} onSubmit={mockOnSubmit} loading={false} />
    )

    const submitButton = screen.getByText(/salvar vaga/i)
    fireEvent.click(submitButton)

    expect(mockOnSubmit).toHaveBeenCalled()
  })

  it("should disable submit button when loading", () => {
    const mockSetFormData = vi.fn()
    const mockOnSubmit = vi.fn((e) => e.preventDefault())

    render(
      <ManualEntryTab formData={mockFormData} setFormData={mockSetFormData} onSubmit={mockOnSubmit} loading={true} />
    )

    const submitButton = screen.getByText(/salvando/i)
    expect(submitButton).toBeDisabled()
  })
})
