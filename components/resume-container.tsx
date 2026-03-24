"use client"

import { useState } from "react"
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
  Bot,
  Layers,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MarkdownPreview } from "@/components/ui/markdown-preview"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RegenerateResumeDialog } from "@/components/regenerate-resume-dialog"

interface ResumeContainerProps {
  language: "pt" | "en"
  markdown?: string
  pdfUrl?: string | null
  isGenerating: boolean
  isGeneratingPdf?: boolean
  isRefining?: boolean
  isRegeneratingVisual?: boolean
  activeModel: string
  activeTemplate: string
  vagaEmpresa: string
  onRegenerateContent: (model: string) => void
  onRegenerateVisual: (template: string) => void
  onRegenerateBoth: (model: string, template: string) => void
  onGeneratePdf?: () => void
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
  isRegeneratingVisual,
  activeModel,
  activeTemplate,
  vagaEmpresa,
  onRegenerateContent,
  onRegenerateVisual,
  onRegenerateBoth,
  onGeneratePdf,
  onDownloadPdf,
  onRefine,
  onEdit,
  onDelete,
}: ResumeContainerProps) {
  const hasContent = Boolean(markdown)
  const [regenerateMode, setRegenerateMode] = useState<"content" | "visual" | "both" | null>(null)

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
      contentOnly: "Só Conteúdo (IA)",
      visualOnly: "Só Visual (Template)",
      contentAndVisual: "Conteúdo + Visual",
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
      contentOnly: "Content Only (AI)",
      visualOnly: "Visual Only (Template)",
      contentAndVisual: "Content + Visual",
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
          {/* Botão Gerar (sem conteúdo) ou Dropdown Regenerar (com conteúdo) */}
          {!hasContent ? (
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
              ) : (
                <>
                  <FileText size={16} />
                  {config.generateLabel}
                </>
              )}
            </button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
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
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      {config.generateLabel}
                      <ChevronDown size={14} className="ml-1" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setRegenerateMode("content")}>
                  <Bot size={16} className="mr-2" />
                  {config.contentOnly}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRegenerateMode("visual")}>
                  <Layers size={16} className="mr-2" />
                  {config.visualOnly}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setRegenerateMode("both")}>
                  <Sparkles size={16} className="mr-2" />
                  {config.contentAndVisual}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              onClick={onGeneratePdf}
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

      {/* PREVIEW: Scroll apenas aqui */}
      <div
        className={cn(
          "px-6 py-4",
          hasContent ? "max-h-[500px] overflow-y-auto" : ""
        )}
      >
        {hasContent ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MarkdownPreview content={markdown!} editable={false} />
          </div>
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
        mode={regenerateMode ?? "content"}
        language={language}
        vagaEmpresa={vagaEmpresa}
        activeModel={activeModel}
        activeTemplate={activeTemplate}
        isRegenerating={isGenerating || Boolean(isRegeneratingVisual)}
        onConfirm={({ model, template }) => {
          const currentMode = regenerateMode
          setRegenerateMode(null)
          if (currentMode === "content" && model) {
            onRegenerateContent(model)
          } else if (currentMode === "visual" && template) {
            onRegenerateVisual(template)
          } else if (currentMode === "both" && model && template) {
            onRegenerateBoth(model, template)
          }
        }}
      />
    </div>
  )
}
