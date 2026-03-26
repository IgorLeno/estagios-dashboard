"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getVagaById } from "@/lib/supabase/queries"
import type { VagaEstagio } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit2, Star, User, MapPin, Building2, Save, Download } from "lucide-react"
import { EditVagaDialog } from "@/components/edit-vaga-dialog"
import { Sidebar } from "@/components/sidebar"
import { StarRating } from "@/components/ui/star-rating"
import { MarkdownPreview } from "@/components/ui/markdown-preview"
import { ResumeContainer } from "@/components/resume-container"
import { RefineResumeDialog } from "@/components/refine-resume-dialog"
import { FitTab } from "@/components/tabs/fit-tab"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { downloadPdf } from "@/lib/url-utils"
import { toSafeNumber, getStatusBadgeClasses } from "@/lib/utils"
import { toast } from "sonner"
import { JobDetailsSchema } from "@/lib/ai/types"
import type { JobDetails, ComplementSelection } from "@/lib/ai/types"
import { renderMarkdownResumeToHtml } from "@/lib/ai/markdown-converter"
import { recordModelFailure, recordModelSuccess } from "@/lib/model-attempt-tracker"

function mapVagaToJobDetails(vaga: VagaEstagio): JobDetails {
  return JobDetailsSchema.parse({
    empresa: vaga.empresa,
    cargo: vaga.cargo,
    local: vaga.local,
    modalidade: vaga.modalidade,
    tipo_vaga: vaga.tipo_vaga,
    requisitos_obrigatorios: vaga.requisitos_obrigatorios,
    requisitos_desejaveis: vaga.requisitos_desejaveis,
    responsabilidades: vaga.responsabilidades,
    beneficios: vaga.beneficios,
    salario: vaga.salario,
    idioma_vaga: vaga.idioma_vaga,
    etapa: vaga.etapa,
    status: vaga.status,
    observacoes: vaga.observacoes,
  })
}

export default function VagaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [vaga, setVaga] = useState<VagaEstagio | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [markdownContent, setMarkdownContent] = useState("")
  const [isEditingMarkdown, setIsEditingMarkdown] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<"pt" | "en" | null>(null)
  const [isGeneratingPdfPT, setIsGeneratingPdfPT] = useState(false)
  const [isGeneratingPdfEN, setIsGeneratingPdfEN] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState<string>(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("resume_template_preference") ?? "modelo1")
      : "modelo1"
  )
  const [refineDialogLanguage, setRefineDialogLanguage] = useState<"pt" | "en" | null>(null)
  const [isRefiningResume, setIsRefiningResume] = useState<"pt" | "en" | null>(null)
  const [activeModel, setActiveModel] = useState<string>("x-ai/grok-4.1-fast")
  const [editingResumeLanguage, setEditingResumeLanguage] = useState<"pt" | "en" | null>(null)
  const [editingResumeContent, setEditingResumeContent] = useState("")
  const [profileText, setProfileText] = useState("")
  const [tagline, setTagline] = useState("")
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false)
  const [complements, setComplements] = useState<ComplementSelection | null>(null)
  const [isSelectingComplements, setIsSelectingComplements] = useState(false)

  useEffect(() => {
    loadVaga()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  useEffect(() => {
    let isMounted = true

    async function loadActiveModel() {
      try {
        const response = await fetch("/api/prompts")

        if (!response.ok) {
          throw new Error(`Failed to load prompts config: ${response.status}`)
        }

        const result = await response.json()
        const model = result?.data?.modelo_gemini

        if (isMounted && typeof model === "string" && model.trim() !== "") {
          setActiveModel(model)
        }
      } catch (error) {
        console.error("Erro ao carregar modelo ativo:", error)
      }
    }

    loadActiveModel()

    return () => {
      isMounted = false
    }
  }, [])

  async function loadVaga() {
    try {
      const { data, error } = await getVagaById(params.id as string)

      if (error) throw error
      setVaga(data)

      // Se houver arquivo de análise, carregar conteúdo para preview
      if (data?.observacoes) {
        setMarkdownContent(data.observacoes)
      }

      // Log currículo info
      if (data?.curriculo_text_pt || data?.curriculo_text_en) {
        console.log("[Page] Currículo markdown disponível:", {
          ptLength: data.curriculo_text_pt?.length || 0,
          enLength: data.curriculo_text_en?.length || 0,
        })
      }
    } catch (error) {
      console.error("Erro ao carregar vaga:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveMarkdown() {
    if (!vaga || !markdownContent) return

    try {
      const response = await fetch(`/api/vagas/${vaga.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observacoes: markdownContent }),
      })

      if (!response.ok) throw new Error("Failed to save markdown")

      toast.success("Análise atualizada com sucesso!")
      setIsEditingMarkdown(false)
      loadVaga()
    } catch (error) {
      console.error("Error saving markdown:", error)
      toast.error("Erro ao salvar análise")
    }
  }

  async function handleDeleteResume(language: "pt" | "en") {
    if (!vaga) return

    const confirmed = window.confirm(
      `Deseja realmente excluir o currículo em ${language.toUpperCase()}? Esta ação não pode ser desfeita.`
    )

    if (!confirmed) return

    try {
      const updateResponse = await fetch(`/api/vagas/${vaga.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [`curriculo_text_${language}`]: null,
          [`arquivo_cv_url_${language}`]: null,
        }),
      })

      if (!updateResponse.ok) {
        throw new Error("Erro ao excluir currículo")
      }

      toast.success(`Currículo em ${language.toUpperCase()} excluído com sucesso!`)
      loadVaga()
    } catch (error) {
      console.error("Erro ao excluir currículo:", error)
      toast.error("Erro ao excluir currículo")
    }
  }

  async function handleGenerateResume(language: "pt" | "en", model?: string) {
    if (!vaga) return

    const approvedSkills = complements?.skills.filter((group) => group.selected).flatMap((group) => group.items) ?? []
    const selectedProjectTitles =
      complements?.projects.filter((project) => project.selected).map((project) => project.title) ?? []
    const selectedCertifications =
      complements?.certifications.filter((certification) => certification.selected).map((certification) => certification.title) ?? []

    try {
      setIsGeneratingPDF(language)

      const response = await fetch("/api/ai/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vagaId: vaga.id,
          language,
          profileText: language === "pt" ? profileText.trim() || undefined : undefined,
          tagline: tagline.trim() || undefined,
          approvedSkills: approvedSkills.length > 0 ? approvedSkills : undefined,
          selectedProjectTitles: selectedProjectTitles.length > 0 ? selectedProjectTitles : undefined,
          selectedCertifications: selectedCertifications.length > 0 ? selectedCertifications : undefined,
          model,
          resumeTemplate: activeTemplate,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro ao gerar currículo: ${response.status}`)
      }

      toast.success(`Currículo em ${language.toUpperCase()} gerado com sucesso!`)
      loadVaga()
    } catch (error) {
      console.error("Erro ao gerar currículo:", error)
      const errorMessage = error instanceof Error ? error.message : "Erro ao gerar currículo"
      toast.error(errorMessage)
    } finally {
      setIsGeneratingPDF(null)
    }
  }

  async function handleRefineResume(instructions: string, model: string) {
    if (!vaga || !refineDialogLanguage) return

    try {
      setIsRefiningResume(refineDialogLanguage)

      const response = await fetch("/api/ai/refine-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vagaId: vaga.id,
          language: refineDialogLanguage,
          instructions,
          model,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Erro ao refinar currículo: ${response.status}`)
      }

      toast.success(
        `Currículo em ${refineDialogLanguage.toUpperCase()} refinado com sucesso! PDF invalidado, gere novamente para baixar a versão atualizada.`
      )
      setRefineDialogLanguage(null)
      await loadVaga()
    } catch (error) {
      console.error("Erro ao refinar currículo:", error)
      const errorMessage = error instanceof Error ? error.message : "Erro ao refinar currículo"
      toast.error(errorMessage)
    } finally {
      setIsRefiningResume(null)
    }
  }

  function handleEditResume(language: "pt" | "en") {
    if (!vaga) return

    const currentContent = language === "pt" ? vaga.curriculo_text_pt : vaga.curriculo_text_en

    if (!currentContent) {
      toast.error(`Nenhum currículo em ${language.toUpperCase()} para editar`)
      return
    }

    setEditingResumeLanguage(language)
    setEditingResumeContent(currentContent)
  }

  async function handleSaveResumeEdit() {
    if (!vaga || !editingResumeLanguage) return

    try {
      const updateResponse = await fetch(`/api/vagas/${vaga.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [`curriculo_text_${editingResumeLanguage}`]: editingResumeContent,
          [`arquivo_cv_url_${editingResumeLanguage}`]: null, // Invalidate PDF when markdown changes
        }),
      })

      if (!updateResponse.ok) {
        throw new Error("Erro ao salvar currículo")
      }

      toast.success(
        `Currículo em ${editingResumeLanguage.toUpperCase()} atualizado! PDF invalidado - clique em 'Gerar PDF' para atualizar.`
      )
      setEditingResumeLanguage(null)
      setEditingResumeContent("")
      loadVaga()
    } catch (error) {
      console.error("Erro ao salvar currículo:", error)
      toast.error("Erro ao salvar currículo")
    }
  }

  async function handleGeneratePdf(language: "pt" | "en") {
    if (!vaga) return

    try {
      if (language === "pt") setIsGeneratingPdfPT(true)
      else setIsGeneratingPdfEN(true)

      const markdownText = language === "pt" ? vaga.curriculo_text_pt : vaga.curriculo_text_en

      if (!markdownText?.trim()) {
        throw new Error(`Nenhum currículo salvo em ${language.toUpperCase()} para converter`)
      }

      const templateToUse = activeTemplate === "modelo2" ? "modelo2" : "modelo1"
      const html = await renderMarkdownResumeToHtml(markdownText, templateToUse, language)

      // Step 2: Convert HTML to PDF
      const pdfResponse = await fetch("/api/ai/html-to-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      })

      if (!pdfResponse.ok) throw new Error("Falha ao gerar PDF")

      const pdfResult = await pdfResponse.json()
      const dataUrl = `data:application/pdf;base64,${pdfResult.data.pdfBase64}`

      // Step 3: Save PDF to database
      const pdfField = language === "pt" ? "arquivo_cv_url_pt" : "arquivo_cv_url_en"
      const updateResponse = await fetch(`/api/vagas/${vaga.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [pdfField]: dataUrl }),
      })

      if (!updateResponse.ok) throw new Error("Falha ao salvar PDF")

      await loadVaga()
      toast.success(`PDF gerado com sucesso em ${language.toUpperCase()}!`)
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao gerar PDF. Tente novamente.")
    } finally {
      if (language === "pt") setIsGeneratingPdfPT(false)
      else setIsGeneratingPdfEN(false)
    }
  }

  async function handleDownloadPdf(language: "pt" | "en") {
    if (!vaga) return

    try {
      const pdfUrl = language === "pt" ? vaga.arquivo_cv_url_pt : vaga.arquivo_cv_url_en

      if (!pdfUrl) {
        toast.error(`PDF não encontrado em ${language.toUpperCase()}`)
        return
      }

      // Generate filename: curriculo-pt-<empresa>.pdf or resume-en-<empresa>.pdf
      const empresaSlug = vaga.empresa.toLowerCase().replace(/\s+/g, "-")
      const prefix = language === "pt" ? "curriculo-pt" : "resume-en"
      const filename = `${prefix}-${empresaSlug}.pdf`

      const success = downloadPdf(pdfUrl, filename)

      if (success) {
        toast.success("Download iniciado!")
      } else {
        toast.error("Erro ao iniciar download")
      }
    } catch (error) {
      console.error("Error downloading PDF:", error)
      toast.error("Erro ao baixar PDF. Tente novamente.")
    }
  }

  async function handleGeneratePdfFromHtml(language: "pt" | "en", htmlSource: string) {
    try {
      if (language === "pt") setIsGeneratingPdfPT(true)
      else setIsGeneratingPdfEN(true)

      const response = await fetch("/api/ai/html-to-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: htmlSource }),
      })

      if (!response.ok) throw new Error("Falha ao gerar PDF")

      const result = await response.json()
      const dataUrl = `data:application/pdf;base64,${result.data.pdfBase64}`

      const pdfField = language === "pt" ? "arquivo_cv_url_pt" : "arquivo_cv_url_en"
      const updateResponse = await fetch(`/api/vagas/${vaga!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [pdfField]: dataUrl }),
      })

      if (!updateResponse.ok) throw new Error("Falha ao salvar PDF")

      await loadVaga()
      toast.success(`PDF gerado com sucesso em ${language.toUpperCase()}!`)
    } catch (error) {
      console.error("Error generating PDF from HTML:", error)
      toast.error("Erro ao gerar PDF. Tente novamente.")
    } finally {
      if (language === "pt") setIsGeneratingPdfPT(false)
      else setIsGeneratingPdfEN(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ml-64">
        <p className="text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    )
  }

  if (!vaga) {
    return (
      <div className="min-h-screen flex items-center justify-center ml-64">
        <p className="text-muted-foreground">Vaga não encontrada</p>
      </div>
    )
  }

  const requisitos = toSafeNumber(vaga.requisitos)
  const perfil = toSafeNumber(vaga.perfil)
  const jobAnalysisData = mapVagaToJobDetails(vaga)

  async function handleGenerateProfile() {
    setIsGeneratingProfile(true)

    try {
      const response = await fetch("/api/ai/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobAnalysis: jobAnalysisData,
          language: "pt",
          model: activeModel || undefined,
        }),
      })

      const result = await response.json()
      const trackedModel = typeof result?.metadata?.model === "string" ? result.metadata.model : activeModel

      if (!response.ok || !result.success) {
        if (response.status >= 500) {
          recordModelFailure(activeModel, "generate-profile")
        }
        throw new Error(result.error || `Erro ao gerar perfil: ${response.status}`)
      }

      recordModelSuccess(trackedModel, "generate-profile")
      setProfileText(result.data.profileText)
      setTagline(typeof result.data.tagline === "string" ? result.data.tagline : "")
      setComplements(null)
      toast.success("Perfil profissional gerado com sucesso!")
    } catch (error) {
      console.error("Erro ao gerar perfil:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao gerar perfil")
    } finally {
      setIsGeneratingProfile(false)
    }
  }

  async function handleSelectComplements() {
    if (!profileText.trim()) {
      toast.error("Perfil profissional necessário primeiro")
      return
    }

    setIsSelectingComplements(true)

    try {
      const response = await fetch("/api/ai/select-complements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileText,
          jobAnalysis: jobAnalysisData,
          language: "pt",
          model: activeModel || undefined,
        }),
      })

      const result = await response.json()
      const trackedModel = typeof result?.metadata?.model === "string" ? result.metadata.model : activeModel

      if (!response.ok || !result.success) {
        if (response.status >= 500) {
          recordModelFailure(activeModel, "select-complements")
        }
        throw new Error(result.error || `Erro ao selecionar complementos: ${response.status}`)
      }

      recordModelSuccess(trackedModel, "select-complements")
      setComplements(result.data)
      toast.success("Complementos selecionados com sucesso!")
    } catch (error) {
      console.error("Erro ao selecionar complementos:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao selecionar complementos")
    } finally {
      setIsSelectingComplements(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar activeTab="dashboard" onTabChange={() => router.push("/")} />
      <main className="flex-1 ml-64">
        <div className="container mx-auto px-8 py-6 max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push("/")} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{vaga.empresa}</h1>
                <p className="text-lg text-muted-foreground mb-1">{vaga.cargo}</p>
                <p className="text-sm text-muted-foreground">
                  Inscrição realizada em{" "}
                  {format(new Date(vaga.data_inscricao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <Button size="sm" onClick={() => setEditDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                <Edit2 className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>

          {/* CARD 1: Informações Gerais + Fit Scores */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Informações da Vaga
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Coluna 1: Informações Gerais */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-foreground mb-4">Informações Gerais</h3>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Empresa
                    </p>
                    <p className="text-sm font-semibold text-foreground">{vaga.empresa}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Cargo
                    </p>
                    <p className="text-sm font-semibold text-foreground">{vaga.cargo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Local
                    </p>
                    <p className="text-sm text-foreground">{vaga.local}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Modalidade</p>
                    <Badge variant="outline" className="bg-muted border-border">
                      {vaga.modalidade}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Status</p>
                    <Badge className={`${getStatusBadgeClasses(vaga.status)} text-sm font-semibold border`}>
                      {vaga.status}
                    </Badge>
                    {vaga.etapa && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Etapa: <span className="text-foreground font-medium">{vaga.etapa}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Coluna 2: Fit Scores */}
                <div className="space-y-6">
                  <h3 className="text-base font-semibold text-foreground mb-4">Fit</h3>

                  {/* Fit Requisitos */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Requisitos</p>
                    <div className="flex items-center gap-3">
                      <StarRating value={requisitos} readonly size="md" />
                      <span className="text-2xl font-bold text-foreground">{requisitos.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Fit Perfil */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Perfil</p>
                    <div className="flex items-center gap-3">
                      <StarRating value={perfil} readonly size="md" />
                      <span className="text-2xl font-bold text-foreground">{perfil.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CARD 2: Análise da Vaga (Full Width) */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Análise da Vaga
                </CardTitle>
                {!isEditingMarkdown && vaga.observacoes && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingMarkdown(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {vaga.observacoes ? (
                isEditingMarkdown ? (
                  <div className="space-y-3">
                    <MarkdownPreview
                      content={markdownContent}
                      editable={true}
                      onChange={setMarkdownContent}
                      className="min-h-[300px]"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveMarkdown}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMarkdownContent(vaga.observacoes || "")
                          setIsEditingMarkdown(false)
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <MarkdownPreview content={markdownContent} editable={false} className="max-h-[500px]" />
                )
              ) : (
                <p className="text-sm text-muted-foreground italic py-4">Nenhuma análise disponível para esta vaga.</p>
              )}

              {vaga.arquivo_analise_url && !isEditingMarkdown && (
                <div className="mt-4 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadPdf(vaga.arquivo_analise_url, "analise-vaga.md")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Análise Completa (.md)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Fit para Currículo</CardTitle>
            </CardHeader>
            <CardContent>
              <FitTab
                jobDescription={vaga.observacoes || ""}
                jobAnalysisData={jobAnalysisData}
                language="pt"
                profileText={profileText}
                onProfileTextChange={(text) => {
                  setProfileText(text)
                  setComplements(null)
                }}
                tagline={tagline}
                onTaglineChange={setTagline}
                isGeneratingProfile={isGeneratingProfile}
                onGenerateProfile={handleGenerateProfile}
                complements={complements}
                onComplementsChange={setComplements}
                isSelectingComplements={isSelectingComplements}
                onSelectComplements={handleSelectComplements}
                onContinueToCurriculo={() => {
                  document.getElementById("resume-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }}
              />
            </CardContent>
          </Card>

          {/* ✅ SEÇÃO DE CURRÍCULOS - SEMPRE VISÍVEL */}
          <section id="resume-section" className="space-y-6">
            <h2 className="text-2xl font-bold">Currículos Personalizados</h2>

            {/* PT - SEMPRE VISÍVEL */}
            <ResumeContainer
              language="pt"
              markdown={vaga.curriculo_text_pt || undefined}
              pdfUrl={vaga.arquivo_cv_url_pt}
              isGenerating={isGeneratingPDF === "pt"}
              isGeneratingPdf={isGeneratingPdfPT}
              isRefining={isRefiningResume === "pt"}
              activeModel={activeModel}
              activeTemplate={activeTemplate}
              vagaEmpresa={vaga.empresa}
              vagaId={vaga.id}
              onRegenerateContent={(model) => handleGenerateResume("pt", model)}
              onTemplateChange={(template) => {
                setActiveTemplate(template)
                localStorage.setItem("resume_template_preference", template)
              }}
              onGeneratePdf={() => handleGeneratePdf("pt")}
              onGeneratePdfWithHtml={(html) => handleGeneratePdfFromHtml("pt", html)}
              onDownloadPdf={() => handleDownloadPdf("pt")}
              onRefine={() => setRefineDialogLanguage("pt")}
              onEdit={() => handleEditResume("pt")}
              onDelete={() => handleDeleteResume("pt")}
            />

            {/* EN - SEMPRE VISÍVEL */}
            <ResumeContainer
              language="en"
              markdown={vaga.curriculo_text_en || undefined}
              pdfUrl={vaga.arquivo_cv_url_en}
              isGenerating={isGeneratingPDF === "en"}
              isGeneratingPdf={isGeneratingPdfEN}
              isRefining={isRefiningResume === "en"}
              activeModel={activeModel}
              activeTemplate={activeTemplate}
              vagaEmpresa={vaga.empresa}
              vagaId={vaga.id}
              onRegenerateContent={(model) => handleGenerateResume("en", model)}
              onTemplateChange={(template) => {
                setActiveTemplate(template)
                localStorage.setItem("resume_template_preference", template)
              }}
              onGeneratePdf={() => handleGeneratePdf("en")}
              onGeneratePdfWithHtml={(html) => handleGeneratePdfFromHtml("en", html)}
              onDownloadPdf={() => handleDownloadPdf("en")}
              onRefine={() => setRefineDialogLanguage("en")}
              onEdit={() => handleEditResume("en")}
              onDelete={() => handleDeleteResume("en")}
            />
          </section>

          <RefineResumeDialog
            language={refineDialogLanguage ?? "pt"}
            open={refineDialogLanguage !== null}
            onOpenChange={(open) => {
              if (!open && !isRefiningResume) {
                setRefineDialogLanguage(null)
              }
            }}
            isRefining={isRefiningResume !== null}
            onConfirm={handleRefineResume}
            activeModel={activeModel}
          />

          <EditVagaDialog vaga={vaga} open={editDialogOpen} onOpenChange={setEditDialogOpen} onSuccess={loadVaga} />

          {/* Modal de Edição de Currículo */}
          {editingResumeLanguage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b">
                  <h3 className="text-lg font-semibold">
                    Editar Currículo ({editingResumeLanguage === "pt" ? "Português" : "English"})
                  </h3>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <MarkdownPreview
                    content={editingResumeContent}
                    editable={true}
                    onChange={setEditingResumeContent}
                    className="min-h-[400px]"
                  />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingResumeLanguage(null)
                      setEditingResumeContent("")
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveResumeEdit}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
