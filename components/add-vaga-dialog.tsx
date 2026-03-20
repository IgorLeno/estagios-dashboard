"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getDataInscricao } from "@/lib/date-utils"
import type { Configuracao } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronRight, RotateCcw } from "lucide-react"
import { DescricaoTab } from "@/components/tabs/descricao-tab"
import { DadosVagaTab } from "@/components/tabs/dados-vaga-tab"
import { CurriculoTab } from "@/components/tabs/curriculo-tab"
import { SkillsVagaTab } from "@/components/tabs/skills-vaga-tab"
import { toast } from "sonner"
import { normalizeRatingForSave } from "@/lib/utils"
import { mapJobDetailsToFormData, type FormData } from "@/lib/utils/ai-mapper"
import type {
  ParseJobResponse,
  ParseJobErrorResponse,
  JobDetails,
  GenerateResumeResponse,
  GenerateResumeErrorResponse,
  JobSkillReview,
} from "@/lib/ai/types"

interface AddVagaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const ANALYSIS_MODEL_HISTORY_STORAGE_KEY = "openrouter_model_history"

type AnalysisConfigData = Configuracao & {
  modelo_gemini?: string | null
}

function readAnalysisModelHistory(): string[] {
  try {
    const stored = localStorage.getItem(ANALYSIS_MODEL_HISTORY_STORAGE_KEY)
    if (!stored) return []

    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((model): model is string => typeof model === "string")
      .map((model) => model.trim())
      .filter(Boolean)
      .slice(0, 20)
  } catch {
    return []
  }
}

function persistAnalysisModelHistory(history: string[]) {
  try {
    localStorage.setItem(ANALYSIS_MODEL_HISTORY_STORAGE_KEY, JSON.stringify(history))
  } catch {
    // Ignore localStorage errors in client-only enhancement flow
  }
}

export function AddVagaDialog({ open, onOpenChange, onSuccess }: AddVagaDialogProps) {
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [activeTab, setActiveTab] = useState("descricao")
  const [vagaId, setVagaId] = useState<string | null>(null)
  const [isDraftVaga, setIsDraftVaga] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    empresa: "",
    cargo: "",
    local: "",
    modalidade: "Presencial",
    requisitos: "",
    perfil: "",
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
  const [selectedAnalysisModel, setSelectedAnalysisModel] = useState<string>("")
  const [analysisModelHistory, setAnalysisModelHistory] = useState<string[]>([])
  const [selectedResumeModel, setSelectedResumeModel] = useState<string>("")
  const [resumeModelHistory, setResumeModelHistory] = useState<string[]>([])
  const [analysisModelConfigLoaded, setAnalysisModelConfigLoaded] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [generatingResume, setGeneratingResume] = useState(false)
  const [resumeContentPt, setResumeContentPt] = useState("")
  const [resumeContentEn, setResumeContentEn] = useState("")
  const [resumePdfBase64, setResumePdfBase64] = useState<string | null>(null)
  const [resumeFilename, setResumeFilename] = useState<string | null>(null)
  const [resumePdfBase64Pt, setResumePdfBase64Pt] = useState<string | null>(null)
  const [resumePdfBase64En, setResumePdfBase64En] = useState<string | null>(null)
  const [jobSkills, setJobSkills] = useState<JobSkillReview[]>([])
  const [skillsLoaded, setSkillsLoaded] = useState(false)
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [isSavingSkills, setIsSavingSkills] = useState(false)

  const supabase = createClient()
  const approvedSkills = jobSkills
    .filter((skill) => skill.mode === "use" || skill.mode === "rename")
    .map((skill) => skill.displayName)

  function buildVagaPayload() {
    const empresa = formData.empresa.trim()
    const cargo = formData.cargo.trim()
    const local = formData.local.trim()
    const observacoes = formData.observacoes.trim()
    const looksLikeE2ETest = [empresa, cargo, observacoes].some(
      (value) => value.includes("[E2E-TEST]") || value.includes("E2E-TEST")
    )
    const dataInscricao = getDataInscricao(new Date(), config || undefined)
    const cvDataUrl = resumePdfBase64 ? `data:application/pdf;base64,${resumePdfBase64}` : null
    const cvDataUrlPt = resumePdfBase64Pt ? `data:application/pdf;base64,${resumePdfBase64Pt}` : null
    const cvDataUrlEn = resumePdfBase64En ? `data:application/pdf;base64,${resumePdfBase64En}` : null

    return {
      empresa,
      cargo,
      local,
      modalidade: formData.modalidade,
      requisitos: normalizeRatingForSave(formData.requisitos),
      perfil: normalizeRatingForSave(formData.perfil),
      etapa: formData.etapa || null,
      status: formData.status,
      observacoes: observacoes || null,
      arquivo_analise_url: formData.arquivo_analise_url || null,
      arquivo_cv_url: cvDataUrl,
      arquivo_cv_url_pt: cvDataUrlPt,
      arquivo_cv_url_en: cvDataUrlEn,
      curriculo_text_pt: resumeContentPt || null,
      curriculo_text_en: resumeContentEn || null,
      data_inscricao: dataInscricao,
      is_test_data: process.env.NEXT_PUBLIC_SHOW_TEST_DATA === "true" || looksLikeE2ETest,
    }
  }

  async function ensurePersistedVagaId() {
    if (vagaId) return vagaId

    const empresa = formData.empresa.trim()
    const cargo = formData.cargo.trim()
    const local = formData.local.trim()

    if (!empresa || !cargo || !local) {
      toast.error("Preencha empresa, cargo e local antes de salvar skills.")
      return null
    }

    const { data, error } = await supabase.from("vagas_estagio").insert(buildVagaPayload()).select("id").single()

    if (error) {
      console.error("[AddVagaDialog] Draft insert error:", error)
      throw error
    }

    setVagaId(data.id)
    setIsDraftVaga(true)

    return data.id
  }

  async function cleanupDraftVaga() {
    if (!isDraftVaga || !vagaId) return

    const { error } = await supabase.from("vagas_estagio").delete().eq("id", vagaId)

    if (error) {
      console.error("[AddVagaDialog] Error deleting draft vaga:", error)
    }
  }

  // Load config on mount
  useEffect(() => {
    async function fetchConfig() {
      const storedHistory = readAnalysisModelHistory()

      try {
        const { data } = await supabase.from("configuracoes").select("*").single()
        if (data) {
          const typedData = data as AnalysisConfigData
          const currentModel = typedData.modelo_gemini?.trim() ?? ""
          const updatedHistory = currentModel
            ? [currentModel, ...storedHistory.filter((model) => model !== currentModel)].slice(0, 20)
            : storedHistory

          setConfig(typedData)
          setSelectedAnalysisModel(currentModel)
          setAnalysisModelHistory(updatedHistory)
          setSelectedResumeModel(currentModel)
          setResumeModelHistory(updatedHistory)
          persistAnalysisModelHistory(updatedHistory)
        } else {
          setAnalysisModelHistory(storedHistory)
          setResumeModelHistory(storedHistory)
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error)
        setAnalysisModelHistory(storedHistory)
        setResumeModelHistory(storedHistory)
      } finally {
        setAnalysisModelConfigLoaded(true)
      }
    }
    fetchConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!analysisModelConfigLoaded) return
    persistAnalysisModelHistory(analysisModelHistory)
  }, [analysisModelConfigLoaded, analysisModelHistory])

  // Fill job data from AI parsing
  async function handleFillJobData() {
    setAnalyzing(true)

    try {
      const response = await fetch("/api/ai/parse-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          model: selectedAnalysisModel || undefined,
        }),
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
        body: JSON.stringify({
          jobDescription: lastAnalyzedDescription,
          model: selectedAnalysisModel || undefined,
        }),
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
          approvedSkills: approvedSkills.length > 0 ? approvedSkills : undefined,
          model: selectedResumeModel || undefined,
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
        // resumeContent removido - agora usa resumeContentPt/En do preview
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

  async function handleLoadSkills() {
    if (skillsLoaded || skillsLoading) return

    const description = (lastAnalyzedDescription || jobDescription).trim()
    if (!description) {
      toast.error("Descrição da vaga necessária para extrair skills")
      return
    }

    setSkillsLoading(true)
    try {
      const payload = {
        jobDescription: description,
        cargo: jobAnalysisData?.cargo || formData.cargo || undefined,
        empresa: jobAnalysisData?.empresa || formData.empresa || undefined,
      }

      const res = await fetch("/api/ai/extract-job-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        setJobSkills(data.skills)
      } else {
        toast.error("Erro ao carregar skills da vaga")
      }
    } catch {
      toast.error("Erro ao carregar skills da vaga")
    } finally {
      setSkillsLoaded(true)
      setSkillsLoading(false)
    }
  }

  async function handleSaveSkills() {
    if (jobSkills.length === 0) return

    setIsSavingSkills(true)

    try {
      const currentVagaId = await ensurePersistedVagaId()
      if (!currentVagaId) return

      const response = await fetch(`/api/vagas/${currentVagaId}/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: jobSkills }),
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(errorData?.error || "Failed to save skills")
      }

      toast.success("Skills salvas com sucesso!")
    } catch (error) {
      console.error("[AddVagaDialog] Error saving skills:", error)
      toast.error("Erro ao salvar skills")
    } finally {
      setIsSavingSkills(false)
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
      const { empresa } = buildVagaPayload()

      if (!empresa) {
        toast.error("Preencha o nome da empresa antes de salvar.")
        return
      }

      if (process.env.NODE_ENV === "development") {
        console.log("[AddVagaDialog] Salvando vaga. Config:", config)
      }

      const payload = buildVagaPayload()
      const query = vagaId
        ? supabase
            .from("vagas_estagio")
            .update({
              ...payload,
              updated_at: new Date().toISOString(),
            })
            .eq("id", vagaId)
        : supabase.from("vagas_estagio").insert(payload)

      const { data, error } = await query.select()

      if (error) {
        console.error("[AddVagaDialog] Save error:", error)
        throw error
      }

      if (!data || data.length === 0) {
        console.error("[AddVagaDialog] Save returned no data - silent failure detected")
        throw new Error("Failed to save vaga - no data returned from database")
      }

      setVagaId(data[0].id)
      setIsDraftVaga(false)
      toast.success("✓ Vaga salva com sucesso!")
      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error("[AddVagaDialog] Error adding job:", error)
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
      perfil: "",
      etapa: "",
      status: "Pendente",
      observacoes: "",
      arquivo_analise_url: "",
      arquivo_cv_url: "",
    })
    setJobDescription("")
    setLastAnalyzedDescription("")
    setJobAnalysisData(null)
    setResumeContentPt("")
    setResumeContentEn("")
    setResumePdfBase64(null)
    setResumeFilename(null)
    setResumePdfBase64Pt(null)
    setResumePdfBase64En(null)
    setJobSkills([])
    setVagaId(null)
    setIsDraftVaga(false)
    setSkillsLoaded(false)
    setSkillsLoading(false)
    setIsSavingSkills(false)
    setActiveTab("descricao")
  }

  async function handleCloseDialog() {
    await cleanupDraftVaga()
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true)
          return
        }

        void handleCloseDialog()
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Vaga</DialogTitle>
          <DialogDescription>Preencha automaticamente com IA ou insira manualmente os dados</DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value)
            if (value === "skills") {
              void handleLoadSkills()
            }
          }}
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger
              value="descricao"
              className="flex flex-col items-center gap-0.5 py-2 text-xs sm:flex-row sm:gap-1.5 sm:text-sm"
            >
              <span>📝</span>
              <span>Descrição</span>
            </TabsTrigger>
            <TabsTrigger
              value="dados"
              className="flex flex-col items-center gap-0.5 py-2 text-xs sm:flex-row sm:gap-1.5 sm:text-sm"
            >
              <span>📊</span>
              <span>Dados da Vaga</span>
            </TabsTrigger>
            <TabsTrigger
              value="skills"
              className="flex flex-col items-center gap-0.5 py-2 text-xs sm:flex-row sm:gap-1.5 sm:text-sm"
              onClick={() => void handleLoadSkills()}
            >
              <span>🎯</span>
              <span>Skills</span>
            </TabsTrigger>
            <TabsTrigger
              value="curriculo"
              className="flex flex-col items-center gap-0.5 py-2 text-xs sm:flex-row sm:gap-1.5 sm:text-sm"
            >
              <span>📄</span>
              <span>Currículo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="descricao" className="mt-4">
            <DescricaoTab
              description={jobDescription}
              setDescription={setJobDescription}
              analyzing={analyzing}
              onFillJobData={handleFillJobData}
              activeModel={selectedAnalysisModel}
              modelHistory={analysisModelHistory}
              onModelChange={setSelectedAnalysisModel}
              onModelHistoryChange={setAnalysisModelHistory}
            />
          </TabsContent>

          <TabsContent value="dados" className="mt-4">
            <DadosVagaTab formData={formData} setFormData={setFormData} jobAnalysisData={jobAnalysisData} />
          </TabsContent>

          <TabsContent value="skills" className="mt-4">
            <SkillsVagaTab
              vagaId={vagaId ?? undefined}
              skills={jobSkills}
              isLoading={skillsLoading}
              isLoaded={skillsLoaded}
              onChange={setJobSkills}
              onLoad={handleLoadSkills}
              onSave={handleSaveSkills}
              isSaving={isSavingSkills}
            />
          </TabsContent>

          <TabsContent value="curriculo" className="mt-4">
            <CurriculoTab
              resumeContent={resumeContentPt}
              setResumeContent={setResumeContentPt}
              resumePdfBase64={resumePdfBase64}
              resumeFilename={resumeFilename}
              onPdfGenerated={(pdfBase64: string, filename: string) => {
                // Detect language from filename
                if (filename.includes("-pt.pdf")) {
                  setResumePdfBase64Pt(pdfBase64)
                } else if (filename.includes("-en.pdf")) {
                  setResumePdfBase64En(pdfBase64)
                }
                // Keep legacy state updated (last generated PDF)
                setResumePdfBase64(pdfBase64)
                setResumeFilename(filename)
              }}
              onMarkdownGenerated={(markdownPt: string, markdownEn: string) => {
                // ✅ FIX: Só atualiza se não for vazio (merge em vez de sobrescrever)
                if (markdownPt) setResumeContentPt(markdownPt)
                if (markdownEn) setResumeContentEn(markdownEn)
                console.log("[AddVagaDialog] Markdown recebido:", {
                  ptLength: markdownPt.length,
                  enLength: markdownEn.length,
                })
              }}
              jobAnalysisData={jobAnalysisData}
              generatingResume={generatingResume}
              savingVaga={loading}
              onGenerateResume={handleGenerateResume}
              onRefreshResume={handleRefreshResume}
              onDownloadPDF={handleDownloadPDF}
              onSaveVaga={handleSaveVaga}
              jobDescription={lastAnalyzedDescription || jobDescription}
              vagaId={vagaId ?? undefined}
              initialMarkdownPt={resumeContentPt}
              initialMarkdownEn={resumeContentEn}
              approvedSkills={approvedSkills}
              activeModel={selectedResumeModel}
              modelHistory={resumeModelHistory}
              onModelChange={setSelectedResumeModel}
              onModelHistoryChange={setResumeModelHistory}
            />
          </TabsContent>
        </Tabs>

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-h-10 items-center">
            {activeTab === "dados" && jobAnalysisData && (
              <Button onClick={handleRefreshAnalysis} variant="ghost" disabled={refreshing} type="button">
                {refreshing ? (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                    Refazendo análise...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Refazer análise
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              onClick={() => void handleCloseDialog()}
              disabled={loading || analyzing || generatingResume}
            >
              Cancelar
            </Button>
            {activeTab === "dados" && (
              <Button onClick={() => setActiveTab("skills")} disabled={loading || analyzing || generatingResume}>
                Continuar para Skills
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {activeTab === "skills" && (
              <Button onClick={() => setActiveTab("curriculo")} disabled={loading || analyzing || generatingResume}>
                Continuar para Currículo
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
