"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, PlusCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { JobSkillReview, SkillUsageMode } from "@/lib/ai/types"

interface VagaSkillsSectionProps {
  vagaId: string
  onSkillsChange: (approvedSkills: string[]) => void
}

export function VagaSkillsSection({ vagaId, onSkillsChange }: VagaSkillsSectionProps) {
  const [skills, setSkills] = useState<JobSkillReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadSkills() {
      setIsLoading(true)
      setLoadError(null)

      try {
        const response = await fetch(`/api/vagas/${vagaId}/skills`)

        const data = (await response.json()) as
          | { success: true; skills: JobSkillReview[] }
          | { success: false; error?: string }

        if (!response.ok || !data.success) {
          throw new Error(data.success ? "Erro ao carregar skills da vaga" : data.error || "Erro ao carregar skills da vaga")
        }

        if (!isMounted) return

        setSkills(data.skills)
        setIsLoaded(true)
      } catch (error) {
        console.error("[VagaSkillsSection] Error loading skills:", error)
        if (!isMounted) return

        setSkills([])
        setIsLoaded(true)
        setLoadError(error instanceof Error ? error.message : "Erro ao carregar skills da vaga")
        toast.error(error instanceof Error ? error.message : "Erro ao carregar skills da vaga")
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadSkills()

    return () => {
      isMounted = false
    }
  }, [vagaId])

  useEffect(() => {
    onSkillsChange(
      skills
        .filter((skill) => skill.mode === "use" || skill.mode === "rename")
        .map((skill) => skill.displayName)
    )
  }, [onSkillsChange, skills])

  function handleModeChange(skill: JobSkillReview, newMode: SkillUsageMode) {
    setSkills((currentSkills) =>
      currentSkills.map((currentSkill) =>
        currentSkill.originalName === skill.originalName
          ? {
              ...currentSkill,
              mode: newMode,
              displayName: newMode !== "rename" ? currentSkill.originalName : currentSkill.displayName,
            }
          : currentSkill
      )
    )
  }

  function handleRenameChange(skill: JobSkillReview, newName: string) {
    setSkills((currentSkills) =>
      currentSkills.map((currentSkill) =>
        currentSkill.originalName === skill.originalName ? { ...currentSkill, displayName: newName } : currentSkill
      )
    )
  }

  async function handleAddToBank(skill: JobSkillReview) {
    try {
      const response = await fetch("/api/skills-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill: skill.displayName,
          category: skill.category ?? "Soft Skills",
        }),
      })

      if (response.ok || response.status === 409) {
        setSkills((currentSkills) =>
          currentSkills.map((currentSkill) =>
            currentSkill.originalName === skill.originalName ? { ...currentSkill, inBank: true } : currentSkill
          )
        )
        toast.success(`"${skill.displayName}" adicionada ao banco de skills`)
        return
      }

      toast.error("Erro ao adicionar skill ao banco")
    } catch {
      toast.error("Erro ao adicionar skill ao banco")
    }
  }

  async function handleSaveSkills() {
    setIsSaving(true)

    try {
      const response = await fetch(`/api/vagas/${vagaId}/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills }),
      })

      const data = (await response.json()) as
        | { success: true; skills: JobSkillReview[] }
        | { success: false; error?: string }

      if (!response.ok || !data.success) {
        throw new Error(data.success ? "Erro ao salvar skills da vaga" : data.error || "Erro ao salvar skills da vaga")
      }

      setSkills(data.skills)
      toast.success("Skills salvas com sucesso!")
    } catch (error) {
      console.error("[VagaSkillsSection] Error saving skills:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao salvar skills da vaga")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-4">
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
              {skills.filter((skill) => skill.mode === "use" || skill.mode === "rename").length} aprovadas
            </span>
            <span>·</span>
            <span>{skills.length} total</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-12 bg-muted/50 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : loadError ? (
        <p className="text-sm text-destructive text-center py-8">{loadError}</p>
      ) : isLoaded && skills.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma skill configurada. Configure as skills na aba Skills ao editar a vaga.
        </p>
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
                  onChange={(event) => handleRenameChange(skill, event.target.value)}
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
                  onClick={() => void handleAddToBank(skill)}
                  className="flex-shrink-0"
                  aria-label={`Adicionar ${skill.displayName} ao banco de skills`}
                >
                  <PlusCircle className="w-5 h-5 text-muted-foreground hover:text-green-500 flex-shrink-0" />
                </button>
              )}
            </div>
          ))}

          <Button onClick={() => void handleSaveSkills()} disabled={isSaving} className="w-full mt-4">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar alterações"
            )}
          </Button>
        </div>
      )}
    </section>
  )
}
