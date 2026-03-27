"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { ProfileTab } from "@/components/ai-settings/profile-tab"
import { SkillsTab } from "@/components/ai-settings/skills-tab"
import { ProjectsTab } from "@/components/ai-settings/projects-tab"
import { CertificationsTab } from "@/components/ai-settings/certifications-tab"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { EMPTY_CANDIDATE_PROFILE, type CandidateProfile } from "@/lib/types"
import { Bot, Info, Loader2, LogIn, Plus, RotateCcw, Save, Sparkles, User, X } from "lucide-react"
import { toast } from "sonner"
import { getModelFailureWarning, recordModelFailure, recordModelSuccess } from "@/lib/model-attempt-tracker"
import { useResumeTaglinePreference } from "@/hooks/use-resume-tagline-preference"

const MODEL_HISTORY_STORAGE_KEY = "openrouter_model_history"

type ProfileData = Omit<CandidateProfile, "id" | "user_id" | "created_at" | "updated_at">

function normalizeLanguageProficiency(proficiency?: string): string {
  switch (proficiency) {
    case "Basico":
      return "Básico"
    case "Intermediario":
      return "Intermediário"
    case "Avancado":
      return "Avançado"
    default:
      return proficiency ?? ""
  }
}

function normalizeProfileData(data?: Partial<CandidateProfile> | null): ProfileData {
  return {
    ...EMPTY_CANDIDATE_PROFILE,
    nome: data?.nome ?? "",
    email: data?.email ?? "",
    telefone: data?.telefone ?? "",
    linkedin: data?.linkedin ?? "",
    github: data?.github ?? "",
    localizacao_pt: data?.localizacao_pt ?? "",
    localizacao_en: data?.localizacao_en ?? "",
    disponibilidade: data?.disponibilidade ?? "",
    educacao: data?.educacao ?? [],
    idiomas: (data?.idiomas ?? []).map((idioma) => ({
      ...idioma,
      proficiency_pt: normalizeLanguageProficiency(idioma.proficiency_pt),
    })),
    objetivo_pt: data?.objetivo_pt ?? "",
    objetivo_en: data?.objetivo_en ?? "",
    tagline_pt: data?.tagline_pt ?? "",
    tagline_en: data?.tagline_en ?? "",
    habilidades: data?.habilidades ?? [],
    projetos: data?.projetos ?? [],
    certificacoes: data?.certificacoes ?? [],
  }
}

function mergeSkillCategories(
  existing: ProfileData["habilidades"],
  extracted: ProfileData["habilidades"]
): ProfileData["habilidades"] {
  const merged = existing.map((e) => ({ ...e }))
  for (const ext of extracted) {
    const matchIndex = merged.findIndex((e) => e.category_pt.toLowerCase() === ext.category_pt.toLowerCase())
    if (matchIndex !== -1) {
      const match = merged[matchIndex]
      const existingItems = new Set(match.items_pt.map((i) => i.toLowerCase()))
      const newItems = ext.items_pt.filter((i) => !existingItems.has(i.toLowerCase()))

      const existingEn = new Set((match.items_en ?? []).map((i) => i.toLowerCase()))
      const newEn = (ext.items_en ?? []).filter((i) => !existingEn.has(i.toLowerCase()))

      merged[matchIndex] = {
        ...match,
        items_pt: [...match.items_pt, ...newItems],
        items_en: [...(match.items_en ?? []), ...newEn],
      }
    } else {
      merged.push(ext)
    }
  }
  return merged
}

function mergeProfiles(existing: ProfileData, extracted: ProfileData): ProfileData {
  return {
    nome: existing.nome || extracted.nome,
    email: existing.email || extracted.email,
    telefone: existing.telefone || extracted.telefone,
    linkedin: existing.linkedin || extracted.linkedin,
    github: existing.github || extracted.github,
    localizacao_pt: existing.localizacao_pt || extracted.localizacao_pt,
    localizacao_en: existing.localizacao_en || extracted.localizacao_en,
    disponibilidade: existing.disponibilidade || extracted.disponibilidade,
    objetivo_pt: existing.objetivo_pt || extracted.objetivo_pt,
    objetivo_en: existing.objetivo_en || extracted.objetivo_en,
    tagline_pt: existing.tagline_pt || extracted.tagline_pt,
    tagline_en: existing.tagline_en || extracted.tagline_en,
    educacao: [...existing.educacao, ...extracted.educacao],
    idiomas: [...existing.idiomas, ...extracted.idiomas],
    habilidades: mergeSkillCategories(existing.habilidades, extracted.habilidades),
    projetos: [...existing.projetos, ...extracted.projetos],
    certificacoes: [...existing.certificacoes, ...extracted.certificacoes],
  }
}

function readModelHistory(): string[] {
  const stored = localStorage.getItem(MODEL_HISTORY_STORAGE_KEY)
  if (!stored) return []

  const parsed: unknown = JSON.parse(stored)
  if (!Array.isArray(parsed)) return []

  return parsed
    .filter((model): model is string => typeof model === "string")
    .map((model) => model.trim())
    .filter(Boolean)
    .slice(0, 20)
}

function persistModelHistory(history: string[]) {
  localStorage.setItem(MODEL_HISTORY_STORAGE_KEY, JSON.stringify(history))
}

export default function PerfilPage() {
  const [activeTab, setActiveTab] = useState<"perfil" | "gerador">("perfil")
  const [candidateProfile, setCandidateProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)

  const [rawText, setRawText] = useState("")
  const [isExtracting, setIsExtracting] = useState(false)
  const [selectedModel, setSelectedModel] = useState("")
  const [modelHistory, setModelHistory] = useState<string[]>([])
  const [showModelInput, setShowModelInput] = useState(false)
  const [newModelInput, setNewModelInput] = useState("")
  const [fillMode, setFillMode] = useState<"substituir" | "acrescentar">("substituir")
  const [modelFailureWarning, setModelFailureWarning] = useState<ReturnType<typeof getModelFailureWarning>>(null)
  const { value: useTagline, setValue: setUseTagline } = useResumeTaglinePreference()

  const router = useRouter()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRes, promptsRes] = await Promise.all([fetch("/api/candidate-profile"), fetch("/api/prompts")])
      const [profileData, promptsData] = await Promise.all([profileRes.json(), promptsRes.json()])

      setCandidateProfile(
        profileData.success && profileData.data ? normalizeProfileData(profileData.data) : normalizeProfileData()
      )

      const modelFromConfig = promptsData.success && promptsData.data ? promptsData.data.modelo_gemini ?? "" : ""
      setSelectedModel(modelFromConfig)
      setIsReadOnly(Boolean(profileData.isReadOnly || promptsData.isReadOnly))

      try {
        const history = readModelHistory()
        const updatedHistory = modelFromConfig
          ? [modelFromConfig, ...history.filter((model) => model !== modelFromConfig)].slice(0, 20)
          : history

        if (updatedHistory.length !== history.length || updatedHistory.some((model, index) => model !== history[index])) {
          persistModelHistory(updatedHistory)
        }

        setModelHistory(updatedHistory)
      } catch {
        setModelHistory(modelFromConfig ? [modelFromConfig] : [])
      }
    } catch (error) {
      console.error("[PerfilPage] Error loading:", error)
      setCandidateProfile(normalizeProfileData())
      toast.error("Erro ao carregar perfil")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    setModelFailureWarning(getModelFailureWarning(selectedModel))
  }, [selectedModel])

  function addModelToHistory(model: string) {
    const trimmed = model.trim()
    if (!trimmed) return

    setModelHistory((prev) => {
      const updated = [trimmed, ...prev.filter((entry) => entry !== trimmed)].slice(0, 20)
      persistModelHistory(updated)
      return updated
    })
  }

  function removeModelFromHistory(model: string) {
    if (model === selectedModel) return

    setModelHistory((prev) => {
      const updated = prev.filter((entry) => entry !== model)
      persistModelHistory(updated)
      return updated
    })
  }

  function selectModel(model: string) {
    setSelectedModel(model)
    addModelToHistory(model)
    setShowModelInput(false)
    setNewModelInput("")
  }

  function handleAddNewModel() {
    const trimmed = newModelInput.trim()
    if (!trimmed) return
    selectModel(trimmed)
  }

  async function handleSave() {
    if (!candidateProfile) return

    if (isReadOnly) {
      toast.error("Faça login para salvar o perfil")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/candidate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidateProfile),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Failed to save profile")
      }

      setCandidateProfile(normalizeProfileData(result.data))
      toast.success("Perfil salvo com sucesso!")
    } catch (error) {
      console.error("[PerfilPage] Error saving:", error)
      toast.error("Erro ao salvar perfil")
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (isReadOnly) {
      toast.error("Faça login para restaurar o perfil")
      return
    }

    const confirmed = window.confirm("Restaurar o perfil padrão? Todos os dados atuais serão removidos.")
    if (!confirmed) return

    setSaving(true)
    try {
      const response = await fetch("/api/candidate-profile", { method: "DELETE" })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to reset profile")
      }

      await loadData()
      toast.success("Perfil restaurado!")
    } catch (error) {
      console.error("[PerfilPage] Error resetting:", error)
      toast.error("Erro ao restaurar perfil")
    } finally {
      setSaving(false)
    }
  }

  async function handleExtractProfile() {
    if (isReadOnly) {
      toast.error("Faça login para usar o gerador de perfil")
      return
    }

    setIsExtracting(true)
    try {
      const response = await fetch("/api/ai/extract-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          ...(selectedModel ? { model: selectedModel } : {}),
          mode: fillMode,
          ...(fillMode === "acrescentar" && candidateProfile ? { existingProfile: candidateProfile } : {}),
        }),
      })

      if (!response.ok) {
        if (response.status >= 500) {
          recordModelFailure(selectedModel, "extract-profile")
          setModelFailureWarning(getModelFailureWarning(selectedModel))
        }
        throw new Error("Extraction failed")
      }

      const result = await response.json()
      const trackedModel = typeof result?.metadata?.model === "string" ? result.metadata.model : selectedModel
      recordModelSuccess(trackedModel, "extract-profile")
      setModelFailureWarning(getModelFailureWarning(trackedModel))
      const extracted = normalizeProfileData(result.data)

      if (fillMode === "acrescentar") {
        setCandidateProfile((prev) => mergeProfiles(prev ?? normalizeProfileData(), extracted))
      } else {
        setCandidateProfile((prev) =>
          normalizeProfileData({ ...(prev ?? EMPTY_CANDIDATE_PROFILE), ...(result.data ?? {}) })
        )
      }
      setActiveTab("perfil")
      toast.success("Perfil extraído! Revise os dados e clique em Salvar Perfil.")
    } catch (error) {
      console.error("[PerfilPage] Error extracting profile:", error)
      toast.error("Erro ao extrair perfil. Verifique o modelo selecionado e tente novamente.")
    } finally {
      setIsExtracting(false)
    }
  }

  if (loading || !candidateProfile) {
    return (
      <div className="min-h-screen flex bg-background mesh-bg">
        <Sidebar activeTab="perfil" />
        <main className="flex-1 ml-64">
          <div className="px-8 py-8 max-w-5xl mx-auto">
            <Card className="glass-card-intense">
              <CardContent className="p-12 text-center text-muted-foreground">Carregando perfil...</CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background mesh-bg">
      <Sidebar activeTab="perfil" />
      <main className="flex-1 ml-64">
        <div className="sticky top-0 z-40 h-0.5 w-full bg-gradient-to-r from-primary via-accent to-primary opacity-60" />
        <div className="px-8 py-8 max-w-5xl mx-auto space-y-6">
          <Card className="glass-card-intense hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <span>Perfil do Candidato</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isReadOnly && (
                <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                  <Info className="h-4 w-4 text-blue-500" />
                  <AlertTitle>Visualizando perfil padrão</AlertTitle>
                  <AlertDescription className="flex items-center justify-between gap-4">
                    <span>
                      Você está visualizando o perfil padrão do sistema. Para personalizar e salvar seus dados, faça login.
                    </span>
                    <Button variant="outline" size="sm" onClick={() => router.push("/admin/login")} className="shrink-0">
                      <LogIn className="mr-2 h-4 w-4" />
                      Fazer Login
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "perfil" | "gerador")} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="perfil">Perfil</TabsTrigger>
                  <TabsTrigger value="gerador">Gerador de Perfil</TabsTrigger>
                </TabsList>

                <TabsContent value="perfil" className="space-y-6 mt-6">
                  <Card className="glass-card-intense hover-lift">
                    <CardHeader>
                      <CardTitle>Preferências do Currículo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background/70 p-4">
                        <input
                          type="checkbox"
                          checked={useTagline}
                          onChange={(e) => setUseTagline(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-border"
                        />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Incluir tagline no currículo</p>
                          <p className="text-xs text-muted-foreground">
                            Quando desativado aqui, a tagline continua salva, mas fica desabilitada na FitTab e não é usada
                            na geração de currículo nem na página de detalhes da vaga.
                          </p>
                        </div>
                      </label>
                    </CardContent>
                  </Card>

                  <Card className="glass-card-intense hover-lift">
                    <CardHeader>
                      <CardTitle>Dados Pessoais</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ProfileTab profile={candidateProfile} onChange={setCandidateProfile} disabled={isReadOnly} />
                    </CardContent>
                  </Card>

                  <Card className="glass-card-intense hover-lift">
                    <CardHeader>
                      <CardTitle>Habilidades</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SkillsTab profile={candidateProfile} onChange={setCandidateProfile} disabled={isReadOnly} />
                    </CardContent>
                  </Card>

                  <Card className="glass-card-intense hover-lift">
                    <CardHeader>
                      <CardTitle>Projetos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ProjectsTab profile={candidateProfile} onChange={setCandidateProfile} disabled={isReadOnly} />
                    </CardContent>
                  </Card>

                  <Card className="glass-card-intense hover-lift">
                    <CardHeader>
                      <CardTitle>Certificações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CertificationsTab profile={candidateProfile} onChange={setCandidateProfile} disabled={isReadOnly} />
                    </CardContent>
                  </Card>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={handleReset} disabled={saving || isReadOnly}>
                      <RotateCcw className="h-4 w-4 mr-2" /> Restaurar Padrão
                    </Button>
                    <Button onClick={handleSave} disabled={saving || isReadOnly}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Salvando..." : "Salvar Perfil"}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="gerador" className="space-y-6 mt-6">
                  <Card className="glass-card-intense hover-lift">
                    <CardHeader>
                      <CardTitle>Modelo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {modelFailureWarning && selectedModel && (
                        <Alert className="border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                          <Info className="h-4 w-4 text-amber-600" />
                          <AlertTitle>Modelo com falhas recentes</AlertTitle>
                          <AlertDescription>
                            O modelo <strong>{selectedModel}</strong> falhou nas últimas{" "}
                            {modelFailureWarning.consecutiveFailures} tentativas registradas neste navegador. Considere
                            alternar temporariamente para <strong>x-ai/grok-4.1-fast</strong>.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-3">
                        <Label>Modelo LLM para extração</Label>

                        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
                          <Bot className="h-4 w-4 shrink-0 text-primary" />
                          <span className="flex-1 truncate text-sm font-medium">{selectedModel || "Selecione um modelo"}</span>
                          <Badge variant="secondary">ativo</Badge>
                        </div>

                        {modelHistory.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Histórico de modelos:</p>
                            <div className="max-h-48 space-y-1 overflow-y-auto">
                              {modelHistory.map((model) => (
                                <div
                                  key={model}
                                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                                    model === selectedModel
                                      ? "cursor-default border-primary/30 bg-primary/10"
                                      : "cursor-pointer border-border bg-muted/50 hover:border-primary/20 hover:bg-muted"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    className="flex-1 truncate text-left text-sm"
                                    onClick={() => model !== selectedModel && selectModel(model)}
                                    disabled={model === selectedModel || isReadOnly}
                                  >
                                    {model}
                                  </button>
                                  {model !== selectedModel && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        removeModelFromHistory(model)
                                      }}
                                      className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                                      title="Remover do histórico"
                                      disabled={isReadOnly}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {showModelInput ? (
                          <div className="flex gap-2">
                            <Input
                              value={newModelInput}
                              onChange={(e) => setNewModelInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  handleAddNewModel()
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault()
                                  setShowModelInput(false)
                                  setNewModelInput("")
                                }
                              }}
                              placeholder="Ex: x-ai/grok-4.1-fast"
                              className="bg-background text-sm"
                              disabled={isReadOnly}
                              autoFocus
                            />
                            <Button type="button" size="sm" onClick={handleAddNewModel} disabled={!newModelInput.trim() || isReadOnly}>
                              Usar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setShowModelInput(false)
                                setNewModelInput("")
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowModelInput(true)}
                            disabled={isReadOnly}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Adicionar modelo diferente
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card-intense hover-lift">
                    <CardHeader>
                      <CardTitle>Cole seu perfil aqui</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        rows={14}
                        className="bg-background font-mono text-sm"
                        placeholder="Cole seu currículo, LinkedIn, ou descreva seu perfil em texto livre. A IA irá extrair e preencher automaticamente todos os campos."
                        disabled={isExtracting}
                      />
                    </CardContent>
                  </Card>

                  <Card className="glass-card-intense hover-lift">
                    <CardHeader>
                      <CardTitle>Ação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-end">
                        <div className="inline-flex rounded-lg border border-border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setFillMode("substituir")}
                            disabled={isReadOnly}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                              fillMode === "substituir"
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            Substituir
                          </button>
                          <button
                            type="button"
                            onClick={() => setFillMode("acrescentar")}
                            disabled={isReadOnly}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                              fillMode === "acrescentar"
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            Acrescentar
                          </button>
                        </div>
                      </div>

                      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                        <Info className="h-4 w-4 text-blue-500" />
                        <AlertDescription>
                          {fillMode === "substituir"
                            ? "O preenchimento automático irá substituir os dados atuais do perfil. Revise os campos antes de salvar."
                            : "O preenchimento automático irá acrescentar novos dados ao perfil existente, sem remover informações já cadastradas."}
                        </AlertDescription>
                      </Alert>

                      <Button
                        onClick={handleExtractProfile}
                        disabled={!rawText.trim() || isExtracting || isReadOnly}
                        className="w-full"
                        size="lg"
                      >
                        {isExtracting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando perfil...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" /> Preencher Perfil
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
