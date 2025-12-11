"use client"

/**
 * Skills Import Dialog
 * Allows users to import skills by pasting their professional profile (dossiê, CV)
 * LLM extracts and categorizes skills automatically
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Sparkles, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface SkillsImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void // Callback after successful import
}

export function SkillsImportDialog({ open, onOpenChange, onSuccess }: SkillsImportDialogProps) {
  const [profileText, setProfileText] = useState("")
  const [mode, setMode] = useState<"replace" | "merge">("replace")
  const [isLoading, setIsLoading] = useState(false)

  async function handleImport() {
    if (!profileText.trim()) {
      toast.error("Cole seu perfil profissional para continuar")
      return
    }

    if (profileText.trim().length < 50) {
      toast.error("Texto muito curto. Forneça pelo menos 50 caracteres.")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/skills/extract-from-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileText: profileText.trim(),
          mode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao extrair skills")
      }

      // Show success message with count
      const count = data.data?.skills_count || 0
      const modeLabel = mode === "replace" ? "substituídas" : "adicionadas"

      toast.success(`✅ ${count} skills ${modeLabel} com sucesso!`, {
        description: data.data?.categories_summary
          ? `Programming: ${data.data.categories_summary.programming_and_data}, Engineering: ${data.data.categories_summary.engineering_tools}, BI: ${data.data.categories_summary.visualization_and_bi}, Soft: ${data.data.categories_summary.soft_skills}`
          : undefined,
      })

      // Reset form
      setProfileText("")
      setMode("replace")

      // Close dialog
      onOpenChange(false)

      // Call success callback if provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Error importing skills:", error)
      toast.error(error instanceof Error ? error.message : "Erro desconhecido ao extrair skills")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importar Skills do Perfil
          </DialogTitle>
          <DialogDescription>
            Cole seu dossiê profissional, currículo ou descrição de experiências. A IA irá extrair automaticamente suas
            skills e categorizá-las.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Modo de Importação</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("replace")}
                disabled={isLoading}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-all hover:bg-accent",
                  mode === "replace" ? "border-primary bg-accent" : "border-muted"
                )}
              >
                <span className="font-medium">Substituir</span>
                <span className="text-xs text-muted-foreground">
                  Remove todas skills antigas e insere as novas (recomendado)
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("merge")}
                disabled={isLoading}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-all hover:bg-accent",
                  mode === "merge" ? "border-primary bg-accent" : "border-muted"
                )}
              >
                <span className="font-medium">Mesclar</span>
                <span className="text-xs text-muted-foreground">
                  Adiciona apenas skills novas, mantém as existentes
                </span>
              </button>
            </div>
          </div>

          {/* Profile Text Input */}
          <div className="space-y-2">
            <Label htmlFor="profile-text" className="text-sm font-medium">
              Perfil Profissional
            </Label>
            <Textarea
              id="profile-text"
              placeholder={`Cole aqui seu perfil profissional completo...

Exemplo:
"Engenheiro Químico pela UNESP, desenvolvi o projeto Grimperium em Python com Pandas e CREST para automação de dados moleculares. Na iniciação científica, usei GAMESS para cálculos quânticos. Tenho certificação em Deep Learning e Power BI. Experiência em laboratório com preparação de soluções e titulações."`}
              value={profileText}
              onChange={(e) => setProfileText(e.target.value)}
              rows={14}
              className="font-mono text-sm resize-none"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {profileText.length} caracteres {profileText.length < 50 && `(mínimo: 50)`}
            </p>
          </div>

          {/* Example Suggestion */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-xs text-muted-foreground">
                <strong>Dica:</strong> Inclua seus projetos, experiências acadêmicas, certificações, ferramentas que
                domina, e soft skills. Quanto mais contexto, melhor a extração.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={isLoading || !profileText.trim() || profileText.length < 50}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extraindo Skills...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Extrair Skills
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
