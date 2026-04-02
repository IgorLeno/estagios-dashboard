"use client"

import { useEffect, useState } from "react"
import { Download, Eye, FileText, Loader2, Pencil, Trash2, Wand2 } from "lucide-react"
import type { CandidateProfile, VagaEstagio } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { RefineResumeDialog } from "@/components/refine-resume-dialog"
import { toast } from "sonner"
import { downloadPdf } from "@/lib/url-utils"
import {
  buildCandidateEducationSummary,
  buildCandidateExperienceSummary,
  buildCoverLetterFilename,
  renderCoverLetterHtml,
  type CoverLetterLanguage,
} from "@/lib/ai/cover-letter"

type CoverLetterStatus = "idle" | "loading" | "generated" | "error"

interface CoverLetterDocumentState {
  status: CoverLetterStatus
  content: string
  error: string | null
  pdfDataUri: string | null
}

interface CoverLetterSectionProps {
  vagaData: VagaEstagio
  candidateData: CandidateProfile | null
  profileText?: string
  curriculos: {
    pt?: string | null
    en?: string | null
  }
  activeModel?: string
}

const INITIAL_DOCUMENT_STATE: CoverLetterDocumentState = {
  status: "idle",
  content: "",
  error: null,
  pdfDataUri: null,
}

function buildPersistedDocumentState(content?: string | null): CoverLetterDocumentState {
  const normalizedContent = content?.trim() || ""

  if (!normalizedContent) {
    return INITIAL_DOCUMENT_STATE
  }

  return {
    status: "generated",
    content: normalizedContent,
    error: null,
    pdfDataUri: null,
  }
}

function getWordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length
}

function openPdfPreview(dataUri: string): boolean {
  try {
    const [meta, base64] = dataUri.split(",")
    if (!meta || !base64) return false

    const mimeType = /data:(.*?);base64/.exec(meta)?.[1] || "application/pdf"
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    const blob = new Blob([bytes], { type: mimeType })
    const blobUrl = URL.createObjectURL(blob)

    const previewWindow = window.open(blobUrl, "_blank", "noopener,noreferrer")
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)

    return previewWindow !== null
  } catch (error) {
    console.error("[CoverLetterSection] Failed to preview PDF:", error)
    return false
  }
}

export function CoverLetterSection({
  vagaData,
  candidateData,
  profileText,
  curriculos,
  activeModel,
}: CoverLetterSectionProps) {
  const defaultLanguage: CoverLetterLanguage = curriculos.pt?.trim() ? "pt" : "en"
  const [selectedLanguage, setSelectedLanguage] = useState<CoverLetterLanguage>(defaultLanguage)
  const [documents, setDocuments] = useState<Record<CoverLetterLanguage, CoverLetterDocumentState>>({
    pt: buildPersistedDocumentState(vagaData.carta_apresentacao_text_pt),
    en: buildPersistedDocumentState(vagaData.carta_apresentacao_text_en),
  })
  const [editorOpen, setEditorOpen] = useState(false)
  const [editText, setEditText] = useState("")
  const [isPdfBusy, setIsPdfBusy] = useState<"preview" | "download" | null>(null)
  const [isRefining, setIsRefining] = useState<CoverLetterLanguage | null>(null)
  const [refineDialogOpen, setRefineDialogOpen] = useState(false)

  useEffect(() => {
    if (selectedLanguage === "pt" && !curriculos.pt?.trim() && curriculos.en?.trim()) {
      setSelectedLanguage("en")
    }
    if (selectedLanguage === "en" && !curriculos.en?.trim() && curriculos.pt?.trim()) {
      setSelectedLanguage("pt")
    }
  }, [curriculos.en, curriculos.pt, selectedLanguage])

  const currentDocument = documents[selectedLanguage]
  const currentResume = selectedLanguage === "pt" ? curriculos.pt : curriculos.en
  const hasGeneratedLetter = currentDocument.status === "generated" && currentDocument.content.trim().length > 0

  const previewHtml = hasGeneratedLetter
    ? renderCoverLetterHtml({
        candidateName: candidateData?.nome?.trim() || (selectedLanguage === "pt" ? "Candidato" : "Candidate"),
        companyName: vagaData.empresa,
        jobTitle: vagaData.cargo,
        letterContent: currentDocument.content,
        language: selectedLanguage,
        location:
          selectedLanguage === "pt"
            ? candidateData?.localizacao_pt || vagaData.local || ""
            : candidateData?.localizacao_en || candidateData?.localizacao_pt || vagaData.local || "",
      })
    : null

  function updateDocument(
    language: CoverLetterLanguage,
    updater: (previous: CoverLetterDocumentState) => CoverLetterDocumentState
  ) {
    setDocuments((previous) => ({
      ...previous,
      [language]: updater(previous[language]),
    }))
  }

  async function persistCoverLetter(language: CoverLetterLanguage, content: string | null) {
    const fieldName = language === "pt" ? "carta_apresentacao_text_pt" : "carta_apresentacao_text_en"

    const response = await fetch(`/api/vagas/${vagaData.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [fieldName]: content,
      }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || "Erro ao salvar carta de apresentação.")
    }
  }

  async function gerarCarta() {
    if (!currentResume?.trim()) {
      toast.error("Nenhum currículo gerado. Gere um currículo primeiro.")
      return
    }

    if (!vagaData.empresa?.trim() || !vagaData.cargo?.trim() || !candidateData?.nome?.trim()) {
      toast.error("Dados da vaga ou candidato incompletos.")
      return
    }

    updateDocument(selectedLanguage, () => ({
      status: "loading",
      content: "",
      error: null,
      pdfDataUri: null,
    }))

    try {
      const response = await fetch("/api/ai/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          model: activeModel,
          resumeContent: currentResume,
          candidateData: {
            nome: candidateData.nome,
            email: candidateData.email,
            telefone: candidateData.telefone,
            linkedin: candidateData.linkedin,
            github: candidateData.github,
            location:
              selectedLanguage === "pt"
                ? candidateData.localizacao_pt
                : candidateData.localizacao_en || candidateData.localizacao_pt,
            educationSummary: buildCandidateEducationSummary(candidateData, selectedLanguage),
            experienceSummary: buildCandidateExperienceSummary(candidateData, selectedLanguage, profileText),
          },
          jobData: {
            empresa: vagaData.empresa,
            cargo: vagaData.cargo,
            descricao: vagaData.observacoes,
            requisitosObrigatorios: vagaData.requisitos_obrigatorios || [],
            requisitosDesejaveis: vagaData.requisitos_desejaveis || [],
            responsabilidades: vagaData.responsabilidades || [],
          },
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success || !result.data?.letter) {
        throw new Error(result.error || "Erro ao gerar carta. Tente novamente.")
      }

      await persistCoverLetter(selectedLanguage, result.data.letter)

      updateDocument(selectedLanguage, () => ({
        status: "generated",
        content: result.data.letter,
        error: null,
        pdfDataUri: null,
      }))
      toast.success("Carta gerada com sucesso!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao gerar carta. Tente novamente."
      updateDocument(selectedLanguage, () => ({
        status: "error",
        content: "",
        error: message,
        pdfDataUri: null,
      }))
      toast.error(message)
    }
  }

  function editarCarta() {
    if (!hasGeneratedLetter) return
    setEditText(currentDocument.content)
    setEditorOpen(true)
  }

  async function salvarEdicao() {
    if (editText.trim().length < 200) {
      toast.error("A carta deve ter pelo menos 200 caracteres.")
      return
    }

    try {
      await persistCoverLetter(selectedLanguage, editText.trim())

      updateDocument(selectedLanguage, (previous) => ({
        ...previous,
        status: "generated",
        content: editText.trim(),
        error: null,
        pdfDataUri: null,
      }))
      setEditorOpen(false)
      toast.success("Carta atualizada. As alterações serão refletidas no PDF.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar carta.")
    }
  }

  async function limparCarta() {
    try {
      await persistCoverLetter(selectedLanguage, null)
      updateDocument(selectedLanguage, () => INITIAL_DOCUMENT_STATE)
      setEditorOpen(false)
      setEditText("")
      toast.success("Carta removida.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover carta.")
    }
  }

  async function refinarCarta(instructions: string, model: string) {
    if (!hasGeneratedLetter || !candidateData?.nome?.trim()) {
      toast.error("Nenhuma carta gerada para refinar.")
      return
    }

    try {
      setIsRefining(selectedLanguage)

      const response = await fetch("/api/ai/refine-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          instructions,
          model,
          currentLetter: currentDocument.content,
          candidateName: candidateData.nome,
          companyName: vagaData.empresa,
          jobTitle: vagaData.cargo,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success || !result.data?.letter) {
        throw new Error(result.error || "Erro ao refinar carta.")
      }

      await persistCoverLetter(selectedLanguage, result.data.letter)

      updateDocument(selectedLanguage, (previous) => ({
        ...previous,
        status: "generated",
        content: result.data.letter,
        error: null,
        pdfDataUri: null,
      }))

      setRefineDialogOpen(false)
      toast.success("Carta refinada com sucesso! Gere o PDF novamente para baixar a versão atualizada.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao refinar carta.")
    } finally {
      setIsRefining(null)
    }
  }

  async function ensurePdf(): Promise<string> {
    if (!hasGeneratedLetter || !previewHtml) {
      throw new Error("Nenhuma carta gerada para exportar.")
    }

    if (currentDocument.pdfDataUri) {
      return currentDocument.pdfDataUri
    }

    const filename = buildCoverLetterFilename(selectedLanguage)
    const response = await fetch("/api/ai/html-to-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html: previewHtml,
        filename,
      }),
    })

    const result = await response.json()

    if (!response.ok || !result.success || !result.data?.pdfBase64) {
      throw new Error(result.error || "Erro ao gerar PDF. Tente novamente.")
    }

    const dataUri = `data:application/pdf;base64,${result.data.pdfBase64}`
    updateDocument(selectedLanguage, (previous) => ({
      ...previous,
      pdfDataUri: dataUri,
    }))
    return dataUri
  }

  async function visualizarPdf() {
    if (!hasGeneratedLetter) return

    try {
      setIsPdfBusy("preview")
      const pdfDataUri = await ensurePdf()
      const opened = openPdfPreview(pdfDataUri)
      if (!opened) {
        throw new Error("Erro ao abrir preview do PDF.")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar PDF. Tente novamente.")
    } finally {
      setIsPdfBusy(null)
    }
  }

  async function baixarPdf() {
    if (!hasGeneratedLetter) return

    try {
      setIsPdfBusy("download")
      const pdfDataUri = await ensurePdf()
      const filename = buildCoverLetterFilename(selectedLanguage)
      const started = downloadPdf(pdfDataUri, filename)

      if (!started) {
        throw new Error("Erro ao iniciar download.")
      }

      toast.success("Download iniciado!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar PDF. Tente novamente.")
    } finally {
      setIsPdfBusy(null)
    }
  }

  const characterCount = editText.trim().length
  const wordCount = getWordCount(editText)

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Carta de Apresentação</h2>

        <div className="inline-flex rounded-lg border bg-white p-1 shadow-sm">
          {(["pt", "en"] as const).map((language) => (
            <button
              key={language}
              type="button"
              onClick={() => setSelectedLanguage(language)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                selectedLanguage === language
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
              aria-label={`Selecionar carta em ${language === "pt" ? "português" : "inglês"}`}
            >
              {language.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {selectedLanguage === "pt" ? "Carta personalizada" : "Tailored cover letter"}
            </h3>
            <p className="text-sm text-slate-500">
              {selectedLanguage === "pt"
                ? "Layout Maryland com edição local e exportação em PDF."
                : "Maryland layout with local editing and PDF export."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={gerarCarta}
              disabled={currentDocument.status === "loading"}
              className={cn(
                "flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
              aria-label="Gerar carta com IA"
            >
              {currentDocument.status === "loading" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  Gerar Carta com IA
                </>
              )}
            </button>

            <button
              type="button"
              onClick={editarCarta}
              disabled={!hasGeneratedLetter}
              className={cn(
                "flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-100",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
              aria-label="Editar carta"
            >
              <Pencil size={16} />
              Editar Carta
            </button>

            <button
              type="button"
              onClick={visualizarPdf}
              disabled={!hasGeneratedLetter || isPdfBusy !== null}
              className={cn(
                "flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-100",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
              aria-label="Visualizar PDF da carta"
            >
              {isPdfBusy === "preview" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Eye size={16} />
                  Visualizar PDF
                </>
              )}
            </button>

            <button
              type="button"
              onClick={baixarPdf}
              disabled={!hasGeneratedLetter || isPdfBusy !== null}
              className={cn(
                "flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-100",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
              aria-label="Baixar PDF da carta"
            >
              {isPdfBusy === "download" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Baixar PDF
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setRefineDialogOpen(true)}
              disabled={!hasGeneratedLetter || isRefining !== null || currentDocument.status === "loading"}
              className={cn(
                "flex items-center gap-2 rounded-md border border-violet-300 px-4 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
              aria-label="Refinar carta gerada"
            >
              {isRefining === selectedLanguage ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Refinando...
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  Refinar
                </>
              )}
            </button>

            <button
              type="button"
              onClick={limparCarta}
              disabled={!hasGeneratedLetter}
              className={cn(
                "flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
              aria-label="Limpar carta gerada"
            >
              <Trash2 size={16} />
              Limpar Carta
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {hasGeneratedLetter && previewHtml ? (
            <div className="overflow-auto rounded-lg border bg-slate-50" style={{ maxHeight: "560px" }}>
              <iframe
                srcDoc={previewHtml}
                title="Preview da carta de apresentação"
                className="w-full border-0"
                style={{ height: "1180px", pointerEvents: "none" }}
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <FileText className="mb-4 h-12 w-12 text-slate-400" />
              <p className="max-w-xl text-sm text-slate-500">
                {currentResume?.trim()
                  ? "Gere uma carta com IA para visualizar a versão em layout Maryland, editar o texto e exportar o PDF."
                  : "Nenhum currículo disponível neste idioma. Gere ou selecione um currículo primeiro para criar a carta."}
              </p>
              {currentDocument.error && <p className="mt-3 text-sm font-medium text-red-600">{currentDocument.error}</p>}
            </div>
          )}
        </div>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Editar carta</DialogTitle>
            <DialogDescription>
              Alterações serão refletidas no PDF. Mantenha pelo menos 200 caracteres e revise a assinatura final.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              value={editText}
              onChange={(event) => setEditText(event.target.value)}
              className="min-h-[420px] resize-y font-serif text-[15px] leading-7"
              aria-label="Texto da carta de apresentação"
            />

            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{characterCount} caracteres</span>
              <span>{wordCount} palavras</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarEdicao}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RefineResumeDialog
        language={selectedLanguage}
        open={refineDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isRefining) {
            setRefineDialogOpen(false)
          } else if (open) {
            setRefineDialogOpen(true)
          }
        }}
        isRefining={isRefining === selectedLanguage}
        onConfirm={refinarCarta}
        activeModel={activeModel || "x-ai/grok-4.1-fast"}
        contentType="cover-letter"
      />
    </section>
  )
}
