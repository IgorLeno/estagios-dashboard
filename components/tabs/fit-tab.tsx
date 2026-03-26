"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Sparkles, ChevronRight, Info, CheckCircle } from "lucide-react"
import type { JobDetails, ComplementSelection } from "@/lib/ai/types"

export interface FitTabProps {
  jobDescription: string
  jobAnalysisData: JobDetails | null
  language: "pt" | "en"
  // 3A: Profile
  profileText: string
  onProfileTextChange: (text: string) => void
  isGeneratingProfile: boolean
  onGenerateProfile: () => void
  // 3B: Complements
  complements: ComplementSelection | null
  onComplementsChange: (c: ComplementSelection) => void
  isSelectingComplements: boolean
  onSelectComplements: () => void
  // Navigation
  onContinueToCurriculo: () => void
}

export function FitTab({
  jobAnalysisData,
  profileText,
  onProfileTextChange,
  isGeneratingProfile,
  onGenerateProfile,
  complements,
  onComplementsChange,
  isSelectingComplements,
  onSelectComplements,
  onContinueToCurriculo,
}: FitTabProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    skills: true,
    projects: true,
    certifications: true,
  })

  const hasProfile = profileText.trim().length > 0
  const hasComplements = complements !== null

  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleSkillCategory(categoryIndex: number) {
    if (!complements) return
    const updated = { ...complements }
    updated.skills = updated.skills.map((skill, i) =>
      i === categoryIndex ? { ...skill, selected: !skill.selected } : skill
    )
    onComplementsChange(updated)
  }

  function toggleProject(projectIndex: number) {
    if (!complements) return
    const updated = { ...complements }
    updated.projects = updated.projects.map((proj, i) =>
      i === projectIndex ? { ...proj, selected: !proj.selected } : proj
    )
    onComplementsChange(updated)
  }

  function toggleCertification(certIndex: number) {
    if (!complements) return
    const updated = { ...complements }
    updated.certifications = updated.certifications.map((cert, i) =>
      i === certIndex ? { ...cert, selected: !cert.selected } : cert
    )
    onComplementsChange(updated)
  }

  const canContinue = hasProfile && hasComplements

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Fit: Perfil + Complementos</h3>
        <p className="text-sm text-muted-foreground">
          A IA gera um perfil profissional e seleciona as competências, projetos e certificações mais relevantes para a
          vaga.
        </p>
      </div>

      {!jobAnalysisData && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Análise da vaga necessária</AlertTitle>
          <AlertDescription>Volte à aba "Descrição" e analise a vaga antes de gerar o fit.</AlertDescription>
        </Alert>
      )}

      {/* 3A: Profile Generation */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
            A
          </div>
          <Label className="text-base font-medium">Perfil Profissional</Label>
          {hasProfile && <CheckCircle className="h-4 w-4 text-green-500" />}
        </div>

        <Textarea
          value={profileText}
          onChange={(e) => onProfileTextChange(e.target.value)}
          placeholder="O perfil profissional será gerado pela IA com base nos seus dados e na vaga..."
          className="min-h-[120px] resize-none"
          disabled={isGeneratingProfile}
        />

        <Button
          onClick={onGenerateProfile}
          disabled={!jobAnalysisData || isGeneratingProfile}
          variant={hasProfile ? "outline" : "default"}
          size="sm"
        >
          {isGeneratingProfile ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando perfil...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {hasProfile ? "Regenerar Perfil" : "Gerar Perfil"}
            </>
          )}
        </Button>
      </div>

      {/* 3B: Complement Selection */}
      <div className={`space-y-3 ${!hasProfile ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
            B
          </div>
          <Label className="text-base font-medium">Complementos</Label>
          {hasComplements && <CheckCircle className="h-4 w-4 text-green-500" />}
        </div>

        {!hasComplements && (
          <p className="text-sm text-muted-foreground">
            A IA seleciona as competências, projetos e certificações mais relevantes para a vaga.
          </p>
        )}

        <Button
          onClick={onSelectComplements}
          disabled={!hasProfile || isSelectingComplements}
          variant={hasComplements ? "outline" : "default"}
          size="sm"
        >
          {isSelectingComplements ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Selecionando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {hasComplements ? "Resselecionar Complementos" : "Selecionar Complementos"}
            </>
          )}
        </Button>

        {/* Complement results */}
        {hasComplements && (
          <div className="space-y-4 mt-4">
            {/* Skills */}
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => toggleSection("skills")}
                className="flex w-full items-center justify-between p-3 text-sm font-medium hover:bg-muted/50"
              >
                <span>Competências ({complements.skills.filter((s) => s.selected).length}/{complements.skills.length} categorias)</span>
                <span className="text-xs text-muted-foreground">{expandedSections.skills ? "▼" : "▶"}</span>
              </button>
              {expandedSections.skills && (
                <div className="border-t px-3 pb-3 space-y-2">
                  {complements.skills.map((skill, idx) => (
                    <label key={idx} className="flex items-start gap-2 pt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skill.selected}
                        onChange={() => toggleSkillCategory(idx)}
                        className="mt-1 h-4 w-4 rounded border-border"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{skill.category}</span>
                        <p className="text-xs text-muted-foreground truncate">{skill.items.join(", ")}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Projects */}
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => toggleSection("projects")}
                className="flex w-full items-center justify-between p-3 text-sm font-medium hover:bg-muted/50"
              >
                <span>Projetos ({complements.projects.filter((p) => p.selected).length}/{complements.projects.length})</span>
                <span className="text-xs text-muted-foreground">{expandedSections.projects ? "▼" : "▶"}</span>
              </button>
              {expandedSections.projects && (
                <div className="border-t px-3 pb-3 space-y-2">
                  {complements.projects.map((proj, idx) => (
                    <label key={idx} className="flex items-start gap-2 pt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={proj.selected}
                        onChange={() => toggleProject(idx)}
                        className="mt-1 h-4 w-4 rounded border-border"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{proj.title}</span>
                        <p className="text-xs text-muted-foreground">{proj.reason}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Certifications */}
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => toggleSection("certifications")}
                className="flex w-full items-center justify-between p-3 text-sm font-medium hover:bg-muted/50"
              >
                <span>Certificações ({complements.certifications.filter((c) => c.selected).length}/{complements.certifications.length})</span>
                <span className="text-xs text-muted-foreground">{expandedSections.certifications ? "▼" : "▶"}</span>
              </button>
              {expandedSections.certifications && (
                <div className="border-t px-3 pb-3 space-y-2">
                  {complements.certifications.map((cert, idx) => (
                    <label key={idx} className="flex items-start gap-2 pt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cert.selected}
                        onChange={() => toggleCertification(idx)}
                        className="mt-1 h-4 w-4 rounded border-border"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{cert.title}</span>
                        <p className="text-xs text-muted-foreground">{cert.reason}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Continue button */}
      {canContinue && (
        <Alert className="border-green-500/25 bg-green-500/5">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>Fit pronto</AlertTitle>
          <AlertDescription>
            Perfil e complementos selecionados. Continue para gerar o currículo personalizado.
          </AlertDescription>
        </Alert>
      )}

      <Button onClick={onContinueToCurriculo} disabled={!canContinue} className="w-full">
        Continuar para Currículo
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}
