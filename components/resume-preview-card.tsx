"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RefreshCw, Save, FileText, Download, Check } from "lucide-react"

interface ResumePreviewCardProps {
  language: "pt" | "en"
  markdownContent: string
  pdfUrl?: string | null
  isGenerated: boolean
  isPreviewSaved?: boolean
  onRegenerate: () => void
  onSavePreview: () => void
  onGeneratePDF: () => void
  onDownload: () => void
  onMarkdownChange?: (markdown: string) => void
  isRegenerating?: boolean
  isSaving?: boolean
  isGeneratingPDF?: boolean
  showSavePreview?: boolean
}

export function ResumePreviewCard({
  language,
  markdownContent,
  pdfUrl,
  isGenerated,
  isPreviewSaved = false,
  onRegenerate,
  onSavePreview,
  onGeneratePDF,
  onDownload,
  onMarkdownChange,
  isRegenerating = false,
  isSaving = false,
  isGeneratingPDF = false,
  showSavePreview = true,
}: ResumePreviewCardProps) {
  const labels = {
    pt: {
      title: "🇧🇷 Preview do Currículo - Português",
      regenerate: "Regenerar",
      save: "Salvar Preview",
      saved: "Preview Salvo",
      generatePDF: "Gerar PDF",
      download: "Baixar",
      placeholder: "Currículo em Markdown (português)...",
    },
    en: {
      title: "🇺🇸 Preview do Currículo - English",
      regenerate: "Regenerate",
      save: "Save Preview",
      saved: "Preview Saved",
      generatePDF: "Generate PDF",
      download: "Download",
      placeholder: "Resume in Markdown (English)...",
    },
  }

  const t = labels[language]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t.title}</CardTitle>
      </CardHeader>

      <CardContent>
        {/* Markdown Preview/Editor */}
        <div className="mb-4">
          <Textarea
            value={markdownContent}
            onChange={(e) => onMarkdownChange?.(e.target.value)}
            rows={20}
            className="w-full p-4 bg-white border border-gray-200 rounded-lg font-mono text-xs resize-none overflow-auto whitespace-pre-wrap break-words"
            placeholder={t.placeholder}
            readOnly={!onMarkdownChange}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Regenerar */}
          <Button variant="outline" onClick={onRegenerate} disabled={!isGenerated || isRegenerating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
            {isRegenerating ? (language === "pt" ? "Regenerando..." : "Regenerating...") : t.regenerate}
          </Button>

          {/* Salvar Preview */}
          {showSavePreview && (
            <Button
              variant={isPreviewSaved ? "outline" : "default"}
              onClick={onSavePreview}
              disabled={!isGenerated || isPreviewSaved || isSaving}
            >
              {isPreviewSaved ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t.saved}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? (language === "pt" ? "Salvando..." : "Saving...") : t.save}
                </>
              )}
            </Button>
          )}

          {/* Gerar PDF */}
          <Button variant="outline" onClick={onGeneratePDF} disabled={!isGenerated || isGeneratingPDF}>
            <FileText className="h-4 w-4 mr-2" />
            {isGeneratingPDF ? (language === "pt" ? "Gerando..." : "Generating...") : t.generatePDF}
          </Button>

          {/* Baixar */}
          <Button onClick={onDownload} disabled={!pdfUrl}>
            <Download className="h-4 w-4 mr-2" />
            {t.download}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
