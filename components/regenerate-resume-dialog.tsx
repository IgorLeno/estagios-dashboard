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
import { cn } from "@/lib/utils"
import { SUPPORTED_MODELS } from "@/lib/ai/models"

interface RegenerateResumeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "content" | "visual" | "both"
  language: "pt" | "en"
  vagaEmpresa: string
  activeModel: string
  activeTemplate: string
  isRegenerating: boolean
  onConfirm: (params: { model?: string; template?: string }) => void
}

const TEMPLATE_OPTIONS = [
  { value: "modelo1", label: "Manguizin" },
  { value: "modelo2", label: "Maryland" },
]

export function RegenerateResumeDialog({
  open,
  onOpenChange,
  mode,
  language,
  vagaEmpresa,
  activeModel,
  activeTemplate,
  isRegenerating,
  onConfirm,
}: RegenerateResumeDialogProps) {
  const [selectedModel, setSelectedModel] = useState(activeModel)
  const [selectedTemplate, setSelectedTemplate] = useState(activeTemplate)

  useEffect(() => {
    setSelectedModel(activeModel)
    setSelectedTemplate(activeTemplate)
  }, [open, activeModel, activeTemplate])

  const modelOptions = useMemo(() => {
    if (!activeModel || (SUPPORTED_MODELS as readonly string[]).includes(activeModel)) {
      return [...SUPPORTED_MODELS]
    }
    return [activeModel, ...SUPPORTED_MODELS]
  }, [activeModel])

  const isPt = language === "pt"

  const titleMap = {
    content: isPt ? "Regenerar Conteúdo" : "Regenerate Content",
    visual: isPt ? "Trocar Template Visual" : "Switch Visual Template",
    both: isPt ? "Regenerar Currículo Completo" : "Regenerate Full Resume",
  }

  const confirmLabelMap = {
    content: isPt ? "Regenerar Conteúdo" : "Regenerate Content",
    visual: isPt ? "Aplicar Template" : "Apply Template",
    both: isPt ? "Regenerar Tudo" : "Regenerate Everything",
  }

  const languageLabel = isPt ? "PT" : "EN"
  const description = `${vagaEmpresa} — ${languageLabel}`

  function handleConfirm() {
    if (mode === "content") {
      onConfirm({ model: selectedModel })
    } else if (mode === "visual") {
      onConfirm({ template: selectedTemplate })
    } else {
      onConfirm({ model: selectedModel, template: selectedTemplate })
    }
  }

  const showModel = mode === "content" || mode === "both"
  const showTemplate = mode === "visual" || mode === "both"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titleMap[mode]}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {showModel && (
            <div className="space-y-2">
              <Label htmlFor="regenerate-model">{isPt ? "Modelo de IA" : "AI Model"}</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="regenerate-model" className="w-full">
                  <SelectValue placeholder={isPt ? "Selecionar modelo" : "Select model"} />
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
          )}

          {showModel && showTemplate && <hr className="border-border" />}

          {showTemplate && (
            <div className="space-y-2">
              <Label>{isPt ? "Template Visual" : "Visual Template"}</Label>
              <div className="flex gap-2">
                {TEMPLATE_OPTIONS.map((tpl) => (
                  <button
                    key={tpl.value}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl.value)}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors",
                      selectedTemplate === tpl.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRegenerating}>
            {isPt ? "Cancelar" : "Cancel"}
          </Button>
          <Button onClick={handleConfirm} disabled={isRegenerating}>
            {isRegenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isPt ? "Aguarde..." : "Please wait..."}
              </>
            ) : (
              confirmLabelMap[mode]
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
