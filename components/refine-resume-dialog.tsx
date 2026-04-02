"use client"

import { useEffect, useMemo, useState } from "react"
import { Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Textarea } from "@/components/ui/textarea"
import { SUPPORTED_MODELS } from "@/lib/ai/models"

interface RefineResumeDialogProps {
  language: "pt" | "en"
  open: boolean
  onOpenChange: (open: boolean) => void
  isRefining: boolean
  onConfirm: (instructions: string, model: string) => void
  activeModel: string
  contentType?: "resume" | "cover-letter"
}

export function RefineResumeDialog({
  language,
  open,
  onOpenChange,
  isRefining,
  onConfirm,
  activeModel,
  contentType = "resume",
}: RefineResumeDialogProps) {
  const [instructions, setInstructions] = useState("")
  const [selectedModel, setSelectedModel] = useState(activeModel)

  const modelOptions = useMemo(() => {
    if (!activeModel || (SUPPORTED_MODELS as readonly string[]).includes(activeModel)) {
      return [...SUPPORTED_MODELS]
    }

    return [activeModel, ...SUPPORTED_MODELS]
  }, [activeModel])

  useEffect(() => {
    if (open) {
      setSelectedModel(activeModel)
      return
    }

    setInstructions("")
    setSelectedModel(activeModel)
  }, [activeModel, open])

  const config =
    language === "pt"
      ? {
          title:
            contentType === "cover-letter" ? "Refinar Carta de Apresentação — Português" : "Refinar Currículo — Português",
          description:
            contentType === "cover-letter"
              ? "Ajuste a carta existente com instruções específicas, sem gerar uma nova do zero."
              : "Ajuste o currículo existente com instruções específicas, sem regenerar do zero.",
          modelLabel: "Modelo",
          instructionsLabel: "Instruções",
          placeholder:
            contentType === "cover-letter"
              ? "Ex.: Deixe o segundo parágrafo mais objetivo, destaque mais a aderência à vaga e reduza a repetição no fechamento."
              : "Ex.: Destaque mais a experiência com Python e dados. Reduza repetição no resumo e deixe o tom mais objetivo.",
          alertTitle: "Como funciona",
          alertDescription:
            contentType === "cover-letter"
              ? "O texto refinado substitui a carta atual e invalida o PDF em memória. Depois do refinamento, visualize ou baixe novamente para gerar a versão atualizada."
              : "O texto refinado substitui o markdown atual e invalida o PDF salvo. Depois do refinamento, gere o PDF novamente para baixar a versão atualizada.",
          cancelLabel: "Cancelar",
          confirmLabel: "Refinar",
          refiningLabel: "Refinando...",
        }
      : {
          title: contentType === "cover-letter" ? "Refine Cover Letter — English" : "Refine Resume — English",
          description:
            contentType === "cover-letter"
              ? "Adjust the current cover letter with targeted instructions instead of generating a new one from scratch."
              : "Adjust the existing resume with targeted instructions instead of regenerating it from scratch.",
          modelLabel: "Model",
          instructionsLabel: "Instructions",
          placeholder:
            contentType === "cover-letter"
              ? "Ex.: Make the second paragraph more concise, strengthen the match to the role, and tighten the closing."
              : "Ex.: Emphasize Python and data experience. Reduce repetition in the summary and make the tone more concise.",
          alertTitle: "What will happen",
          alertDescription:
            contentType === "cover-letter"
              ? "The refined text replaces the current cover letter and invalidates the in-memory PDF. Preview or download again afterward to generate the updated version."
              : "The refined text replaces the current markdown resume and invalidates the saved PDF. Generate the PDF again afterward to download the updated version.",
          cancelLabel: "Cancel",
          confirmLabel: "Refine",
          refiningLabel: "Refining...",
        }

  const isConfirmDisabled = instructions.trim().length < 10 || isRefining

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refine-model">{config.modelLabel}</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="refine-model" className="w-full">
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

            <div className="space-y-2">
              <Label htmlFor="refine-instructions">{config.instructionsLabel}</Label>
              <Textarea
                id="refine-instructions"
                className="min-h-[120px] max-h-[240px] resize-none overflow-y-auto"
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder={config.placeholder}
              />
            </div>

            <Alert className="border-primary/25 bg-primary/5 text-foreground [&>svg]:text-primary">
              <Info />
              <AlertTitle>{config.alertTitle}</AlertTitle>
              <AlertDescription>{config.alertDescription}</AlertDescription>
            </Alert>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRefining}>
            {config.cancelLabel}
          </Button>
          <Button onClick={() => onConfirm(instructions.trim(), selectedModel)} disabled={isConfirmDisabled}>
            {isRefining ? config.refiningLabel : config.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
