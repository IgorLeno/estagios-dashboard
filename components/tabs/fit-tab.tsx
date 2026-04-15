"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Sparkles, Info, CheckCircle, Save } from "lucide-react"
import { MarkdownPreview } from "@/components/ui/markdown-preview"
import { RefineResumeDialog } from "@/components/refine-resume-dialog"
import { toast } from "sonner"
import type { JobDetails } from "@/lib/ai/types"

export interface FitTabProps {
  vagaId: string
  language: "pt" | "en"
  jobAnalysisData: JobDetails | null
  currentMarkdown: string | null
  onFitGenerated: () => void
  activeModel: string
}

export function FitTab({
  vagaId,
  language,
  jobAnalysisData,
  currentMarkdown,
  onFitGenerated,
  activeModel,
}: FitTabProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [localMarkdown, setLocalMarkdown] = useState<string | null>(currentMarkdown)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [refineOpen, setRefineOpen] = useState(false)

  // Sync local markdown when parent reloads after generation, save, or refinement
  useEffect(() => {
    setLocalMarkdown(currentMarkdown)
  }, [currentMarkdown])

  async function handleGenerateFit() {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/ai/generate-fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vagaId, language, model: activeModel || undefined }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Erro ao gerar fit: ${response.status}`)
      }

      // Update local state immediately for a responsive UI,
      // then also trigger the parent reload to keep the vaga record in sync.
      setLocalMarkdown(result.data.markdown)
      onFitGenerated()
      toast.success("Fit gerado com sucesso!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao gerar fit"
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSaveEdits() {
    if (!localMarkdown) return
    setIsSaving(true)
    try {
      const response = await fetch(`/api/vagas/${vagaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [`curriculo_text_${language}`]: localMarkdown,
          [`arquivo_cv_url_${language}`]: null,
        }),
      })

      if (!response.ok) throw new Error("Falha ao salvar edições")

      onFitGenerated()
      toast.success("Edições salvas. PDF invalidado — gere novamente para baixar.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRefine(instructions: string, model: string) {
    setIsRefining(true)
    try {
      const response = await fetch("/api/ai/refine-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vagaId, language, instructions, model }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Erro ao refinar: ${response.status}`)
      }

      setRefineOpen(false)
      onFitGenerated()
      toast.success("Fit refinado com sucesso! PDF invalidado — gere novamente para baixar.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao refinar"
      toast.error(message)
    } finally {
      setIsRefining(false)
    }
  }

  const hasFit = Boolean(localMarkdown?.trim())
  // Only enable "Salvar edições" when the user has actually changed something locally
  const hasLocalChanges = localMarkdown !== currentMarkdown

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Fit para Currículo</h3>
        <p className="text-sm text-muted-foreground">
          A IA adapta o perfil profissional, competências e projetos do seu currículo geral para esta vaga em um único
          clique.
        </p>
      </div>

      {!jobAnalysisData && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Análise da vaga necessária</AlertTitle>
          <AlertDescription>
            Verifique se a vaga possui informações de cargo e requisitos antes de gerar o fit.
          </AlertDescription>
        </Alert>
      )}

      {/* Primary action button */}
      <Button
        onClick={handleGenerateFit}
        disabled={!jobAnalysisData || isGenerating}
        variant={hasFit ? "outline" : "default"}
        size="sm"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Gerando fit...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            {hasFit ? "Regenerar Fit" : "Gerar Fit"}
          </>
        )}
      </Button>

      {/* Editable markdown and secondary actions */}
      {hasFit && (
        <div className="space-y-3">
          <MarkdownPreview
            content={localMarkdown!}
            editable={true}
            onChange={(value) => setLocalMarkdown(value)}
            className="min-h-[300px]"
          />

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={handleSaveEdits} disabled={isSaving || !hasLocalChanges}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar edições
                </>
              )}
            </Button>

            <Button size="sm" variant="outline" onClick={() => setRefineOpen(true)} disabled={isRefining}>
              <Sparkles className="h-4 w-4 mr-2" />
              Refinar
            </Button>
          </div>
        </div>
      )}

      {/* Success indicator */}
      {hasFit && !isGenerating && (
        <Alert className="border-green-500/25 bg-green-500/5">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>Fit gerado</AlertTitle>
          <AlertDescription>Vá para a seção de Currículos Personalizados para gerar o PDF.</AlertDescription>
        </Alert>
      )}

      <RefineResumeDialog
        language={language}
        open={refineOpen}
        onOpenChange={(open) => {
          if (!open && !isRefining) setRefineOpen(false)
        }}
        isRefining={isRefining}
        onConfirm={handleRefine}
        activeModel={activeModel}
      />
    </div>
  )
}
