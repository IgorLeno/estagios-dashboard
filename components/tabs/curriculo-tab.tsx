"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Eye, Info, CheckCircle } from "lucide-react"
import type { JobDetails } from "@/lib/ai/types"
import { toast } from "sonner"
import { htmlToMarkdown, markdownToHtml, wrapMarkdownAsHTML } from "@/lib/ai/markdown-converter"
import { ResumePreviewCard } from "@/components/resume-preview-card"

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
  const [isPreviewSavedPt, setIsPreviewSavedPt] = useState(false)
  const [isPreviewSavedEn, setIsPreviewSavedEn] = useState(false)
  const [isSavingPt, setIsSavingPt] = useState(false)
  const [isSavingEn, setIsSavingEn] = useState(false)

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

  // Convert Markdown to PDF (single language)
  async function handleConvertToPdfSingle(language: "pt" | "en") {
    setIsConverting(true)

    try {
      const markdownText = language === "pt" ? markdownPreviewPt : markdownPreviewEn

      if (!markdownText) {
        toast.error(`Nenhum conteúdo em ${language.toUpperCase()} para converter`)
        return
      }

      console.log(`[CurriculoTab] Converting ${language.toUpperCase()} Markdown to PDF...`)

      // Step 1: Markdown → HTML
      const htmlContent = await markdownToHtml(markdownText)
      console.log(`[CurriculoTab] ${language.toUpperCase()} Markdown converted to HTML`)

      // Step 2: Wrap with CSS
      const fullHtml = wrapMarkdownAsHTML(htmlContent)
      console.log(`[CurriculoTab] ${language.toUpperCase()} HTML wrapped with CSS`)

      // Step 3: Send to PDF generator
      const response = await fetch("/api/ai/html-to-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: fullHtml,
          filename: `cv-igor-fernandes-${jobAnalysisData?.empresa || "vaga"}-${language}.pdf`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data?.pdfBase64) {
        if (language === "pt") {
          setPdfBase64Pt(result.data.pdfBase64)
        } else {
          setPdfBase64En(result.data.pdfBase64)
        }
        console.log(`[CurriculoTab] ${language.toUpperCase()} PDF generated from Markdown`)

        // Notify parent component
        if (onPdfGenerated) {
          const filename = `cv-igor-fernandes-${jobAnalysisData?.empresa || "vaga"}-${language}.pdf`
          onPdfGenerated(result.data.pdfBase64, filename)
        }

        toast.success(`PDF ${language.toUpperCase()} gerado com sucesso!`)
      }
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

  // Save preview to database
  async function handleSavePreview(language: "pt" | "en") {
    if (!vagaId) {
      toast.error("ID da vaga não disponível")
      return
    }

    const markdownContent = language === "pt" ? markdownPreviewPt : markdownPreviewEn

    if (!markdownContent) {
      toast.error(`Nenhum preview em ${language.toUpperCase()} para salvar`)
      return
    }

    // Set loading state
    if (language === "pt") {
      setIsSavingPt(true)
    } else {
      setIsSavingEn(true)
    }

    try {
      const response = await fetch(`/api/resumes/${vagaId}/save-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          markdownContent,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        // Update saved state
        if (language === "pt") {
          setIsPreviewSavedPt(true)
        } else {
          setIsPreviewSavedEn(true)
        }

        toast.success(`Preview ${language.toUpperCase()} salvo com sucesso!`)
      }
    } catch (error) {
      console.error("[CurriculoTab] Error saving preview:", error)
      const errorMessage = error instanceof Error ? error.message : "Erro ao salvar preview"
      toast.error(errorMessage)
    } finally {
      // Reset loading state
      if (language === "pt") {
        setIsSavingPt(false)
      } else {
        setIsSavingEn(false)
      }
    }
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

          {/* Container com rolagem vertical */}
          <div className="max-h-[800px] lg:max-h-[70vh] overflow-y-auto space-y-6 pr-2">
            {/* PT preview */}
            {markdownPreviewPt && (
              <ResumePreviewCard
                language="pt"
                markdownContent={markdownPreviewPt}
                pdfUrl={pdfBase64Pt ? `data:application/pdf;base64,${pdfBase64Pt}` : null}
                isGenerated={true}
                isPreviewSaved={isPreviewSavedPt}
                onRegenerate={handleGeneratePreview}
                onSavePreview={() => handleSavePreview("pt")}
                onGeneratePDF={() => handleConvertToPdfSingle("pt")}
                onDownload={() => handleDownloadPdfLocal(pdfBase64Pt!, "pt")}
                onMarkdownChange={setMarkdownPreviewPt}
                isRegenerating={isGenerating}
                isSaving={isSavingPt}
                isGeneratingPDF={isConverting}
                showSavePreview={!!vagaId}
              />
            )}

            {/* EN preview */}
            {markdownPreviewEn && (
              <ResumePreviewCard
                language="en"
                markdownContent={markdownPreviewEn}
                pdfUrl={pdfBase64En ? `data:application/pdf;base64,${pdfBase64En}` : null}
                isGenerated={true}
                isPreviewSaved={isPreviewSavedEn}
                onRegenerate={handleGeneratePreview}
                onSavePreview={() => handleSavePreview("en")}
                onGeneratePDF={() => handleConvertToPdfSingle("en")}
                onDownload={() => handleDownloadPdfLocal(pdfBase64En!, "en")}
                onMarkdownChange={setMarkdownPreviewEn}
                isRegenerating={isGenerating}
                isSaving={isSavingEn}
                isGeneratingPDF={isConverting}
                showSavePreview={!!vagaId}
              />
            )}
          </div>
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
