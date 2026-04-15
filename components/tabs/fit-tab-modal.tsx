"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Sparkles, RotateCcw, ChevronRight, Info } from "lucide-react"
import { MarkdownPreview } from "@/components/ui/markdown-preview"
import { RefineResumeDialog } from "@/components/refine-resume-dialog"
import { FitToneSelector } from "@/components/tabs/fit-tone-selector"
import { toast } from "sonner"
import type { JobDetails, FitToneOptions } from "@/lib/ai/types"
import { DEFAULT_FIT_TONE_OPTIONS } from "@/lib/ai/types"

export interface FitTabModalProps {
  jobDescription: string
  jobAnalysisData: JobDetails | null
  language: "pt" | "en"
  activeModel: string
  onFitGenerated: (markdown: string) => void
  onContinueToCurriculo: () => void
}

export function FitTabModal({
  jobDescription,
  jobAnalysisData,
  language,
  activeModel,
  onFitGenerated,
  onContinueToCurriculo,
}: FitTabModalProps) {
  const [toneOptions, setToneOptions] = useState<FitToneOptions>({ ...DEFAULT_FIT_TONE_OPTIONS })
  const [fitMarkdown, setFitMarkdown] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [refineDialogOpen, setRefineDialogOpen] = useState(false)

  async function handleGenerate() {
    if (!jobAnalysisData && !jobDescription) return
    setIsGenerating(true)

    try {
      const response = await fetch("/api/ai/generate-fit-markdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          jobAnalysisData,
          language,
          toneOptions,
          model: activeModel || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Erro ao gerar fit: ${response.status}`)
      }

      const markdown: string = result.data.markdown
      setFitMarkdown(markdown)
      onFitGenerated(markdown)
      toast.success("Fit gerado com sucesso!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao gerar fit"
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleRefine(instructions: string, model: string) {
    if (!fitMarkdown) return
    setIsRefining(true)

    try {
      const response = await fetch("/api/ai/refine-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fitMarkdown,
          language,
          instructions,
          model,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Erro ao refinar: ${response.status}`)
      }

      const refined: string = result.data.markdown
      setFitMarkdown(refined)
      onFitGenerated(refined)
      setRefineDialogOpen(false)
      toast.success("Fit refinado com sucesso!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao refinar"
      toast.error(message)
    } finally {
      setIsRefining(false)
    }
  }

  function handleContinue() {
    if (fitMarkdown) {
      onFitGenerated(fitMarkdown)
    }
    onContinueToCurriculo()
  }

  const hasFit = Boolean(fitMarkdown?.trim())
  const canGenerate = Boolean(jobAnalysisData || jobDescription?.trim())

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Fit para Currículo</h3>
        <p className="text-sm text-muted-foreground">
          Configure as opções de escrita e gere as 4 seções personalizadas (Perfil, Competências, Projetos,
          Certificações) para esta vaga.
        </p>
      </div>

      {/* Alert if no job data */}
      {!canGenerate && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Análise da vaga necessária</AlertTitle>
          <AlertDescription>Analise a vaga na aba Dados da Vaga primeiro.</AlertDescription>
        </Alert>
      )}

      {/* Section 1: Tone Options */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Opções de Escrita</h4>
        <FitToneSelector value={toneOptions} onChange={setToneOptions} />
      </div>

      {/* Section 2: Generate button */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          variant={hasFit ? "outline" : "default"}
          size="sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando fit...
            </>
          ) : hasFit ? (
            <>
              <RotateCcw className="h-4 w-4 mr-2" />
              Refazer Fit
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar Fit
            </>
          )}
        </Button>
      </div>

      {/* Section 3: Result */}
      {hasFit && (
        <div className="space-y-3">
          <MarkdownPreview
            content={fitMarkdown!}
            editable={true}
            onChange={(val) => {
              setFitMarkdown(val)
            }}
            className="min-h-[300px]"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRefineDialogOpen(true)}
              disabled={isRefining}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Refinar
            </Button>

            <Button size="sm" onClick={handleContinue}>
              Continuar para Currículo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      <RefineResumeDialog
        language={language}
        open={refineDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isRefining) setRefineDialogOpen(false)
        }}
        isRefining={isRefining}
        onConfirm={handleRefine}
        activeModel={activeModel}
      />
    </div>
  )
}
