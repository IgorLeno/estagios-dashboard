"use client"

import { useState, useEffect } from "react"
import {
  Loader2,
  FileText,
  Pencil,
  Trash2,
  FileDown,
  Download,
  Wand2,
  RefreshCw,
  ChevronDown,
  Layers,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MarkdownPreview } from "@/components/ui/markdown-preview"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RegenerateResumeDialog } from "@/components/regenerate-resume-dialog"

const TEMPLATES = [
  { value: "modelo1", label: "Manguizin" },
  { value: "modelo2", label: "Maryland" },
]

interface ResumeContainerProps {
  language: "pt" | "en"
  markdown?: string
  pdfUrl?: string | null
  isGenerating: boolean
  isGeneratingPdf?: boolean
  isRefining?: boolean
  activeModel: string
  activeTemplate: string
  vagaEmpresa: string
  vagaId: string
  onRegenerateContent: (model: string) => void
  onTemplateChange: (template: string) => void
  onGeneratePdf?: () => void
  onGeneratePdfWithHtml?: (htmlSource: string) => void
  onDownloadPdf?: () => void
  onRefine?: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ResumeContainer({
  language,
  markdown,
  pdfUrl,
  isGenerating,
  isGeneratingPdf,
  isRefining,
  activeModel,
  activeTemplate,
  vagaEmpresa,
  vagaId,
  onRegenerateContent,
  onTemplateChange,
  onGeneratePdf,
  onGeneratePdfWithHtml,
  onDownloadPdf,
  onRefine,
  onEdit,
  onDelete,
}: ResumeContainerProps) {
  const hasContent = Boolean(markdown)
  const [regenerateMode, setRegenerateMode] = useState<"content" | null>(null)

  const [localTemplate, setLocalTemplate] = useState(activeTemplate)
  const [templateHtml, setTemplateHtml] = useState<string | null>(null)
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false)

  // Sync localTemplate when activeTemplate changes externally
  useEffect(() => {
    setLocalTemplate(activeTemplate)
  }, [activeTemplate])

  useEffect(() => {
    if (!hasContent) {
      setTemplateHtml(null)
      return
    }

    let isCancelled = false

    async function loadTemplateHtml() {
      setIsLoadingTemplate(true)

      try {
        const response = await fetch("/api/ai/render-resume-html", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vagaId,
            language,
            resumeTemplate: localTemplate,
          }),
        })

        if (!response.ok) {
          throw new Error("Falha ao carregar preview do currículo")
        }

        const result = await response.json()

        if (!isCancelled && result.success && result.data?.html) {
          setTemplateHtml(result.data.html)
        }
      } catch (err) {
        console.error("[ResumeContainer] Erro ao carregar preview HTML:", err)
        if (!isCancelled) {
          setTemplateHtml(null)
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingTemplate(false)
        }
      }
    }

    loadTemplateHtml()

    return () => {
      isCancelled = true
    }
  }, [hasContent, vagaId, language, localTemplate, markdown])

  const templateLabel = TEMPLATES.find((t) => t.value === localTemplate)?.label ?? localTemplate

  async function handleSelectTemplate(template: string) {
    if (template === localTemplate) return
    setLocalTemplate(template)
    onTemplateChange(template)
  }

  const languageConfig = {
    pt: {
      flag: "🇧🇷",
      title: "Currículo Personalizado",
      generateLabel: hasContent ? "Regenerar" : "Gerar",
      editLabel: "Editar",
      generatePdfLabel: "Gerar PDF",
      downloadLabel: "Baixar",
      refineLabel: "Refinar",
      deleteLabel: "Excluir",
      emptyMessage: "Currículo ainda não foi gerado",
      generatingLabel: "Gerando...",
      generatingPdfLabel: "Gerando PDF...",
      refiningLabel: "Refinando...",
    },
    en: {
      flag: "🇺🇸",
      title: "Personalized Resume",
      generateLabel: hasContent ? "Regenerate" : "Generate",
      editLabel: "Edit",
      generatePdfLabel: "Generate PDF",
      downloadLabel: "Download",
      refineLabel: "Refine",
      deleteLabel: "Delete",
      emptyMessage: "Resume has not been generated yet",
      generatingLabel: "Generating...",
      generatingPdfLabel: "Generating PDF...",
      refiningLabel: "Refining...",
    },
  }

  const config = languageConfig[language]

  return (
    <div className="border rounded-lg bg-white dark:bg-slate-900 shadow-sm">
      {/* HEADER: Título + Botões */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.flag}</span>
          <h3 className="text-lg font-semibold">{config.title}</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Gerar / Regenerar — simples, sem dropdown */}
          <button
            onClick={() => setRegenerateMode("content")}
            disabled={isGenerating}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium",
              "bg-blue-600 text-white hover:bg-blue-700",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                {config.generatingLabel}
              </>
            ) : hasContent ? (
              <>
                <RefreshCw size={16} />
                {config.generateLabel}
              </>
            ) : (
              <>
                <FileText size={16} />
                {config.generateLabel}
              </>
            )}
          </button>

          {/* Botão de template — visível apenas quando há conteúdo */}
          {hasContent && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  disabled={isLoadingTemplate}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium",
                    "border border-gray-300 dark:border-gray-600",
                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-colors"
                  )}
                >
                  {isLoadingTemplate ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Layers size={16} />
                  )}
                  {templateLabel}
                  <ChevronDown size={14} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 p-2">
                <div className="space-y-1">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => handleSelectTemplate(t.value)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm",
                        "hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                        localTemplate === t.value && "bg-primary/10 font-semibold text-primary"
                      )}
                    >
                      {t.label}
                      {localTemplate === t.value && <CheckCircle2 size={14} />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Botão Editar */}
          <button
            onClick={onEdit}
            disabled={!hasContent}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium",
              "border border-gray-300 dark:border-gray-600",
              "hover:bg-gray-100 dark:hover:bg-gray-800",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors"
            )}
          >
            <Pencil size={16} />
            {config.editLabel}
          </button>

          {/* Botão Gerar PDF */}
          {hasContent && (
            <button
              onClick={() => {
                if (templateHtml && onGeneratePdfWithHtml) {
                  onGeneratePdfWithHtml(templateHtml)
                } else {
                  onGeneratePdf?.()
                }
              }}
              disabled={isGeneratingPdf || isGenerating}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium",
                "border border-gray-300 dark:border-gray-600",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors"
              )}
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  {config.generatingPdfLabel}
                </>
              ) : (
                <>
                  <FileDown size={16} />
                  {config.generatePdfLabel}
                </>
              )}
            </button>
          )}

          {/* Botão Baixar */}
          {pdfUrl && (
            <button
              onClick={onDownloadPdf}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium",
                "border border-gray-300 dark:border-gray-600",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                "transition-colors"
              )}
            >
              <Download size={16} />
              {config.downloadLabel}
            </button>
          )}

          {/* Botão Refinar */}
          {hasContent && onRefine && (
            <button
              onClick={onRefine}
              disabled={Boolean(isRefining) || isGenerating}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium",
                "border border-violet-300 dark:border-violet-600 text-violet-700 dark:text-violet-300",
                "hover:bg-violet-50 dark:hover:bg-violet-950/30",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors"
              )}
            >
              {isRefining ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  {config.refiningLabel}
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  {config.refineLabel}
                </>
              )}
            </button>
          )}

          {/* Botão Excluir */}
          <button
            onClick={onDelete}
            disabled={!hasContent}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium",
              "border border-red-300 dark:border-red-600 text-red-600",
              "hover:bg-red-50 dark:hover:bg-red-900/20",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors"
            )}
          >
            <Trash2 size={16} />
            {config.deleteLabel}
          </button>
        </div>
      </div>

      {/* PREVIEW */}
      <div
        className={cn(
          "px-6 py-4",
          hasContent ? "max-h-[500px] overflow-y-auto" : ""
        )}
      >
        {hasContent ? (
          templateHtml ? (
            <div className="w-full overflow-auto bg-white rounded" style={{ maxHeight: "500px" }}>
              <iframe
                srcDoc={templateHtml}
                title="Resume Preview"
                className="w-full border-0"
                style={{ height: "1120px", pointerEvents: "none" }}
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownPreview content={markdown!} editable={false} />
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <FileText size={48} className="mb-4" />
            <p className="text-sm">{config.emptyMessage}</p>
          </div>
        )}
      </div>

      <RegenerateResumeDialog
        open={regenerateMode !== null}
        onOpenChange={(open) => {
          if (!open) setRegenerateMode(null)
        }}
        mode="content"
        language={language}
        vagaEmpresa={vagaEmpresa}
        activeModel={activeModel}
        activeTemplate={localTemplate}
        isRegenerating={isGenerating}
        onConfirm={({ model }) => {
          setRegenerateMode(null)
          if (model) onRegenerateContent(model)
        }}
      />
    </div>
  )
}
