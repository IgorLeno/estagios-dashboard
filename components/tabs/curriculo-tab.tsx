"use client"

import { useState, useEffect, type Dispatch, type SetStateAction } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Info, CheckCircle, FileText, RefreshCw, Languages, Bot, Plus, X } from "lucide-react"
import type { JobDetails } from "@/lib/ai/types"
import { toast } from "sonner"
import { htmlToMarkdown, markdownToHtml, wrapMarkdownAsHTML } from "@/lib/ai/markdown-converter"
import { ResumePreviewCard } from "@/components/resume-preview-card"
import { createClient } from "@/lib/supabase/client"

interface CurriculoTabProps {
  resumeContent?: string
  setResumeContent?: Dispatch<SetStateAction<string>>
  resumePdfBase64?: string | null
  resumeFilename?: string | null
  onPdfGenerated?: (pdfBase64: string, filename: string) => void
  jobAnalysisData: JobDetails | null
  jobDescription: string
  vagaId?: string
  isInPage?: boolean
  generatingResume?: boolean
  onGenerateResume?: () => Promise<void>
  onRefreshResume?: () => Promise<void>
  onDownloadPDF?: () => void
  onSaveVaga?: () => Promise<void>
  savingVaga?: boolean
  onMarkdownGenerated?: (markdownPt: string, markdownEn: string) => void
  initialMarkdownPt?: string
  initialMarkdownEn?: string
  approvedSkills?: string[]
  activeModel: string
  modelHistory: string[]
  onModelChange: (model: string) => void
  onModelHistoryChange: (history: string[]) => void
}

const MODEL_HISTORY_LIMIT = 20

function normalizeModelHistory(history: string[]) {
  return history
    .map((model) => model.trim())
    .filter(Boolean)
    .filter((model, index, allModels) => allModels.indexOf(model) === index)
    .slice(0, MODEL_HISTORY_LIMIT)
}

export function CurriculoTab({
  jobAnalysisData,
  jobDescription,
  vagaId,
  isInPage = false,
  onSaveVaga,
  savingVaga = false,
  onMarkdownGenerated,
  initialMarkdownPt = "",
  initialMarkdownEn = "",
  approvedSkills,
  activeModel,
  modelHistory,
  onModelChange,
  onModelHistoryChange,
}: CurriculoTabProps) {
  console.log("[CurriculoTab] Rendering", { jobAnalysisData, vagaId, isInPage })

  const [markdownPreviewPt, setMarkdownPreviewPt] = useState(initialMarkdownPt)
  const [markdownPreviewEn, setMarkdownPreviewEn] = useState(initialMarkdownEn)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingLanguage, setGeneratingLanguage] = useState<"pt" | "en" | "both" | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [pdfBase64Pt, setPdfBase64Pt] = useState<string | null>(null)
  const [pdfBase64En, setPdfBase64En] = useState<string | null>(null)
  const [isPreviewSavedPt, setIsPreviewSavedPt] = useState(false)
  const [isPreviewSavedEn, setIsPreviewSavedEn] = useState(false)
  const [isSavingPt, setIsSavingPt] = useState(false)
  const [isSavingEn, setIsSavingEn] = useState(false)
  const [showModelInput, setShowModelInput] = useState(false)
  const [newModelInput, setNewModelInput] = useState("")
  const [localTemplate, setLocalTemplate] = useState<string>(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("resume_template_preference") ?? "modelo1")
      : "modelo1"
  )
  const [htmlSourcePt, setHtmlSourcePt] = useState<string>("")
  const [htmlSourceEn, setHtmlSourceEn] = useState<string>("")

  const hasPreview = !!(markdownPreviewPt || markdownPreviewEn)

  console.log("[CurriculoTab] States:", {
    hasPreview,
    markdownPreviewPtLength: markdownPreviewPt?.length,
    markdownPreviewEnLength: markdownPreviewEn?.length,
    isGenerating,
    generatingLanguage,
  })

  function selectModel(model: string) {
    const trimmed = model.trim()
    if (!trimmed) return

    onModelChange(trimmed)
    onModelHistoryChange(normalizeModelHistory([trimmed, ...modelHistory]))
    setShowModelInput(false)
    setNewModelInput("")
  }

  function removeModelFromHistory(model: string) {
    if (model === activeModel) return
    onModelHistoryChange(modelHistory.filter((entry) => entry !== model))
  }

  function handleAddNewModel() {
    selectModel(newModelInput)
  }

  useEffect(() => {
    if (!markdownPreviewPt && initialMarkdownPt) {
      setMarkdownPreviewPt(initialMarkdownPt)
    }
    if (!markdownPreviewEn && initialMarkdownEn) {
      setMarkdownPreviewEn(initialMarkdownEn)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMarkdownPt, initialMarkdownEn])

  // Fetch saved resumes when component mounts (if vagaId exists)
  useEffect(() => {
    async function fetchSavedResumes() {
      if (!vagaId) return

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("resumes")
          .select("language, markdown_content, pdf_url")
          .eq("job_id", vagaId)

        if (error) throw error

        // Load saved previews into state
        data?.forEach((resume) => {
          if (resume.language === "pt" && resume.markdown_content) {
            setMarkdownPreviewPt(resume.markdown_content)
            setIsPreviewSavedPt(true)
          } else if (resume.language === "en" && resume.markdown_content) {
            setMarkdownPreviewEn(resume.markdown_content)
            setIsPreviewSavedEn(true)
          }
        })

        console.log("[CurriculoTab] Loaded saved resumes:", data?.length || 0)
      } catch (error) {
        console.error("[CurriculoTab] Error fetching saved resumes:", error)
      }
    }

    if (vagaId) {
      fetchSavedResumes()
    }
  }, [vagaId])

  // 🔍 DEBUG: Monitor markdown state changes
  useEffect(() => {
    console.log("[CurriculoTab] 🔄 Markdown states changed:", {
      markdownPreviewPtLength: markdownPreviewPt?.length || 0,
      markdownPreviewEnLength: markdownPreviewEn?.length || 0,
      hasPT: Boolean(markdownPreviewPt),
      hasEN: Boolean(markdownPreviewEn),
      hasPreview,
    })
  }, [markdownPreviewPt, markdownPreviewEn, hasPreview])

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
        setHtmlSourcePt("") // clear stale HTML before regenerating

        const payload = {
          vagaId,
          jobDescription,
          language: "pt",
          approvedSkills: approvedSkills && approvedSkills.length > 0 ? approvedSkills : undefined,
          model: activeModel || undefined,
          resumeTemplate: localTemplate,
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

        // 🔍 DEBUG: Log FULL response body
        console.log("[CurriculoTab] 📦 PT Full Response Body:", JSON.stringify(result, null, 2))

        if (result.success && result.data?.html) {
          // Convert HTML to Markdown for better editing experience
          const markdown = htmlToMarkdown(result.data.html)
          generatedPt = markdown // Store in local variable

          // 🔍 DEBUG: Log markdown BEFORE setState
          console.log("[CurriculoTab] 📝 PT Markdown BEFORE setState:", {
            length: markdown.length,
            preview: markdown.substring(0, 150),
          })

          setMarkdownPreviewPt(markdown)
          setHtmlSourcePt(result.data.html) // preserve original HTML for PDF generation

          // 🔍 DEBUG: Log AFTER setState (will be async, but shows intent)
          console.log("[CurriculoTab] ✅ PT setMarkdownPreviewPt called with length:", markdown.length)

          // 🔍 DEBUG: Verify state update after a tick
          setTimeout(() => {
            console.log("[CurriculoTab] 🔄 PT State after setState (async check):", {
              markdownPreviewPtLength: markdownPreviewPt.length,
              generatedPtLength: generatedPt.length,
              stateMatchesGenerated: markdownPreviewPt === generatedPt,
            })
          }, 100)

          console.log("[CurriculoTab] ✅ PT preview generated and converted to Markdown")
        } else {
          throw new Error(result.error || "Failed to generate PT preview")
        }
      }

      // Generate EN preview
      if (language === "en" || language === "both") {
        console.log("[CurriculoTab] Generating EN preview...")
        setHtmlSourceEn("") // clear stale HTML before regenerating

        const payload = {
          vagaId,
          jobDescription,
          language: "en",
          approvedSkills: approvedSkills && approvedSkills.length > 0 ? approvedSkills : undefined,
          model: activeModel || undefined,
          resumeTemplate: localTemplate,
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

        // 🔍 DEBUG: Log FULL response body
        console.log("[CurriculoTab] 📦 EN Full Response Body:", JSON.stringify(result, null, 2))

        if (result.success && result.data?.html) {
          // Convert HTML to Markdown for better editing experience
          const markdown = htmlToMarkdown(result.data.html)
          generatedEn = markdown // Store in local variable

          // 🔍 DEBUG: Log markdown BEFORE setState
          console.log("[CurriculoTab] 📝 EN Markdown BEFORE setState:", {
            length: markdown.length,
            preview: markdown.substring(0, 150),
          })

          setMarkdownPreviewEn(markdown)
          setHtmlSourceEn(result.data.html) // preserve original HTML for PDF generation

          // 🔍 DEBUG: Log AFTER setState (will be async, but shows intent)
          console.log("[CurriculoTab] ✅ EN setMarkdownPreviewEn called with length:", markdown.length)

          // 🔍 DEBUG: Verify state update after a tick
          setTimeout(() => {
            console.log("[CurriculoTab] 🔄 EN State after setState (async check):", {
              markdownPreviewEnLength: markdownPreviewEn.length,
              generatedEnLength: generatedEn.length,
              stateMatchesGenerated: markdownPreviewEn === generatedEn,
            })
          }, 100)

          console.log("[CurriculoTab] ✅ EN preview generated and converted to Markdown")
        } else {
          throw new Error(result.error || "Failed to generate EN preview")
        }
      }

      // Auto-save generated previews to database (if vagaId exists)
      if (vagaId) {
        const savePromises = []

        if (generatedPt) {
          console.log("[CurriculoTab] Auto-saving PT preview to database...")
          const htmlContentPt = await markdownToHtml(generatedPt)
          savePromises.push(
            fetch(`/api/resumes/${vagaId}/save-preview`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                language: "pt",
                markdownContent: generatedPt,
                htmlContent: htmlContentPt,
              }),
            })
          )
        }

        if (generatedEn) {
          console.log("[CurriculoTab] Auto-saving EN preview to database...")
          const htmlContentEn = await markdownToHtml(generatedEn)
          savePromises.push(
            fetch(`/api/resumes/${vagaId}/save-preview`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                language: "en",
                markdownContent: generatedEn,
                htmlContent: htmlContentEn,
              }),
            })
          )
        }

        // Wait for all saves to complete
        const saveResults = await Promise.allSettled(savePromises)

        // Update saved states based on results
        saveResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            const savedLanguage = generatedPt && index === 0 ? "pt" : "en"
            if (savedLanguage === "pt") {
              setIsPreviewSavedPt(true)
            } else {
              setIsPreviewSavedEn(true)
            }
            console.log(`[CurriculoTab] ✅ ${savedLanguage.toUpperCase()} preview auto-saved to database`)
          } else {
            console.error("[CurriculoTab] Error auto-saving preview:", result.reason)
          }
        })
      }

      const message =
        language === "both"
          ? "2 previews gerados e salvos com sucesso!"
          : language === "pt"
            ? "Preview PT gerado e salvo com sucesso!"
            : "Preview EN gerado e salvo com sucesso!"
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

      // Use the original HTML from the API (has correct template CSS) when available.
      // Fall back to re-converting markdown only for backward compatibility.
      const htmlSource = language === "pt" ? htmlSourcePt : htmlSourceEn
      const fullHtml = htmlSource
        ? htmlSource
        : wrapMarkdownAsHTML(await markdownToHtml(markdownText))
      console.log(`[CurriculoTab] ${language.toUpperCase()} HTML ready for PDF (source: ${htmlSource ? "template" : "markdown"})`)

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

      <div className="space-y-2">
        <Label>Modelo Visual do Currículo</Label>
        <Select value={localTemplate} onValueChange={setLocalTemplate}>
          <SelectTrigger className="w-full bg-background border-border">
            <SelectValue placeholder="Selecione o modelo visual" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="modelo1">Manguizin</SelectItem>
            <SelectItem value="modelo2">Maryland</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Padrão definido em Configurações. Alteração aqui vale apenas para esta geração.
        </p>
      </div>

      <div className="space-y-3">
        <Label>Modelo LLM</Label>

        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
          <Bot className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1 truncate text-sm font-medium">{activeModel || "Selecione um modelo"}</span>
          <Badge variant="secondary">ativo</Badge>
        </div>

        {modelHistory.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Histórico de modelos:</p>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {modelHistory.map((model) => (
                <div
                  key={model}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                    model === activeModel
                      ? "cursor-default border-primary/30 bg-primary/10"
                      : "cursor-pointer border-border bg-muted/50 hover:border-primary/20 hover:bg-muted"
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 truncate text-left text-sm"
                    onClick={() => model !== activeModel && selectModel(model)}
                    disabled={model === activeModel || isGenerating}
                  >
                    {model}
                  </button>
                  {model !== activeModel && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        removeModelFromHistory(model)
                      }}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                      title="Remover do histórico"
                      disabled={isGenerating}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {showModelInput ? (
          <div className="flex gap-2">
            <Input
              value={newModelInput}
              onChange={(event) => setNewModelInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  handleAddNewModel()
                }
                if (event.key === "Escape") {
                  event.preventDefault()
                  setShowModelInput(false)
                  setNewModelInput("")
                }
              }}
              placeholder="Ex: x-ai/grok-4.1-fast"
              className="bg-background text-sm"
              disabled={isGenerating}
              autoFocus
            />
            <Button type="button" size="sm" onClick={handleAddNewModel} disabled={!newModelInput.trim() || isGenerating}>
              Usar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowModelInput(false)
                setNewModelInput("")
              }}
              disabled={isGenerating}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowModelInput(true)}
            disabled={isGenerating}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar modelo diferente
          </Button>
        )}
      </div>

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

      {/* Save vaga button - only in dialog context */}
      {!isInPage && onSaveVaga && (
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
      )}
    </div>
  )
}
