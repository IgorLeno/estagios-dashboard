"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Bot, Loader2, Plus, Sparkles, X } from "lucide-react"

interface DescricaoTabProps {
  description: string
  setDescription: (value: string) => void
  analyzing: boolean
  onFillJobData: () => Promise<void>
  activeModel: string
  modelHistory: string[]
  onModelChange: (model: string) => void
  onModelHistoryChange: (history: string[]) => void
}

const MIN_CHARS = 50
const MAX_CHARS = 50000
const MODEL_HISTORY_LIMIT = 20

function normalizeModelHistory(history: string[]) {
  return history
    .map((model) => model.trim())
    .filter(Boolean)
    .filter((model, index, allModels) => allModels.indexOf(model) === index)
    .slice(0, MODEL_HISTORY_LIMIT)
}

export function DescricaoTab({
  description,
  setDescription,
  analyzing,
  onFillJobData,
  activeModel,
  modelHistory,
  onModelChange,
  onModelHistoryChange,
}: DescricaoTabProps) {
  const charCount = description.length
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS
  const [showModelInput, setShowModelInput] = useState(false)
  const [newModelInput, setNewModelInput] = useState("")

  function selectModel(model: string) {
    const trimmed = model.trim()
    if (!trimmed) return

    onModelChange(trimmed)
    onModelHistoryChange(normalizeModelHistory([trimmed, ...modelHistory]))
    setShowModelInput(false)
    setNewModelInput("")
  }

  function removeModelFromHistory(model: string) {
    if (model === activeModel) return
    onModelHistoryChange(modelHistory.filter((entry) => entry !== model))
  }

  function handleAddNewModel() {
    selectModel(newModelInput)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="descricao">Descrição da Vaga</Label>
          <span
            className={`text-xs ${
              charCount < MIN_CHARS
                ? "text-muted-foreground"
                : charCount > MAX_CHARS
                  ? "text-destructive"
                  : "text-green-600"
            }`}
          >
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} caracteres
            {charCount < MIN_CHARS && ` (mín. ${MIN_CHARS})`}
          </span>
        </div>

        <Textarea
          id="descricao"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Cole a descrição completa da vaga aqui (mínimo 50 caracteres)..."
          rows={14}
          className="font-mono text-sm resize-none"
          disabled={analyzing}
        />

        <p className="text-xs text-muted-foreground">
          Cole a descrição da vaga do LinkedIn, Indeed, e-mail ou site da empresa. A IA vai extrair empresa, cargo,
          local, requisitos e muito mais.
        </p>
      </div>

      <div className="space-y-3">
        <Label>Modelo LLM</Label>

        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
          <Bot className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1 truncate text-sm font-medium">{activeModel || "Selecione um modelo"}</span>
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
                    model === activeModel
                      ? "cursor-default border-primary/30 bg-primary/10"
                      : "cursor-pointer border-border bg-muted/50 hover:border-primary/20 hover:bg-muted"
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 truncate text-left text-sm"
                    onClick={() => model !== activeModel && selectModel(model)}
                    disabled={model === activeModel || analyzing}
                  >
                    {model}
                  </button>
                  {model !== activeModel && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        removeModelFromHistory(model)
                      }}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                      title="Remover do histórico"
                      disabled={analyzing}
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
              onChange={(event) => setNewModelInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  handleAddNewModel()
                }
                if (event.key === "Escape") {
                  event.preventDefault()
                  setShowModelInput(false)
                  setNewModelInput("")
                }
              }}
              placeholder="Ex: x-ai/grok-4.1-fast"
              className="bg-background text-sm"
              disabled={analyzing}
              autoFocus
            />
            <Button type="button" size="sm" onClick={handleAddNewModel} disabled={!newModelInput.trim() || analyzing}>
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
              disabled={analyzing}
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
            disabled={analyzing}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar modelo diferente
          </Button>
        )}
      </div>

      <Button onClick={onFillJobData} disabled={!isValid || analyzing} className="w-full" size="lg">
        {analyzing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Realizando Análise...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Realizar Análise
          </>
        )}
      </Button>
    </div>
  )
}
