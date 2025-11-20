import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MarkdownUploadTab } from "@/components/tabs/markdown-upload-tab"
import type { FormData } from "@/lib/utils/ai-mapper"

// Mock MarkdownUpload component
vi.mock("@/components/markdown-upload", () => ({
  MarkdownUpload: ({ label }: { label: string }) => <div>{label}</div>,
}))

// Mock FileUpload component
vi.mock("@/components/file-upload", () => ({
  FileUpload: ({ label }: { label: string }) => <div>{label}</div>,
}))

describe("MarkdownUploadTab", () => {
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

  it("should render MarkdownUpload and FileUpload components", () => {
    render(<MarkdownUploadTab formData={mockFormData} setFormData={mockSetFormData} onComplete={mockOnComplete} />)

    expect(screen.getByText(/job analysis/i)).toBeInTheDocument()
    expect(screen.getByText(/resume/i)).toBeInTheDocument()
  })

  it("should render description text", () => {
    render(<MarkdownUploadTab formData={mockFormData} setFormData={mockSetFormData} onComplete={mockOnComplete} />)

    expect(screen.getByText(/upload a markdown analysis file/i)).toBeInTheDocument()
  })
})
