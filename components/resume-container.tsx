"use client"

import { Loader2, FileText, Pencil, Trash2, FileDown, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { MarkdownPreview } from "@/components/ui/markdown-preview"

interface ResumeContainerProps {
  language: "pt" | "en"
  markdown?: string
  pdfUrl?: string | null
  isGenerating: boolean
  isGeneratingPdf?: boolean
  onGenerate: () => void
  onGeneratePdf?: () => void
  onDownloadPdf?: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ResumeContainer({
  language,
  markdown,
  pdfUrl,
  isGenerating,
  isGeneratingPdf,
  onGenerate,
  onGeneratePdf,
  onDownloadPdf,
  onEdit,
  onDelete,
}: ResumeContainerProps) {
  const hasContent = Boolean(markdown)

  const languageConfig = {
    pt: {
      flag: "🇧🇷",
      title: "Currículo Personalizado",
      generateLabel: hasContent ? "Regenerar" : "Gerar",
      editLabel: "Editar",
      generatePdfLabel: "Gerar PDF",
      downloadLabel: "Baixar",
      deleteLabel: "Excluir",
      emptyMessage: "Currículo ainda não foi gerado",
      generatingLabel: "Gerando...",
      generatingPdfLabel: "Gerando PDF...",
    },
    en: {
      flag: "🇺🇸",
      title: "Personalized Resume",
      generateLabel: hasContent ? "Regenerate" : "Generate",
      editLabel: "Edit",
      generatePdfLabel: "Generate PDF",
      downloadLabel: "Download",
      deleteLabel: "Delete",
      emptyMessage: "Resume has not been generated yet",
      generatingLabel: "Generating...",
      generatingPdfLabel: "Generating PDF...",
    },
  }

  const config = languageConfig[language]

  return (
    <div className="border rounded-lg bg-white dark:bg-slate-900 shadow-sm">
      {/* ✅ HEADER: Título + Botões (mesma linha, SEM SCROLL) */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.flag}</span>
          <h3 className="text-lg font-semibold">{config.title}</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Gerar/Regenerar */}
          <button
            onClick={onGenerate}
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

      {/* ✅ PREVIEW: Scroll APENAS aqui */}
      <div
        className={cn(
          "px-6 py-4",
          hasContent ? "max-h-[500px] overflow-y-auto" : "" // ✅ CRÍTICO: Scroll apenas no preview
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
    </div>
  )
}
