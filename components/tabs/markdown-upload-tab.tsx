"use client"

import { MarkdownUpload } from "@/components/markdown-upload"
import { FileUpload } from "@/components/file-upload"
import { toast } from "sonner"
import type { FormData } from "@/lib/utils/ai-mapper"
import type { ParsedVagaData } from "@/lib/markdown-parser"

interface MarkdownUploadTabProps {
  formData: FormData
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void
  onComplete: () => void
}

export function MarkdownUploadTab({ formData, setFormData, onComplete }: MarkdownUploadTabProps) {
  function handleParsedData(parsed: ParsedVagaData) {
    setFormData((prev) => ({
      ...prev,
      ...(parsed.empresa && { empresa: parsed.empresa }),
      ...(parsed.cargo && { cargo: parsed.cargo }),
      ...(parsed.local && { local: parsed.local }),
      ...(parsed.modalidade && { modalidade: parsed.modalidade }),
      ...(parsed.requisitos !== undefined && { requisitos: parsed.requisitos.toString() }),
      ...(parsed.fit !== undefined && { fit: parsed.fit.toString() }),
      ...(parsed.etapa && { etapa: parsed.etapa }),
      ...(parsed.status && { status: parsed.status }),
      ...(parsed.observacoes && { observacoes: parsed.observacoes }),
    }))

    toast.success("Fields auto-filled from markdown!")

    // Auto-switch to manual tab after brief delay
    setTimeout(() => onComplete(), 1500)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload a markdown analysis file (.md) to automatically extract job details.
      </p>

      <MarkdownUpload
        onUploadComplete={(url, parsedData) => {
          setFormData((prev) => ({ ...prev, arquivo_analise_url: url }))
          if (parsedData) handleParsedData(parsedData)
        }}
        onParseComplete={handleParsedData}
        currentFile={formData.arquivo_analise_url}
        label="Job Analysis (.md)"
        autoFillFields={true}
      />

      <FileUpload
        onUploadComplete={(url) =>
          setFormData((prev) => ({ ...prev, arquivo_cv_url: url }))
        }
        currentFile={formData.arquivo_cv_url}
        label="Resume (PDF/DOCX)"
      />
    </div>
  )
}
