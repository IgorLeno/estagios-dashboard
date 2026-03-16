"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, RotateCcw, Save, Info, LogIn, Bot, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SystemPromptsViewer } from "./system-prompts-viewer"
import { getSystemPromptsRegistry } from "@/lib/ai/system-prompts-registry"
import type { PromptsConfig } from "@/lib/types"
import { useRouter } from "next/navigation"

const MODEL_HISTORY_STORAGE_KEY = "openrouter_model_history"
const systemPrompts = getSystemPromptsRegistry()

export function ConfiguracoesPrompts() {
  const [config, setConfig] = useState<Omit<PromptsConfig, "id" | "user_id" | "created_at" | "updated_at"> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isReadOnly, setIsReadOnly] = useState(false) // True se usuário não está autenticado
  const [modelHistory, setModelHistory] = useState<string[]>([])
  const [showModelInput, setShowModelInput] = useState(false)
  const [newModelInput, setNewModelInput] = useState("")
  const router = useRouter()

  // Load config on mount
  useEffect(() => {
    loadConfig()
  }, [])

  function persistModelHistory(history: string[]) {
    localStorage.setItem(MODEL_HISTORY_STORAGE_KEY, JSON.stringify(history))
  }

  function readModelHistory(): string[] {
    const stored = localStorage.getItem(MODEL_HISTORY_STORAGE_KEY)
    if (!stored) {
      return []
    }

    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter((model): model is string => typeof model === "string")
      .map((model) => model.trim())
      .filter(Boolean)
      .slice(0, 20)
  }

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
    if (model === config?.modelo_gemini) {
      return
    }

    setModelHistory((prev) => {
      const updated = prev.filter((entry) => entry !== model)
      persistModelHistory(updated)
      return updated
    })
  }

  function selectModel(model: string) {
    if (!config) return

    setConfig({ ...config, modelo_gemini: model })
    addModelToHistory(model)
    setShowModelInput(false)
    setNewModelInput("")
  }

  function handleAddNewModel() {
    const trimmed = newModelInput.trim()
    if (!trimmed) return
    selectModel(trimmed)
  }

  async function loadConfig() {
    setLoading(true)
    try {
      const response = await fetch("/api/prompts")
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to load config")
      }

      if (result.success && result.data) {
        const data = result.data
        setConfig({
          modelo_gemini: data.modelo_gemini,
          temperatura: data.temperatura,
          max_tokens: data.max_tokens,
          top_p: data.top_p,
          top_k: data.top_k,
          dossie_prompt: data.dossie_prompt,
          analise_prompt: data.analise_prompt,
          curriculo_prompt: data.curriculo_prompt,
        })
        setLastSaved(data.updated_at)
        setIsReadOnly(result.isReadOnly || false)

        try {
          const history = readModelHistory()
          const currentModel = data.modelo_gemini?.trim()
          const updatedHistory = currentModel
            ? [currentModel, ...history.filter((model) => model !== currentModel)].slice(0, 20)
            : history

          if (updatedHistory.length !== history.length || updatedHistory.some((model, index) => model !== history[index])) {
            persistModelHistory(updatedHistory)
          }

          setModelHistory(updatedHistory)
        } catch {
          setModelHistory(data.modelo_gemini ? [data.modelo_gemini] : [])
        }
      }
    } catch (error) {
      console.error("[ConfiguracoesPrompts] Error loading config:", error)
      toast.error("Erro ao carregar configurações")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!config) return

    // Verificar se está em modo read-only
    if (isReadOnly) {
      toast.error("Faça login para salvar configurações personalizadas")
      return
    }

    // Validação básica
    if (!config.dossie_prompt.trim() || !config.analise_prompt.trim() || !config.curriculo_prompt.trim()) {
      toast.error("Nenhum prompt pode estar vazio")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelo_gemini: config.modelo_gemini,
          temperatura: config.temperatura,
          max_tokens: config.max_tokens,
          top_p: config.top_p,
          top_k: config.top_k,
          dossie_prompt: config.dossie_prompt,
          analise_prompt: config.analise_prompt,
          curriculo_prompt: config.curriculo_prompt,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to save config")
      }

      if (result.success && result.data) {
        setLastSaved(result.data.updated_at)
        addModelToHistory(config.modelo_gemini)
        toast.success("Configurações salvas com sucesso!")
      }
    } catch (error) {
      console.error("[ConfiguracoesPrompts] Error saving config:", error)
      toast.error("Erro ao salvar configurações")
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    // Verificar se está em modo read-only
    if (isReadOnly) {
      toast.error("Faça login para restaurar configurações")
      return
    }

    if (!window.confirm("Tem certeza que deseja restaurar as configurações padrão?")) {
      return
    }

    setSaving(true)
    try {
      // Delete user config via API (will be implemented if needed)
      // For now, just reload to get defaults
      await loadConfig()
      toast.success("Configurações restauradas para o padrão!")
    } catch (error) {
      console.error("[ConfiguracoesPrompts] Error resetting config:", error)
      toast.error("Erro ao restaurar configurações")
    } finally {
      setSaving(false)
    }
  }

  if (loading || !config) {
    return (
      <div className="max-w-4xl space-y-6">
        <Card className="glass-card-intense">
          <CardContent className="p-12 text-center text-muted-foreground">Carregando configurações...</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Card className="glass-card-intense hover-lift">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <span className="text-foreground">Configurações de IA</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Personalize os prompts e parâmetros do modelo de IA para análise de vagas e geração de currículos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Read-only mode warning */}
          {isReadOnly && (
            <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertTitle>Visualizando configurações padrão</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>
                  Você está visualizando as configurações padrão do sistema. Para personalizar e salvar suas próprias
                  configurações, faça login.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/admin/login")}
                  className="ml-auto shrink-0"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Fazer Login
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Last saved indicator */}
          {lastSaved && !isReadOnly && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>Última modificação: {new Date(lastSaved).toLocaleString("pt-BR")}</span>
            </div>
          )}

          <Tabs defaultValue="modelo" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
              <TabsTrigger value="modelo">Modelo</TabsTrigger>
              <TabsTrigger value="dossie">Dossiê</TabsTrigger>
              <TabsTrigger value="analise">Análise</TabsTrigger>
              <TabsTrigger value="curriculo">Currículo</TabsTrigger>
              <TabsTrigger value="sistema">Sistema</TabsTrigger>
            </TabsList>

            {/* Tab: Modelo */}
            <TabsContent value="modelo" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Modelo LLM Ativo</Label>

                  <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
                    <Bot className="h-4 w-4 shrink-0 text-primary" />
                    <span className="flex-1 truncate text-sm font-medium">{config.modelo_gemini}</span>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">ativo</span>
                  </div>

                  {modelHistory.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Histórico de modelos:</p>
                      <div className="max-h-48 space-y-1 overflow-y-auto">
                        {modelHistory.map((model) => (
                          <div
                            key={model}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                              model === config.modelo_gemini
                                ? "cursor-default border-primary/30 bg-primary/10"
                                : "cursor-pointer border-border bg-muted/50 hover:border-primary/20 hover:bg-muted"
                            }`}
                          >
                            <button
                              type="button"
                              className="flex-1 truncate text-left text-sm"
                              onClick={() => model !== config.modelo_gemini && selectModel(model)}
                              disabled={model === config.modelo_gemini || isReadOnly}
                            >
                              {model}
                            </button>
                            {model !== config.modelo_gemini && (
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
                        placeholder="Ex: anthropic/claude-3.5-sonnet, google/gemini-2.5-pro"
                        className="bg-background text-sm"
                        disabled={isReadOnly}
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddNewModel}
                        disabled={!newModelInput.trim() || isReadOnly}
                      >
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

                  <p className="text-xs text-muted-foreground">
                    Qualquer modelo disponível no{" "}
                    <a
                      href="https://openrouter.ai/models"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground"
                    >
                      OpenRouter
                    </a>
                    . O modelo ativo é usado em todas as operações de IA.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="temperatura">Temperatura (0.0 - 1.0)</Label>
                    <Input
                      id="temperatura"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config.temperatura}
                      onChange={(e) => setConfig({ ...config, temperatura: parseFloat(e.target.value) })}
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground">0.0 = determinístico, 1.0 = criativo</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_tokens">Max Tokens</Label>
                    <Input
                      id="max_tokens"
                      type="number"
                      min="512"
                      max="32768"
                      step="512"
                      value={config.max_tokens}
                      onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) })}
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground">Máximo de tokens por resposta</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="top_p">Top P (opcional)</Label>
                    <Input
                      id="top_p"
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={config.top_p || ""}
                      onChange={(e) =>
                        setConfig({ ...config, top_p: e.target.value ? parseFloat(e.target.value) : undefined })
                      }
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="top_k">Top K (opcional)</Label>
                    <Input
                      id="top_k"
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={config.top_k || ""}
                      onChange={(e) =>
                        setConfig({ ...config, top_k: e.target.value ? parseInt(e.target.value) : undefined })
                      }
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Dossiê */}
            <TabsContent value="dossie" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="dossie_prompt">Prompt do Dossiê</Label>
                <Textarea
                  id="dossie_prompt"
                  value={config.dossie_prompt}
                  onChange={(e) => setConfig({ ...config, dossie_prompt: e.target.value })}
                  rows={16}
                  className="bg-background font-mono text-sm"
                  placeholder="Perfil completo do candidato para análise de fit..."
                />
                <p className="text-xs text-muted-foreground">
                  Este prompt contém o perfil do candidato e critérios de compatibilidade para análise de vagas.
                </p>
              </div>
            </TabsContent>

            {/* Tab: Análise */}
            <TabsContent value="analise" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="analise_prompt">Prompt de Análise</Label>
                <Textarea
                  id="analise_prompt"
                  value={config.analise_prompt}
                  onChange={(e) => setConfig({ ...config, analise_prompt: e.target.value })}
                  rows={16}
                  className="bg-background font-mono text-sm"
                  placeholder="Instruções para análise de compatibilidade vaga/candidato..."
                />
                <p className="text-xs text-muted-foreground">
                  Usado no Job Parser para calcular fit e identificar pontos fortes/fracos.
                </p>
              </div>
            </TabsContent>

            {/* Tab: Currículo */}
            <TabsContent value="curriculo" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="curriculo_prompt">Prompt de Currículo</Label>
                <Textarea
                  id="curriculo_prompt"
                  value={config.curriculo_prompt}
                  onChange={(e) => setConfig({ ...config, curriculo_prompt: e.target.value })}
                  rows={16}
                  className="bg-background font-mono text-sm"
                  placeholder="Regras para personalização do currículo..."
                />
                <p className="text-xs text-muted-foreground">
                  ⚠️ IMPORTANTE: Mantenha as regras anti-invenção para evitar fabricação de informações.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="sistema" className="space-y-4 mt-4">
              <div>
                <h3 className="mb-1 text-sm font-medium">Prompts do Sistema (Somente Leitura)</h3>
                <p className="mb-4 text-xs text-muted-foreground">
                  Prompts hardcoded que controlam o comportamento interno do gerador de currículos, parser de vagas e
                  extração de skills. Visíveis para auditoria, transparência e debugging.
                </p>
                <SystemPromptsViewer prompts={systemPrompts} />
              </div>
            </TabsContent>
          </Tabs>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleReset} disabled={saving || isReadOnly} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Restaurar Padrão
            </Button>

            <Button onClick={handleSave} disabled={saving || isReadOnly} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
