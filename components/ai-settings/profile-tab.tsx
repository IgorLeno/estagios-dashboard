"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, X, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import type { CandidateProfile } from "@/lib/types"

type ProfileData = Omit<CandidateProfile, "id" | "user_id" | "created_at" | "updated_at">

interface ProfileTabProps {
  profile: ProfileData
  onChange: (profile: ProfileData) => void
  disabled?: boolean
}

export function ProfileTab({ profile, onChange, disabled }: ProfileTabProps) {
  const [showEN, setShowEN] = useState(false)

  function updateField<K extends keyof ProfileData>(field: K, value: ProfileData[K]) {
    onChange({ ...profile, [field]: value })
  }

  function addEducation() {
    updateField("educacao", [
      ...profile.educacao,
      { degree_pt: "", institution_pt: "", period_pt: "" },
    ])
  }

  function removeEducation(index: number) {
    updateField(
      "educacao",
      profile.educacao.filter((_, i) => i !== index)
    )
  }

  function updateEducation(index: number, field: string, value: string) {
    const updated = profile.educacao.map((edu, i) =>
      i === index ? { ...edu, [field]: value } : edu
    )
    updateField("educacao", updated)
  }

  function addIdioma() {
    updateField("idiomas", [
      ...profile.idiomas,
      { language_pt: "", proficiency_pt: "Intermediario" },
    ])
  }

  function removeIdioma(index: number) {
    updateField(
      "idiomas",
      profile.idiomas.filter((_, i) => i !== index)
    )
  }

  function updateIdioma(index: number, field: string, value: string) {
    const updated = profile.idiomas.map((lang, i) =>
      i === index ? { ...lang, [field]: value } : lang
    )
    updateField("idiomas", updated)
  }

  return (
    <div className="space-y-6">
      {/* Identity */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Dados Pessoais</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <Input
              id="nome"
              value={profile.nome}
              onChange={(e) => updateField("nome", e.target.value)}
              placeholder="Seu nome completo"
              className="bg-background"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="seu@email.com"
              className="bg-background"
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={profile.telefone}
              onChange={(e) => updateField("telefone", e.target.value)}
              placeholder="+55 (11) 99999-9999"
              className="bg-background"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="disponibilidade">Disponibilidade</Label>
            <Input
              id="disponibilidade"
              value={profile.disponibilidade}
              onChange={(e) => updateField("disponibilidade", e.target.value)}
              placeholder="Inicio imediato, periodo integral"
              className="bg-background"
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              value={profile.linkedin}
              onChange={(e) => updateField("linkedin", e.target.value)}
              placeholder="linkedin.com/in/seu-perfil"
              className="bg-background"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="github">GitHub</Label>
            <Input
              id="github"
              value={profile.github}
              onChange={(e) => updateField("github", e.target.value)}
              placeholder="github.com/seu-usuario"
              className="bg-background"
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="localizacao_pt">Localizacao (PT)</Label>
            <Input
              id="localizacao_pt"
              value={profile.localizacao_pt}
              onChange={(e) => updateField("localizacao_pt", e.target.value)}
              placeholder="Cidade/UF"
              className="bg-background"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="localizacao_en">Localizacao (EN)</Label>
            <Input
              id="localizacao_en"
              value={profile.localizacao_en}
              onChange={(e) => updateField("localizacao_en", e.target.value)}
              placeholder="City/State (optional, falls back to PT)"
              className="bg-background"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Education */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Educacao</h3>
          <Button type="button" variant="outline" size="sm" onClick={addEducation} disabled={disabled} className="gap-1">
            <Plus className="h-3 w-3" /> Adicionar
          </Button>
        </div>
        {profile.educacao.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma formacao adicionada.</p>
        )}
        {profile.educacao.map((edu, index) => (
          <div key={index} className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Formacao {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeEducation(index)}
                disabled={disabled}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={edu.degree_pt}
                onChange={(e) => updateEducation(index, "degree_pt", e.target.value)}
                placeholder="Curso (PT)"
                className="bg-background text-sm"
                disabled={disabled}
              />
              <Input
                value={edu.institution_pt}
                onChange={(e) => updateEducation(index, "institution_pt", e.target.value)}
                placeholder="Instituicao (PT)"
                className="bg-background text-sm"
                disabled={disabled}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={edu.period_pt}
                onChange={(e) => updateEducation(index, "period_pt", e.target.value)}
                placeholder="Periodo (PT)"
                className="bg-background text-sm"
                disabled={disabled}
              />
              <Input
                value={edu.location || ""}
                onChange={(e) => updateEducation(index, "location", e.target.value)}
                placeholder="Local (opcional)"
                className="bg-background text-sm"
                disabled={disabled}
              />
            </div>
            {showEN && (
              <div className="grid grid-cols-3 gap-3 border-t pt-3">
                <Input
                  value={edu.degree_en || ""}
                  onChange={(e) => updateEducation(index, "degree_en", e.target.value)}
                  placeholder="Degree (EN)"
                  className="bg-background text-sm"
                  disabled={disabled}
                />
                <Input
                  value={edu.institution_en || ""}
                  onChange={(e) => updateEducation(index, "institution_en", e.target.value)}
                  placeholder="Institution (EN)"
                  className="bg-background text-sm"
                  disabled={disabled}
                />
                <Input
                  value={edu.period_en || ""}
                  onChange={(e) => updateEducation(index, "period_en", e.target.value)}
                  placeholder="Period (EN)"
                  className="bg-background text-sm"
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Languages */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Idiomas</h3>
          <Button type="button" variant="outline" size="sm" onClick={addIdioma} disabled={disabled} className="gap-1">
            <Plus className="h-3 w-3" /> Adicionar
          </Button>
        </div>
        {profile.idiomas.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum idioma adicionado.</p>
        )}
        {profile.idiomas.map((lang, index) => (
          <div key={index} className="flex items-center gap-3">
            <Input
              value={lang.language_pt}
              onChange={(e) => updateIdioma(index, "language_pt", e.target.value)}
              placeholder="Idioma (PT)"
              className="bg-background text-sm flex-1"
              disabled={disabled}
            />
            <select
              value={lang.proficiency_pt}
              onChange={(e) => updateIdioma(index, "proficiency_pt", e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              disabled={disabled}
            >
              <option value="Basico">Basico</option>
              <option value="Intermediario">Intermediario</option>
              <option value="Avancado">Avancado</option>
              <option value="Fluente">Fluente</option>
              <option value="Nativo">Nativo</option>
            </select>
            {showEN && (
              <>
                <Input
                  value={lang.language_en || ""}
                  onChange={(e) => updateIdioma(index, "language_en", e.target.value)}
                  placeholder="Language (EN)"
                  className="bg-background text-sm flex-1"
                  disabled={disabled}
                />
                <Input
                  value={lang.proficiency_en || ""}
                  onChange={(e) => updateIdioma(index, "proficiency_en", e.target.value)}
                  placeholder="Proficiency (EN)"
                  className="bg-background text-sm flex-1"
                  disabled={disabled}
                />
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeIdioma(index)}
              disabled={disabled}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Objectives */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Objetivo Profissional</h3>
        <div className="space-y-2">
          <Label htmlFor="objetivo_pt">Objetivo (PT)</Label>
          <Textarea
            id="objetivo_pt"
            value={profile.objetivo_pt}
            onChange={(e) => updateField("objetivo_pt", e.target.value)}
            rows={4}
            placeholder="Resumo profissional em portugues..."
            className="bg-background text-sm"
            disabled={disabled}
          />
        </div>
        {showEN && (
          <div className="space-y-2">
            <Label htmlFor="objetivo_en">Objective (EN)</Label>
            <Textarea
              id="objetivo_en"
              value={profile.objetivo_en}
              onChange={(e) => updateField("objetivo_en", e.target.value)}
              rows={4}
              placeholder="Professional summary in English (optional, falls back to PT)..."
              className="bg-background text-sm"
              disabled={disabled}
            />
          </div>
        )}
      </div>

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
