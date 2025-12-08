"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Eye, RefreshCw, FileText, Info, CheckCircle, Download } from "lucide-react"
import type { JobDetails, GenerateResumeResponse, GenerateResumeErrorResponse } from "@/lib/ai/types"
import { toast } from "sonner"
import { htmlToMarkdown, markdownToHtml, wrapMarkdownAsHTML } from "@/lib/ai/markdown-converter"

interface CurriculoTabProps {
  resumeContent: string
  setResumeContent: (value: string) => void
  resumePdfBase64: string | null
  resumeFilename: string | null
  onPdfGenerated?: (pdfBase64: string, filename: string) => void
  onMarkdownGenerated?: (markdownPt: string, markdownEn: string) => void
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
  onPdfGenerated,
  onMarkdownGenerated,
  jobAnalysisData,
  savingVaga,
  onDownloadPDF,
  onSaveVaga,
  jobDescription,
  vagaId,
}: CurriculoTabProps) {
  console.log("[CurriculoTab] Rendering", { jobAnalysisData, resumePdfBase64, vagaId })

  const [resumeLanguage, setResumeLanguage] = useState<"pt" | "en" | "both">("pt")
  const [markdownPreviewPt, setMarkdownPreviewPt] = useState("")
  const [markdownPreviewEn, setMarkdownPreviewEn] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [pdfBase64Pt, setPdfBase64Pt] = useState<string | null>(null)
  const [pdfBase64En, setPdfBase64En] = useState<string | null>(null)

  const hasPreview = !!(markdownPreviewPt || markdownPreviewEn)

  console.log("[CurriculoTab] States:", {
    resumeLanguage,
    hasPreview,
    markdownPreviewPtLength: markdownPreviewPt?.length,
    markdownPreviewEnLength: markdownPreviewEn?.length,
  })

  // Generate HTML preview
  async function handleGeneratePreview() {
    console.log("[CurriculoTab] Starting preview generation")
    console.log("[CurriculoTab] Selected language:", resumeLanguage)
    console.log("[CurriculoTab] Input data:", {
      hasVagaId: !!vagaId,
      vagaId,
      hasJobDescription: !!jobDescription,
      jobDescriptionLength: jobDescription?.length,
    })

    setIsGenerating(true)

    // Use local variables to store generated markdown (avoid race condition with setState)
    let generatedPt = ""
    let generatedEn = ""

    try {
      // Generate PT preview
      if (resumeLanguage === "pt" || resumeLanguage === "both") {
        console.log("[CurriculoTab] Generating PT preview...")

        const payload = {
          vagaId,
          jobDescription,
          language: "pt",
        }
        console.log("[CurriculoTab] PT payload:", payload)

        const response = await fetch("/api/ai/generate-resume-html", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        console.log("[CurriculoTab] PT response status:", response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("[CurriculoTab] PT response not OK:", errorText)
          throw new Error(`API returned ${response.status}: ${errorText}`)
        }

        const result = await response.json()
        console.log("[CurriculoTab] PT result:", {
          success: result.success,
          hasData: !!result.data,
          hasHtml: !!result.data?.html,
          htmlLength: result.data?.html?.length,
          error: result.error,
        })

        if (result.success && result.data?.html) {
          // Convert HTML to Markdown for better editing experience
          const markdown = htmlToMarkdown(result.data.html)
          generatedPt = markdown // Store in local variable
          setMarkdownPreviewPt(markdown)
          console.log("[CurriculoTab] ✅ PT preview generated and converted to Markdown")
        } else {
          throw new Error(result.error || "Failed to generate PT preview")
        }
      }

      // Generate EN preview
      if (resumeLanguage === "en" || resumeLanguage === "both") {
        console.log("[CurriculoTab] Generating EN preview...")

        const payload = {
          vagaId,
          jobDescription,
          language: "en",
        }
        console.log("[CurriculoTab] EN payload:", payload)

        const response = await fetch("/api/ai/generate-resume-html", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        console.log("[CurriculoTab] EN response status:", response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("[CurriculoTab] EN response not OK:", errorText)
          throw new Error(`API returned ${response.status}: ${errorText}`)
        }

        const result = await response.json()
        console.log("[CurriculoTab] EN result:", {
          success: result.success,
          hasData: !!result.data,
          hasHtml: !!result.data?.html,
          htmlLength: result.data?.html?.length,
          error: result.error,
        })

        if (result.success && result.data?.html) {
          // Convert HTML to Markdown for better editing experience
          const markdown = htmlToMarkdown(result.data.html)
          generatedEn = markdown // Store in local variable
          setMarkdownPreviewEn(markdown)
          console.log("[CurriculoTab] ✅ EN preview generated and converted to Markdown")
        } else {
          throw new Error(result.error || "Failed to generate EN preview")
        }
      }

      const message = resumeLanguage === "both" ? "2 previews gerados com sucesso!" : "Preview gerado com sucesso!"
      toast.success(message)

      // Notificar parent sobre markdown gerado (usar variáveis locais, não estado!)
      onMarkdownGenerated?.(generatedPt, generatedEn)
      console.log("[CurriculoTab] ✅ All previews generated successfully, parent notified with:", {
        ptLength: generatedPt.length,
        enLength: generatedEn.length,
      })
    } catch (error) {
      console.error("[CurriculoTab] Error generating preview:", error)
      const errorMessage = error instanceof Error ? error.message : "Erro ao gerar preview"
      toast.error(`Erro ao gerar preview: ${errorMessage}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Convert Markdown to PDF
  async function handleConvertToPdf() {
    setIsConverting(true)

    try {
      // Convert PT
      if (markdownPreviewPt) {
        console.log("[CurriculoTab] Converting PT Markdown to PDF...")

        // Step 1: Markdown → HTML
        const htmlContent = await markdownToHtml(markdownPreviewPt)
        console.log("[CurriculoTab] PT Markdown converted to HTML")

        // Step 2: Wrap with CSS
        const fullHtml = wrapMarkdownAsHTML(htmlContent)
        console.log("[CurriculoTab] PT HTML wrapped with CSS")

        // Step 3: Send to PDF generator
        const response = await fetch("/api/ai/html-to-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            html: fullHtml,
            filename: `cv-igor-fernandes-${jobAnalysisData?.empresa || "vaga"}-pt.pdf`,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `API error: ${response.status}`)
        }

        const result = await response.json()

        if (result.success && result.data?.pdfBase64) {
          setPdfBase64Pt(result.data.pdfBase64)
          console.log("[CurriculoTab] PT PDF generated from Markdown")

          // Notify parent component
          if (onPdfGenerated) {
            const filename = `cv-igor-fernandes-${jobAnalysisData?.empresa || "vaga"}-pt.pdf`
            onPdfGenerated(result.data.pdfBase64, filename)
          }
        }
      }

      // Convert EN
      if (markdownPreviewEn) {
        console.log("[CurriculoTab] Converting EN Markdown to PDF...")

        // Step 1: Markdown → HTML
        const htmlContent = await markdownToHtml(markdownPreviewEn)
        console.log("[CurriculoTab] EN Markdown converted to HTML")

        // Step 2: Wrap with CSS
        const fullHtml = wrapMarkdownAsHTML(htmlContent)
        console.log("[CurriculoTab] EN HTML wrapped with CSS")

        // Step 3: Send to PDF generator
        const response = await fetch("/api/ai/html-to-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            html: fullHtml,
            filename: `cv-igor-fernandes-${jobAnalysisData?.empresa || "vaga"}-en.pdf`,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `API error: ${response.status}`)
        }

        const result = await response.json()

        if (result.success && result.data?.pdfBase64) {
          setPdfBase64En(result.data.pdfBase64)
          console.log("[CurriculoTab] EN PDF generated from Markdown")

          // Notify parent component
          if (onPdfGenerated) {
            const filename = `cv-igor-fernandes-${jobAnalysisData?.empresa || "vaga"}-en.pdf`
            onPdfGenerated(result.data.pdfBase64, filename)
          }
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

      {/* Warning if no job analysis data */}
      {!hasPreview && !jobAnalysisData && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Análise da vaga necessária</AlertTitle>
          <AlertDescription>
            Para gerar um currículo personalizado, primeiro realize a análise da vaga na aba "Descrição da Vaga".
          </AlertDescription>
        </Alert>
      )}

      {/* Generate preview button - show if no preview */}
      {!hasPreview && (
        <Button
          onClick={handleGeneratePreview}
          disabled={!jobAnalysisData || isGenerating}
          className="w-full"
          size="lg"
        >
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
            <AlertDescription>
              Revise e edite o Markdown abaixo antes de gerar o PDF final. O Markdown é convertido automaticamente para
              HTML com formatação adequada.
            </AlertDescription>
          </Alert>

          {/* PT preview */}
          {markdownPreviewPt && (
            <div className="space-y-2">
              <Label>Preview - Português</Label>
              <Textarea
                value={markdownPreviewPt}
                onChange={(e) => setMarkdownPreviewPt(e.target.value)}
                rows={25}
                className="w-full p-4 bg-white border border-gray-200 rounded-lg font-mono text-xs resize-none overflow-auto whitespace-pre-wrap break-words"
                placeholder="Currículo em Markdown (português)..."
              />
            </div>
          )}

          {/* EN preview */}
          {markdownPreviewEn && (
            <div className="space-y-2">
              <Label>Preview - English</Label>
              <Textarea
                value={markdownPreviewEn}
                onChange={(e) => setMarkdownPreviewEn(e.target.value)}
                rows={25}
                className="w-full p-4 bg-white border border-gray-200 rounded-lg font-mono text-xs resize-none overflow-auto whitespace-pre-wrap break-words"
                placeholder="Resume in Markdown (English)..."
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setMarkdownPreviewPt("")
                setMarkdownPreviewEn("")
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
