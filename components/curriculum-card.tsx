"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Edit2, Trash2, RefreshCw } from "lucide-react"
import { MarkdownPreview } from "@/components/ui/markdown-preview"

interface CurriculumCardProps {
  title: string
  language: "pt" | "en"
  markdownContent: string | null
  pdfUrl?: string | null
  onGenerate: (language: "pt" | "en") => void
  onEdit?: (language: "pt" | "en") => void
  onDownload: (language: "pt" | "en") => void
  onDelete?: (language: "pt" | "en") => void
  isGenerating?: boolean
}

export function CurriculumCard({
  title,
  language,
  markdownContent,
  pdfUrl,
  onGenerate,
  onEdit,
  onDownload,
  onDelete,
  isGenerating = false,
}: CurriculumCardProps) {
  const hasContent = markdownContent || pdfUrl

  const buttonLabels = {
    generate: language === "pt" ? "Gerar" : "Generate",
    regenerate: language === "pt" ? "Regenerar" : "Regenerate",
    edit: language === "pt" ? "Editar" : "Edit",
    download: language === "pt" ? "Baixar" : "Download",
    delete: language === "pt" ? "Excluir" : "Delete",
    generating: language === "pt" ? "Gerando..." : "Generating...",
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {language === "pt" ? "🇧🇷" : "🇺🇸"} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Preview do markdown */}
        {markdownContent && (
          <div className="mb-4">
            <MarkdownPreview content={markdownContent} editable={false} className="max-h-[400px]" />
          </div>
        )}

        {/* PDF Info */}
        {pdfUrl && (
          <div className="mb-4 flex items-center gap-2 bg-slate-50 p-3 rounded border">
            <FileText className="h-5 w-5 text-slate-400 flex-shrink-0" />
            <span className="flex-1 font-mono text-sm">
              {language === "pt" ? "curriculo-pt.pdf" : "curriculo-en.pdf"}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          {/* Gerar/Regenerar */}
          <Button
            size="sm"
            variant={hasContent ? "outline" : "default"}
            onClick={() => onGenerate(language)}
            disabled={isGenerating}
            className="flex-1 min-w-[100px]"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
            {isGenerating ? buttonLabels.generating : hasContent ? buttonLabels.regenerate : buttonLabels.generate}
          </Button>

          {/* Editar */}
          {onEdit && hasContent && (
            <Button size="sm" variant="outline" onClick={() => onEdit(language)} className="flex-1 min-w-[100px]">
              <Edit2 className="h-4 w-4 mr-2" />
              {buttonLabels.edit}
            </Button>
          )}

          {/* Baixar */}
          {pdfUrl && (
            <Button size="sm" variant="outline" onClick={() => onDownload(language)} className="flex-1 min-w-[100px]">
              <Download className="h-4 w-4 mr-2" />
              {buttonLabels.download}
            </Button>
          )}

          {/* Excluir */}
          {onDelete && hasContent && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(language)}
              className="flex-1 min-w-[100px] text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {buttonLabels.delete}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
