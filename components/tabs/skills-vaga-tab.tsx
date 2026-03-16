"use client"

import { CheckCircle2, Loader2, PlusCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { JobSkillReview, SkillUsageMode } from "@/lib/ai/types"

interface SkillsVagaTabProps {
  vagaId?: string
  skills: JobSkillReview[]
  isLoading: boolean
  isLoaded: boolean
  onChange: (skills: JobSkillReview[]) => void
  onLoad: () => Promise<void>
  onNextTab?: () => void
}

export function SkillsVagaTab({
  vagaId,
  skills,
  isLoading,
  isLoaded,
  onChange,
  onLoad,
}: SkillsVagaTabProps) {
  function handleModeChange(skill: JobSkillReview, newMode: SkillUsageMode) {
    onChange(
      skills.map((s) =>
        s.originalName === skill.originalName
          ? {
              ...s,
              mode: newMode,
              displayName: newMode !== "rename" ? s.originalName : s.displayName,
            }
          : s
      )
    )
  }

  function handleRenameChange(skill: JobSkillReview, newName: string) {
    onChange(
      skills.map((s) =>
        s.originalName === skill.originalName
          ? { ...s, displayName: newName }
          : s
      )
    )
  }

  async function handleAddToBank(skill: JobSkillReview) {
    try {
      const res = await fetch("/api/skills-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill: skill.displayName,
          category: skill.category ?? "Soft Skills",
        }),
      })

      if (res.ok || res.status === 409) {
        onChange(
          skills.map((s) =>
            s.originalName === skill.originalName ? { ...s, inBank: true } : s
          )
        )
        toast.success(`"${skill.displayName}" adicionada ao banco de skills`)
      } else {
        toast.error("Erro ao adicionar skill ao banco")
      }
    } catch {
      toast.error("Erro ao adicionar skill ao banco")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Skills da Vaga</h3>
          <p className="text-sm text-muted-foreground">
            Revise as skills exigidas e defina como usá-las no currículo.
          </p>
        </div>
        {isLoaded && (
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="text-green-600 font-medium">
              {skills.filter((s) => s.mode === "use" || s.mode === "rename").length} aprovadas
            </span>
            <span>·</span>
            <span>{skills.length} total</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/50 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : isLoaded && skills.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma skill encontrada na descrição desta vaga.
        </p>
      ) : !isLoaded && !isLoading ? (
        <div className="flex flex-col items-start gap-2">
          <Button onClick={onLoad} variant="outline">
            <Loader2 className="w-4 h-4 mr-2" />
            Carregar skills da vaga
          </Button>
          {!vagaId && <p className="text-xs text-muted-foreground">A extração usa a descrição da vaga analisada.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {skills.map((skill) => (
            <div
              key={skill.originalName}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg",
                skill.mode === "use" && "border-l-4 border-green-500 bg-green-500/10",
                skill.mode === "skip" && "border-l-4 border-red-500 bg-red-500/10",
                skill.mode === "rename" && "border-l-4 border-blue-500 bg-blue-500/10"
              )}
            >
              {skill.mode !== "rename" ? (
                <span className="flex-1 text-sm font-medium">{skill.displayName}</span>
              ) : (
                <input
                  value={skill.displayName}
                  onChange={(e) => handleRenameChange(skill, e.target.value)}
                  className="flex-1 text-sm bg-transparent border-b border-blue-400 focus:outline-none focus:border-blue-600 px-1"
                  autoFocus
                />
              )}

              <div className="flex rounded-md border overflow-hidden">
                {(["use", "skip", "rename"] as SkillUsageMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleModeChange(skill, mode)}
                    className={cn(
                      "px-2 py-1 text-xs border-r last:border-r-0 transition-colors",
                      skill.mode === mode
                        ? mode === "use"
                          ? "bg-green-500 text-white"
                          : mode === "skip"
                            ? "bg-red-500 text-white"
                            : "bg-blue-500 text-white"
                        : "bg-background hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {mode === "use" ? "Usar" : mode === "skip" ? "Não usar" : "Outro nome"}
                  </button>
                ))}
              </div>

              {skill.inBank ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <button
                  type="button"
                  onClick={() => handleAddToBank(skill)}
                  className="flex-shrink-0"
                  aria-label={`Adicionar ${skill.displayName} ao banco de skills`}
                >
                  <PlusCircle className="w-5 h-5 text-muted-foreground hover:text-green-500 flex-shrink-0" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
