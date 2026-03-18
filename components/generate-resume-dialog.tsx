"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface GenerateResumeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  language: "pt" | "en"
  vagaEmpresa: string
  activeModel: string
  onConfirm: (model: string) => void
  isGenerating: boolean
}

const DEFAULT_MODEL_OPTIONS = [
  "x-ai/grok-4.1-fast",
  "openrouter/hunter-alpha",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openai/gpt-5.4-nano",
  "mistralai/mistral-small-2603",
]

export function GenerateResumeDialog({
  open,
  onOpenChange,
  language,
  vagaEmpresa,
  activeModel,
  onConfirm,
  isGenerating,
}: GenerateResumeDialogProps) {
  const [selectedModel, setSelectedModel] = useState(activeModel)

  const modelOptions = useMemo(() => {
    if (!activeModel || DEFAULT_MODEL_OPTIONS.includes(activeModel)) {
      return DEFAULT_MODEL_OPTIONS
    }

    return [activeModel, ...DEFAULT_MODEL_OPTIONS]
  }, [activeModel])

  useEffect(() => {
    setSelectedModel(activeModel)
  }, [activeModel, open])

  const config =
    language === "pt"
      ? {
          title: "Gerar Curriculo — Portugues",
          description: vagaEmpresa,
          modelLabel: "Modelo",
          cancelLabel: "Cancelar",
          confirmLabel: "Gerar Curriculo",
          generatingLabel: "Gerando...",
        }
      : {
          title: "Generate Resume — English",
          description: vagaEmpresa,
          modelLabel: "Model",
          cancelLabel: "Cancel",
          confirmLabel: "Generate Resume",
          generatingLabel: "Generating...",
        }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="generate-model">{config.modelLabel}</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="generate-model" className="w-full">
                <SelectValue placeholder={config.modelLabel} />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            {config.cancelLabel}
          </Button>
          <Button onClick={() => onConfirm(selectedModel)} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {config.generatingLabel}
              </>
            ) : (
              config.confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
