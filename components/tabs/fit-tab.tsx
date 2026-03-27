"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Sparkles, ChevronRight, Info, CheckCircle, AlertTriangle } from "lucide-react"
import type { JobDetails, ComplementSelection } from "@/lib/ai/types"

const MAX_SKILLS_TOTAL = 20

export interface FitTabProps {
  jobDescription: string
  jobAnalysisData: JobDetails | null
  language: "pt" | "en"
  // 3A: Profile
  profileText: string
  onProfileTextChange: (text: string) => void
  tagline?: string
  onTaglineChange?: (tagline: string) => void
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
  language,
  profileText,
  onProfileTextChange,
  tagline,
  onTaglineChange,
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

  // Track original skill items per category so removed items can be re-added.
  // Only repopulate when a fresh API response arrives (isSelectingComplements: true→false),
  // NOT on user toggles (which also change complements but leave isSelectingComplements false).
  const originalSkillItemsRef = useRef<Map<string, string[]>>(new Map())
  const wasSelectingRef = useRef(false)

  useEffect(() => {
    if (wasSelectingRef.current && !isSelectingComplements && complements) {
      const map = new Map<string, string[]>()
      for (const skill of complements.skills) {
        map.set(skill.category, [...skill.items])
      }
      originalSkillItemsRef.current = map
    }
    if (!complements) {
      originalSkillItemsRef.current = new Map()
    }
    wasSelectingRef.current = isSelectingComplements
  }, [isSelectingComplements, complements])

  // Detect when complements were invalidated by a profile text edit
  const [complementsInvalidated, setComplementsInvalidated] = useState(false)
  const hadComplementsRef = useRef(false)

  useEffect(() => {
    if (!complements && hadComplementsRef.current && profileText.trim().length > 0) {
      // Complements went from non-null to null while profile text exists → user edited the profile
      setComplementsInvalidated(true)
    }
    if (complements) {
      setComplementsInvalidated(false)
    }
    hadComplementsRef.current = complements !== null
  }, [complements, profileText])

  const hasProfile = profileText.trim().length > 0
  const hasComplements = complements !== null
  const totalSelectedSkills = complements
    ? complements.skills.filter((s) => s.selected).reduce((sum, s) => sum + s.items.length, 0)
    : 0
  const skillsAtLimit = totalSelectedSkills >= MAX_SKILLS_TOTAL

  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleSkillCategory(categoryIndex: number) {
    if (!complements) return
    const category = complements.skills[categoryIndex]
    const originalItems = originalSkillItemsRef.current.get(category.category) || category.items

    const updated = { ...complements }
    updated.skills = updated.skills.map((skill, i) => {
      if (i !== categoryIndex) return skill
      if (skill.selected && skill.items.length > 0) {
        // Deselect all: clear items and mark deselected
        return { ...skill, selected: false, items: [] }
      } else {
        // Select all: restore original items, capped at remaining budget
        const currentOtherSkills = totalSelectedSkills - skill.items.length
        const budget = MAX_SKILLS_TOTAL - currentOtherSkills
        const itemsToRestore = originalItems.slice(0, Math.max(0, budget))
        return { ...skill, selected: itemsToRestore.length > 0, items: itemsToRestore }
      }
    })
    onComplementsChange(updated)
  }

  function toggleSkillItem(categoryIndex: number, itemName: string) {
    if (!complements) return
    const category = complements.skills[categoryIndex]
    const hasItem = category.items.includes(itemName)

    // Prevent adding beyond the limit
    if (!hasItem && totalSelectedSkills >= MAX_SKILLS_TOTAL) return

    const updated = { ...complements }
    updated.skills = updated.skills.map((skill, i) => {
      if (i !== categoryIndex) return skill
      let newItems: string[]
      if (hasItem) {
        newItems = skill.items.filter((item) => item !== itemName)
      } else {
        newItems = [...skill.items, itemName]
      }
      return {
        ...skill,
        items: newItems,
        selected: newItems.length > 0,
      }
    })
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

  const canContinue = hasProfile && hasComplements && !complementsInvalidated
  const taglineLabel = language === "pt" ? "Tagline" : "Tagline"
  const taglineDescription =
    language === "pt"
      ? "Frase de posicionamento exibida abaixo do nome no currículo (8–15 palavras)"
      : "Positioning phrase shown below the name on the resume (8–15 words)"

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

        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="fit-tagline">{taglineLabel}</Label>
            <p className="text-xs text-muted-foreground">{taglineDescription}</p>
          </div>
          <Input
            id="fit-tagline"
            value={tagline ?? ""}
            onChange={(e) => onTaglineChange?.(e.target.value)}
            placeholder={
              language === "pt"
                ? "Ex: Profissional com base em Engenharia Química e foco em dados e BI"
                : "Ex: Professional with a Chemical Engineering background and data expertise"
            }
            disabled={isGeneratingProfile}
          />
        </div>

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

        {!hasComplements && !complementsInvalidated && (
          <p className="text-sm text-muted-foreground">
            A IA seleciona as competências, projetos e certificações mais relevantes para a vaga.
          </p>
        )}

        {complementsInvalidated && !isSelectingComplements && (
          <Alert className="border-amber-500/25 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm">
              Texto do perfil editado — regenere os complementos para refletir as mudanças.
            </AlertDescription>
          </Alert>
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
                <span className="flex items-center gap-1.5">
                  Competências ({totalSelectedSkills}/{MAX_SKILLS_TOTAL} skills em {complements.skills.filter((s) => s.selected).length}/{complements.skills.length} categorias)
                  {skillsAtLimit && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                </span>
                <span className="text-xs text-muted-foreground">{expandedSections.skills ? "▼" : "▶"}</span>
              </button>
              {expandedSections.skills && (
                <div className="border-t px-3 pb-3 space-y-3">
                  {skillsAtLimit && (
                    <p className="text-xs text-amber-600 pt-2">
                      Limite de {MAX_SKILLS_TOTAL} skills atingido. Desmarque alguma para adicionar outra.
                    </p>
                  )}
                  {complements.skills.map((skill, idx) => {
                    const originalItems = originalSkillItemsRef.current.get(skill.category) || skill.items
                    const allItems = [...new Set([...originalItems, ...skill.items])]

                    return (
                      <div key={idx} className="pt-2">
                        {/* Category-level toggle (select all / deselect all) */}
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={skill.selected && skill.items.length > 0}
                            onChange={() => toggleSkillCategory(idx)}
                            className="mt-1 h-4 w-4 rounded border-border"
                          />
                          <span className="text-sm font-medium">{skill.category}</span>
                        </label>
                        {/* Per-item toggles */}
                        <div className="ml-6 mt-1 space-y-0.5">
                          {allItems.map((item) => (
                            <label key={item} className="flex items-center gap-2 cursor-pointer py-0.5">
                              <input
                                type="checkbox"
                                checked={skill.items.includes(item)}
                                onChange={() => toggleSkillItem(idx, item)}
                                className="h-3.5 w-3.5 rounded border-border"
                              />
                              <span className="text-xs text-muted-foreground">{item}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
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
