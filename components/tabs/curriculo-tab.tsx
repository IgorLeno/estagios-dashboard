"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Eye, Info, CheckCircle, FileText, RefreshCw, Languages } from "lucide-react"
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

  const [markdownPreviewPt, setMarkdownPreviewPt] = useState("")
  const [markdownPreviewEn, setMarkdownPreviewEn] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingLanguage, setGeneratingLanguage] = useState<"pt" | "en" | "both" | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [pdfBase64Pt, setPdfBase64Pt] = useState<string | null>(null)
  const [pdfBase64En, setPdfBase64En] = useState<string | null>(null)
  const [isPreviewSavedPt, setIsPreviewSavedPt] = useState(false)
  const [isPreviewSavedEn, setIsPreviewSavedEn] = useState(false)
  const [isSavingPt, setIsSavingPt] = useState(false)
  const [isSavingEn, setIsSavingEn] = useState(false)

  const hasPreview = !!(markdownPreviewPt || markdownPreviewEn)

  console.log("[CurriculoTab] States:", {
    hasPreview,
    markdownPreviewPtLength: markdownPreviewPt?.length,
    markdownPreviewEnLength: markdownPreviewEn?.length,
    isGenerating,
    generatingLanguage,
  })

  // Generate HTML preview
  async function handleGeneratePreview(language: "pt" | "en" | "both") {
    console.log("[CurriculoTab] Starting preview generation")
    console.log("[CurriculoTab] Selected language:", language)
    console.log("[CurriculoTab] Input data:", {
      hasVagaId: !!vagaId,
      vagaId,
      hasJobDescription: !!jobDescription,
      jobDescriptionLength: jobDescription?.length,
    })

    setIsGenerating(true)
    setGeneratingLanguage(language)

    // Use local variables to store generated markdown (avoid race condition with setState)
    let generatedPt = ""
    let generatedEn = ""

    try {
      // Generate PT preview
      if (language === "pt" || language === "both") {
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
      if (language === "en" || language === "both") {
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

      const message =
        language === "both"
          ? "2 previews gerados com sucesso!"
          : language === "pt"
          ? "Preview PT gerado com sucesso!"
          : "Preview EN gerado com sucesso!"
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
      setGeneratingLanguage(null)
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
          Gere previews editáveis do currículo adaptado para esta vaga em português, inglês ou ambos.
        </p>
      </div>

      {/* Warning if no job analysis data */}
      {!jobAnalysisData && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Análise da vaga necessária</AlertTitle>
          <AlertDescription>
            Para gerar um currículo personalizado, primeiro realize a análise da vaga na aba "Descrição da Vaga".
          </AlertDescription>
        </Alert>
      )}

      {/* ✅ NOVO: Botões de geração dinâmicos - SEMPRE VISÍVEIS */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Botão: Gerar/Regenerar PT */}
        <Button
          onClick={() => handleGeneratePreview("pt")}
          variant={markdownPreviewPt ? "outline" : "default"}
          disabled={!jobAnalysisData || isGenerating}
        >
          {isGenerating && generatingLanguage === "pt" ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              {markdownPreviewPt ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerar PT
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar PT
                </>
              )}
            </>
          )}
        </Button>

        {/* Botão: Gerar/Regenerar EN */}
        <Button
          onClick={() => handleGeneratePreview("en")}
          variant={markdownPreviewEn ? "outline" : "default"}
          disabled={!jobAnalysisData || isGenerating}
        >
          {isGenerating && generatingLanguage === "en" ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              {markdownPreviewEn ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerar EN
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar EN
                </>
              )}
            </>
          )}
        </Button>

        {/* Botão: Gerar/Regenerar Ambos (dinâmico) */}
        <Button
          onClick={() => handleGeneratePreview("both")}
          variant="secondary"
          disabled={!jobAnalysisData || isGenerating}
        >
          {isGenerating && generatingLanguage === "both" ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Languages className="h-4 w-4 mr-2" />
              {markdownPreviewPt && markdownPreviewEn
                ? "Regenerar Ambos"
                : markdownPreviewPt
                ? "Regenerar PT e Gerar EN"
                : markdownPreviewEn
                ? "Gerar PT e Regenerar EN"
                : "Gerar Ambos"}
            </>
          )}
        </Button>
      </div>

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
                onRegenerate={() => handleGeneratePreview("pt")}
                onSavePreview={() => handleSavePreview("pt")}
                onGeneratePDF={() => handleConvertToPdfSingle("pt")}
                onDownload={() => handleDownloadPdfLocal(pdfBase64Pt!, "pt")}
                onMarkdownChange={setMarkdownPreviewPt}
                isRegenerating={isGenerating && generatingLanguage === "pt"}
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
                onRegenerate={() => handleGeneratePreview("en")}
                onSavePreview={() => handleSavePreview("en")}
                onGeneratePDF={() => handleConvertToPdfSingle("en")}
                onDownload={() => handleDownloadPdfLocal(pdfBase64En!, "en")}
                onMarkdownChange={setMarkdownPreviewEn}
                isRegenerating={isGenerating && generatingLanguage === "en"}
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
