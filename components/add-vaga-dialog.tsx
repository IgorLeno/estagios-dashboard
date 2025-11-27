"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getDataInscricao } from "@/lib/date-utils"
import type { Configuracao } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DescricaoTab } from "@/components/tabs/descricao-tab"
import { DadosVagaTab } from "@/components/tabs/dados-vaga-tab"
import { CurriculoTab } from "@/components/tabs/curriculo-tab"
import { toast } from "sonner"
import { normalizeRatingForSave } from "@/lib/utils"
import { mapJobDetailsToFormData, type FormData } from "@/lib/utils/ai-mapper"
import type {
  ParseJobResponse,
  ParseJobErrorResponse,
  JobDetails,
  GenerateResumeResponse,
  GenerateResumeErrorResponse,
} from "@/lib/ai/types"

interface AddVagaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddVagaDialog({ open, onOpenChange, onSuccess }: AddVagaDialogProps) {
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [activeTab, setActiveTab] = useState("descricao")
  const [formData, setFormData] = useState<FormData>({
    empresa: "",
    cargo: "",
    local: "",
    modalidade: "Presencial",
    requisitos: "",
    fit: "",
    etapa: "",
    status: "Pendente",
    observacoes: "",
    arquivo_analise_url: "",
    arquivo_cv_url: "",
  })

  // New state for AI features
  const [jobDescription, setJobDescription] = useState("")
  const [lastAnalyzedDescription, setLastAnalyzedDescription] = useState("")
  const [jobAnalysisData, setJobAnalysisData] = useState<JobDetails | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [generatingResume, setGeneratingResume] = useState(false)
  const [resumeContent, setResumeContent] = useState("")
  const [resumePdfBase64, setResumePdfBase64] = useState<string | null>(null)
  const [resumeFilename, setResumeFilename] = useState<string | null>(null)

  const supabase = createClient()

  // Load config on mount
  useEffect(() => {
    async function fetchConfig() {
      try {
        const { data } = await supabase.from("configuracoes").select("*").single()
        if (data) setConfig(data)
      } catch (error) {
        console.error("Erro ao carregar configurações:", error)
      }
    }
    fetchConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fill job data from AI parsing
  async function handleFillJobData() {
    setAnalyzing(true)

    try {
      const response = await fetch("/api/ai/parse-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      })

      const result: ParseJobResponse | ParseJobErrorResponse = await response.json()

      if (result.success) {
        const analiseMarkdown = (result as ParseJobResponse & { analise?: string }).analise || ""
        const mapped = mapJobDetailsToFormData(result.data, analiseMarkdown)
        setFormData((prev) => ({ ...prev, ...mapped }))
        setJobAnalysisData(result.data)
        setLastAnalyzedDescription(jobDescription)
        toast.success("✓ Dados preenchidos com sucesso!")

        // Auto-switch to Tab 2
        setTimeout(() => setActiveTab("dados"), 1000)
      } else {
        handleParseError(response.status, result.error)
      }
    } catch {
      toast.error("Erro de conexão. Verifique e tente novamente.")
    } finally {
      setAnalyzing(false)
    }
  }

  function handleParseError(status: number, message: string) {
    switch (status) {
      case 429:
        toast.error("Limite de requisições atingido. Tente novamente em instantes.")
        break
      case 504:
        toast.error("Tempo esgotado. Tente com descrição mais curta.")
        break
      case 400:
        toast.error("Formato inválido. Verifique a descrição.")
        break
      default:
        toast.error(message || "Erro ao processar")
    }
  }

  // Refresh analysis from Tab 2
  async function handleRefreshAnalysis() {
    if (!lastAnalyzedDescription) {
      toast.error("Nenhuma descrição para refazer análise")
      return
    }

    setRefreshing(true)
    try {
      const response = await fetch("/api/ai/parse-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: lastAnalyzedDescription }),
      })

      const result: ParseJobResponse | ParseJobErrorResponse = await response.json()

      if (result.success) {
        const analiseMarkdown = (result as ParseJobResponse & { analise?: string }).analise || ""
        const mapped = mapJobDetailsToFormData(result.data, analiseMarkdown)
        setFormData((prev) => ({ ...prev, ...mapped }))
        setJobAnalysisData(result.data)
        toast.success("✓ Análise refeita com sucesso!")
      } else {
        handleParseError(response.status, result.error)
      }
    } catch {
      toast.error("Erro ao refazer análise")
    } finally {
      setRefreshing(false)
    }
  }

  // Generate resume
  async function handleGenerateResume() {
    if (!jobAnalysisData) {
      toast.error("Análise da vaga necessária primeiro")
      return
    }

    const description = (lastAnalyzedDescription || jobDescription)?.trim()
    if (!description) {
      toast.error("Descrição da vaga necessária")
      return
    }

    setGeneratingResume(true)
    try {
      const response = await fetch("/api/ai/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: description,
          language: "pt",
        }),
      })

      if (!response.ok) {
        const errorData: GenerateResumeErrorResponse = await response.json()
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const result: GenerateResumeResponse = await response.json()

      if (result.success) {
        setResumePdfBase64(result.data.pdfBase64)
        setResumeFilename(result.data.filename)
        setResumeContent("PDF gerado")
        toast.success("✓ Currículo gerado com sucesso!")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao gerar currículo"
      toast.error(errorMessage)
      console.error("Resume generation error:", err)
    } finally {
      setGeneratingResume(false)
    }
  }

  // Refresh resume
  async function handleRefreshResume() {
    const confirmed = window.confirm("Deseja gerar um novo currículo? O atual será substituído.")
    if (confirmed) {
      await handleGenerateResume()
    }
  }

  // Download PDF
  function handleDownloadPDF() {
    if (!resumePdfBase64 || !resumeFilename) return

    const link = document.createElement("a")
    link.href = `data:application/pdf;base64,${resumePdfBase64}`
    link.download = resumeFilename
    link.click()
    toast.success("✓ PDF baixado!")
  }

  // Save vaga (final step)
  async function handleSaveVaga() {
    setLoading(true)

    try {
      const dataInscricao = getDataInscricao(new Date(), config || undefined)
      if (process.env.NODE_ENV === "development") {
        console.log("[AddVagaDialog] Criando vaga com data_inscricao:", dataInscricao, "Config:", config)
      }

      const { error } = await supabase.from("vagas_estagio").insert({
        empresa: formData.empresa,
        cargo: formData.cargo,
        local: formData.local,
        modalidade: formData.modalidade,
        requisitos: normalizeRatingForSave(formData.requisitos),
        fit: normalizeRatingForSave(formData.fit),
        etapa: formData.etapa || null,
        status: formData.status,
        observacoes: formData.observacoes || null,
        arquivo_analise_url: formData.arquivo_analise_url || null,
        arquivo_cv_url: resumePdfBase64 ? `data:application/pdf;base64,${resumePdfBase64}` : null,
        data_inscricao: dataInscricao,
      })

      if (error) throw error

      toast.success("✓ Vaga salva com sucesso!")
      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error("Error adding job:", error)
      toast.error("Erro ao salvar vaga. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      empresa: "",
      cargo: "",
      local: "",
      modalidade: "Presencial",
      requisitos: "",
      fit: "",
      etapa: "",
      status: "Pendente",
      observacoes: "",
      arquivo_analise_url: "",
      arquivo_cv_url: "",
    })
    setJobDescription("")
    setLastAnalyzedDescription("")
    setJobAnalysisData(null)
    setResumeContent("")
    setResumePdfBase64(null)
    setResumeFilename(null)
    setActiveTab("descricao")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Vaga</DialogTitle>
          <DialogDescription>Preencha automaticamente com IA ou insira manualmente os dados</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="descricao">📝 Descrição</TabsTrigger>
            <TabsTrigger value="dados">📊 Dados da Vaga</TabsTrigger>
            <TabsTrigger value="curriculo">📄 Currículo</TabsTrigger>
          </TabsList>

          <TabsContent value="descricao" className="mt-4">
            <DescricaoTab
              description={jobDescription}
              setDescription={setJobDescription}
              analyzing={analyzing}
              onFillJobData={handleFillJobData}
            />
          </TabsContent>

          <TabsContent value="dados" className="mt-4">
            <DadosVagaTab
              formData={formData}
              setFormData={setFormData}
              jobAnalysisData={jobAnalysisData}
              onRefreshAnalysis={handleRefreshAnalysis}
              refreshing={refreshing}
              onNextTab={() => setActiveTab("curriculo")}
            />
          </TabsContent>

          <TabsContent value="curriculo" className="mt-4">
            <CurriculoTab
              resumeContent={resumeContent}
              setResumeContent={setResumeContent}
              resumePdfBase64={resumePdfBase64}
              resumeFilename={resumeFilename}
              jobAnalysisData={jobAnalysisData}
              generatingResume={generatingResume}
              savingVaga={loading}
              onGenerateResume={handleGenerateResume}
              onRefreshResume={handleRefreshResume}
              onDownloadPDF={handleDownloadPDF}
              onSaveVaga={handleSaveVaga}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading || analyzing || generatingResume}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
