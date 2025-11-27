"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Loader2,
  Eye,
  RefreshCw,
  FileText,
  Info,
  CheckCircle,
  Download,
} from "lucide-react"
import type { JobDetails, GenerateResumeResponse, GenerateResumeErrorResponse } from "@/lib/ai/types"
import { toast } from "sonner"

interface CurriculoTabProps {
  resumeContent: string
  setResumeContent: (value: string) => void
  resumePdfBase64: string | null
  resumeFilename: string | null
  jobAnalysisData: JobDetails | null
  generatingResume: boolean
  savingVaga: boolean
  onGenerateResume: () => Promise<void>
  onRefreshResume: () => Promise<void>
  onDownloadPDF: () => void
  onSaveVaga: () => Promise<void>
  jobDescription: string
  vagaId?: string
}

export function CurriculoTab({
  resumePdfBase64,
  resumeFilename,
  jobAnalysisData,
  savingVaga,
  onDownloadPDF,
  onSaveVaga,
  jobDescription,
  vagaId,
}: CurriculoTabProps) {
  console.log("[CurriculoTab] Rendering", { jobAnalysisData, resumePdfBase64, vagaId })

  const [resumeLanguage, setResumeLanguage] = useState<"pt" | "en" | "both">("pt")
  const [htmlPreviewPt, setHtmlPreviewPt] = useState("")
  const [htmlPreviewEn, setHtmlPreviewEn] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [pdfBase64Pt, setPdfBase64Pt] = useState<string | null>(null)
  const [pdfBase64En, setPdfBase64En] = useState<string | null>(null)

  const hasPreview = !!(htmlPreviewPt || htmlPreviewEn)

  console.log("[CurriculoTab] States:", {
    resumeLanguage,
    hasPreview,
    htmlPreviewPtLength: htmlPreviewPt?.length,
    htmlPreviewEnLength: htmlPreviewEn?.length,
  })

  // Generate HTML preview
  async function handleGeneratePreview() {
    setIsGenerating(true)

    try {
      // Generate PT preview
      if (resumeLanguage === "pt" || resumeLanguage === "both") {
        console.log("[CurriculoTab] Generating PT preview...")

        const response = await fetch("/api/ai/generate-resume-html", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vagaId,
            jobDescription,
            language: "pt",
          }),
        })

        const result = await response.json()

        if (result.success && result.data?.html) {
          setHtmlPreviewPt(result.data.html)
          console.log("[CurriculoTab] PT preview generated, length:", result.data.html.length)
        } else {
          throw new Error(result.error || "Failed to generate PT preview")
        }
      }

      // Generate EN preview
      if (resumeLanguage === "en" || resumeLanguage === "both") {
        console.log("[CurriculoTab] Generating EN preview...")

        const response = await fetch("/api/ai/generate-resume-html", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vagaId,
            jobDescription,
            language: "en",
          }),
        })

        const result = await response.json()

        if (result.success && result.html) {
          setHtmlPreviewEn(result.html)
          console.log("[CurriculoTab] EN preview generated, length:", result.html.length)
        } else {
          throw new Error(result.error || "Failed to generate EN preview")
        }
      }

      toast.success(resumeLanguage === "both" ? "2 previews gerados com sucesso!" : "Preview gerado com sucesso!")
    } catch (error) {
      console.error("[CurriculoTab] Error generating preview:", error)
      const errorMessage = error instanceof Error ? error.message : "Erro ao gerar preview"
      toast.error(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  // Convert HTML to PDF
  async function handleConvertToPdf() {
    setIsConverting(true)

    try {
      // Convert PT
      if (htmlPreviewPt) {
        console.log("[CurriculoTab] Converting PT to PDF...")

        const response = await fetch("/api/ai/generate-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobDescription,
            language: "pt",
          }),
        })

        if (!response.ok) {
          const errorData: GenerateResumeErrorResponse = await response.json()
          throw new Error(errorData.error || `API error: ${response.status}`)
        }

        const result: GenerateResumeResponse = await response.json()

        if (result.success) {
          setPdfBase64Pt(result.data.pdfBase64)
          console.log("[CurriculoTab] PT PDF generated")
        }
      }

      // Convert EN
      if (htmlPreviewEn) {
        console.log("[CurriculoTab] Converting EN to PDF...")

        const response = await fetch("/api/ai/generate-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobDescription,
            language: "en",
          }),
        })

        if (!response.ok) {
          const errorData: GenerateResumeErrorResponse = await response.json()
          throw new Error(errorData.error || `API error: ${response.status}`)
        }

        const result: GenerateResumeResponse = await response.json()

        if (result.success) {
          setPdfBase64En(result.data.pdfBase64)
          console.log("[CurriculoTab] EN PDF generated")
        }
      }

      toast.success("PDF(s) gerado(s) com sucesso!")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao gerar PDF"
      toast.error(errorMessage)
      console.error("[CurriculoTab] PDF conversion error:", err)
    } finally {
      setIsConverting(false)
    }
  }

  // Download PDF
  function handleDownloadPdfLocal(pdfBase64: string, language: "pt" | "en") {
    const filename = `cv-igor-fernandes-${jobAnalysisData?.empresa || "vaga"}-${language}.pdf`
    const link = document.createElement("a")
    link.href = `data:application/pdf;base64,${pdfBase64}`
    link.download = filename
    link.click()
    toast.success(`✓ PDF ${language.toUpperCase()} baixado!`)
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Gerar Currículo Personalizado</h3>
        <p className="text-sm text-muted-foreground">
          Escolha o idioma e gere um preview editável do currículo adaptado para esta vaga.
        </p>
      </div>

      {/* Language selector - ALWAYS VISIBLE */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Idioma do Currículo</Label>
        <div className="grid grid-cols-3 gap-3">
          <Button
            type="button"
            variant={resumeLanguage === "pt" ? "default" : "outline"}
            onClick={() => setResumeLanguage("pt")}
            className="w-full"
          >
            <span className="mr-2">🇧🇷</span>
            Português
          </Button>
          <Button
            type="button"
            variant={resumeLanguage === "en" ? "default" : "outline"}
            onClick={() => setResumeLanguage("en")}
            className="w-full"
          >
            <span className="mr-2">🇺🇸</span>
            English
          </Button>
          <Button
            type="button"
            variant={resumeLanguage === "both" ? "default" : "outline"}
            onClick={() => setResumeLanguage("both")}
            className="w-full"
          >
            <span className="mr-2">🌐</span>
            Ambos
          </Button>
        </div>
      </div>

      {/* Generate preview button - show if no preview */}
      {!hasPreview && (
        <Button onClick={handleGeneratePreview} disabled={isGenerating} className="w-full" size="lg">
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando preview...
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Gerar Preview
            </>
          )}
        </Button>
      )}

      {/* Editable preview - show after generation */}
      {hasPreview && (
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Preview Gerado</AlertTitle>
            <AlertDescription>Revise e edite o HTML abaixo antes de gerar o PDF final.</AlertDescription>
          </Alert>

          {/* PT preview */}
          {htmlPreviewPt && (
            <div className="space-y-2">
              <Label>Preview - Português</Label>
              <Textarea
                value={htmlPreviewPt}
                onChange={(e) => setHtmlPreviewPt(e.target.value)}
                rows={25}
                className="font-mono text-xs resize-none"
                placeholder="HTML do currículo em português..."
              />
            </div>
          )}

          {/* EN preview */}
          {htmlPreviewEn && (
            <div className="space-y-2">
              <Label>Preview - English</Label>
              <Textarea
                value={htmlPreviewEn}
                onChange={(e) => setHtmlPreviewEn(e.target.value)}
                rows={25}
                className="font-mono text-xs resize-none"
                placeholder="Resume HTML in English..."
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setHtmlPreviewPt("")
                setHtmlPreviewEn("")
                setPdfBase64Pt(null)
                setPdfBase64En(null)
              }}
              className="flex-1"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerar
            </Button>
            <Button onClick={handleConvertToPdf} disabled={isConverting} className="flex-1">
              {isConverting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar PDF
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* PDF download section */}
      {(pdfBase64Pt || pdfBase64En || resumePdfBase64) && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-semibold text-sm">PDFs Gerados</h4>

          {pdfBase64Pt && (
            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded border">
              <FileText className="h-5 w-5 text-slate-400" />
              <span className="flex-1 font-mono text-sm">cv-igor-fernandes-pt.pdf</span>
              <Button size="sm" variant="outline" onClick={() => handleDownloadPdfLocal(pdfBase64Pt, "pt")}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}

          {pdfBase64En && (
            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded border">
              <FileText className="h-5 w-5 text-slate-400" />
              <span className="flex-1 font-mono text-sm">cv-igor-fernandes-en.pdf</span>
              <Button size="sm" variant="outline" onClick={() => handleDownloadPdfLocal(pdfBase64En, "en")}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}

          {resumePdfBase64 && resumeFilename && (
            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded border">
              <FileText className="h-5 w-5 text-slate-400" />
              <span className="flex-1 font-mono text-sm">{resumeFilename}</span>
              <Button size="sm" variant="outline" onClick={onDownloadPDF}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Save vaga button */}
      <Button
        onClick={onSaveVaga}
        disabled={savingVaga}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        size="lg"
      >
        {savingVaga ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Salvar Vaga
          </>
        )}
      </Button>
    </div>
  )
}
