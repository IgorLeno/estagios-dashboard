"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, X, ChevronDown, ChevronRight, Info } from "lucide-react"
import { useState } from "react"
import type { CandidateProfile } from "@/lib/types"

type ProfileData = Omit<CandidateProfile, "id" | "user_id" | "created_at" | "updated_at">

interface ProjectsTabProps {
  profile: ProfileData
  onChange: (profile: ProfileData) => void
  disabled?: boolean
}

export function ProjectsTab({ profile, onChange, disabled }: ProjectsTabProps) {
  const [showEN, setShowEN] = useState(false)

  function addProject() {
    onChange({
      ...profile,
      projetos: [...profile.projetos, { title_pt: "", description_pt: [""] }],
    })
  }

  function removeProject(index: number) {
    onChange({
      ...profile,
      projetos: profile.projetos.filter((_, i) => i !== index),
    })
  }

  function updateTitle(index: number, field: string, value: string) {
    const updated = profile.projetos.map((proj, i) =>
      i === index ? { ...proj, [field]: value } : proj
    )
    onChange({ ...profile, projetos: updated })
  }

  function addDescription(projIndex: number, lang: "pt" | "en") {
    const updated = profile.projetos.map((proj, i) => {
      if (i !== projIndex) return proj
      if (lang === "pt") {
        return { ...proj, description_pt: [...proj.description_pt, ""] }
      }
      return { ...proj, description_en: [...(proj.description_en || []), ""] }
    })
    onChange({ ...profile, projetos: updated })
  }

  function removeDescription(projIndex: number, descIndex: number, lang: "pt" | "en") {
    const updated = profile.projetos.map((proj, i) => {
      if (i !== projIndex) return proj
      if (lang === "pt") {
        return { ...proj, description_pt: proj.description_pt.filter((_, j) => j !== descIndex) }
      }
      return { ...proj, description_en: (proj.description_en || []).filter((_, j) => j !== descIndex) }
    })
    onChange({ ...profile, projetos: updated })
  }

  function updateDescription(projIndex: number, descIndex: number, value: string, lang: "pt" | "en") {
    const updated = profile.projetos.map((proj, i) => {
      if (i !== projIndex) return proj
      if (lang === "pt") {
        return {
          ...proj,
          description_pt: proj.description_pt.map((d, j) => (j === descIndex ? value : d)),
        }
      }
      return {
        ...proj,
        description_en: (proj.description_en || []).map((d, j) => (j === descIndex ? value : d)),
      }
    })
    onChange({ ...profile, projetos: updated })
  }

  return (
    <div className="space-y-4">
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <Info className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-xs">
          Titulos de projetos nunca sao alterados pelo modelo — apenas as descricoes sao reescritas
          para enfatizar aspectos relevantes a vaga.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Projetos</h3>
        <Button type="button" variant="outline" size="sm" onClick={addProject} disabled={disabled} className="gap-1">
          <Plus className="h-3 w-3" /> Projeto
        </Button>
      </div>

      {profile.projetos.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum projeto adicionado. Clique em &quot;Projeto&quot; para adicionar.
        </p>
      )}

      {profile.projetos.map((proj, projIndex) => (
        <div key={projIndex} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Input
              value={proj.title_pt}
              onChange={(e) => updateTitle(projIndex, "title_pt", e.target.value)}
              placeholder="Titulo do projeto (PT)"
              className="bg-background text-sm font-medium"
              disabled={disabled}
            />
            {showEN && (
              <Input
                value={proj.title_en || ""}
                onChange={(e) => updateTitle(projIndex, "title_en", e.target.value)}
                placeholder="Project title (EN)"
                className="bg-background text-sm"
                disabled={disabled}
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeProject(projIndex)}
              disabled={disabled}
              className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* PT Descriptions */}
          <div className="space-y-2 pl-2">
            <p className="text-xs text-muted-foreground">Descricoes (PT):</p>
            {proj.description_pt.map((desc, descIndex) => (
              <div key={descIndex} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">•</span>
                <Input
                  value={desc}
                  onChange={(e) => updateDescription(projIndex, descIndex, e.target.value, "pt")}
                  placeholder="Descricao do projeto"
                  className="bg-background text-sm"
                  disabled={disabled}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDescription(projIndex, descIndex, "pt")}
                  disabled={disabled}
                  className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addDescription(projIndex, "pt")}
              disabled={disabled}
              className="gap-1 text-xs"
            >
              <Plus className="h-3 w-3" /> Descricao
            </Button>
          </div>

          {/* EN Descriptions */}
          {showEN && (
            <div className="space-y-2 pl-2 border-t pt-3">
              <p className="text-xs text-muted-foreground">Descriptions (EN):</p>
              {(proj.description_en || []).map((desc, descIndex) => (
                <div key={descIndex} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">•</span>
                  <Input
                    value={desc}
                    onChange={(e) => updateDescription(projIndex, descIndex, e.target.value, "en")}
                    placeholder="Project description (EN)"
                    className="bg-background text-sm"
                    disabled={disabled}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDescription(projIndex, descIndex, "en")}
                    disabled={disabled}
                    className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addDescription(projIndex, "en")}
                disabled={disabled}
                className="gap-1 text-xs"
              >
                <Plus className="h-3 w-3" /> EN Description
              </Button>
            </div>
          )}
        </div>
      ))}

      {/* EN Toggle */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShowEN(!showEN)}
        className="gap-2 text-muted-foreground"
      >
        {showEN ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {showEN ? "Ocultar campos em ingles" : "Mostrar campos em ingles"}
      </Button>
    </div>
  )
}
