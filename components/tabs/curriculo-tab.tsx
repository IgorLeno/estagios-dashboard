"use client"

import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, RotateCcw, Download, CheckCircle, FileText } from "lucide-react"
import type { JobDetails } from "@/lib/ai/types"

interface CurriculoTabProps {
  resumeContent: string
  setResumeContent: (value: string) => void
  resumePdfBase64: string | null
  resumeFilename: string | null
  jobAnalysisData: JobDetails | null
  generatingResume: boolean
  savingVaga: boolean
  onGenerateResume: () => Promise<void>
  onRefreshResume: () => Promise<void>
  onDownloadPDF: () => void
  onSaveVaga: () => Promise<void>
}

export function CurriculoTab({
  resumePdfBase64,
  resumeFilename,
  jobAnalysisData,
  generatingResume,
  savingVaga,
  onGenerateResume,
  onRefreshResume,
  onDownloadPDF,
  onSaveVaga,
}: CurriculoTabProps) {
  return (
    <div className="space-y-4">
      {/* Resume preview section */}
      {resumePdfBase64 ? (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-slate-700">Currículo Personalizado</h3>
              <p className="text-xs text-slate-500 mt-1">PDF gerado e pronto para download</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-white p-3 rounded border border-slate-200">
            <FileText className="h-5 w-5 text-slate-400" />
            <span className="font-mono flex-1">{resumeFilename}</span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 p-8 rounded-lg border border-dashed border-slate-300 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Clique em "Gerar Currículo" para criar uma prévia personalizada</p>
        </div>
      )}

      {/* Action buttons grid */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={onGenerateResume}
          disabled={!jobAnalysisData || generatingResume}
          className="col-span-1"
          variant={jobAnalysisData && !generatingResume ? "default" : "outline"}
        >
          {generatingResume ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Currículo
            </>
          )}
        </Button>

        <Button
          onClick={onRefreshResume}
          disabled={!resumePdfBase64 || generatingResume}
          variant="outline"
          className="col-span-1"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Refazer
        </Button>

        <Button onClick={onDownloadPDF} disabled={!resumePdfBase64} variant="outline" className="col-span-1">
          <Download className="mr-2 h-4 w-4" />
          Baixar PDF
        </Button>
      </div>

      {/* Save vaga button - full width, different styling */}
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
