"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download } from "lucide-react"
import { MarkdownPreview } from "@/components/ui/markdown-preview"

interface CurriculumCardProps {
  title: string
  language: "pt" | "en"
  markdownContent: string | null
  pdfUrl?: string | null
  onGeneratePDF: (language: "pt" | "en") => void
  isGenerating?: boolean
}

export function CurriculumCard({
  title,
  language,
  markdownContent,
  pdfUrl,
  onGeneratePDF,
  isGenerating = false,
}: CurriculumCardProps) {
  const handleDownload = () => {
    if (!pdfUrl) return

    // Se for data URL (base64)
    if (pdfUrl.startsWith("data:")) {
      const link = document.createElement("a")
      link.href = pdfUrl
      link.download = `curriculo-${language}.pdf`
      link.click()
    } else {
      // Se for URL externa
      window.open(pdfUrl, "_blank")
    }
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

        {/* Seção de PDFs Gerados - MESMO ESTILO de curriculo-tab.tsx */}
        <div className="space-y-2 pt-4 border-t">
          {pdfUrl ? (
            // PDF existe - mostrar card de download (MESMO ESTILO da referência)
            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded border">
              <FileText className="h-5 w-5 text-slate-400 flex-shrink-0" />
              <span className="flex-1 font-mono text-sm">
                {language === "pt" ? "curriculo-pt.pdf" : "curriculo-en.pdf"}
              </span>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            // PDF não existe - mostrar botão de gerar
            <Button onClick={() => onGeneratePDF(language)} disabled={isGenerating} className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              {isGenerating
                ? language === "pt"
                  ? "Gerando..."
                  : "Generating..."
                : language === "pt"
                  ? "Gerar PDF"
                  : "Generate PDF"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
