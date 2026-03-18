"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, X, ChevronUp, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import type { CandidateProfile } from "@/lib/types"

type ProfileData = Omit<CandidateProfile, "id" | "user_id" | "created_at" | "updated_at">

interface CertificationsTabProps {
  profile: ProfileData
  onChange: (profile: ProfileData) => void
  disabled?: boolean
}

export function CertificationsTab({ profile, onChange, disabled }: CertificationsTabProps) {
  const [showEN, setShowEN] = useState(false)

  function addCertification() {
    onChange({
      ...profile,
      certificacoes: [...profile.certificacoes, { text_pt: "" }],
    })
  }

  function removeCertification(index: number) {
    onChange({
      ...profile,
      certificacoes: profile.certificacoes.filter((_, i) => i !== index),
    })
  }

  function updateCertification(index: number, field: string, value: string) {
    const updated = profile.certificacoes.map((cert, i) =>
      i === index ? { ...cert, [field]: value } : cert
    )
    onChange({ ...profile, certificacoes: updated })
  }

  function moveUp(index: number) {
    if (index === 0) return
    const updated = [...profile.certificacoes]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    onChange({ ...profile, certificacoes: updated })
  }

  function moveDown(index: number) {
    if (index === profile.certificacoes.length - 1) return
    const updated = [...profile.certificacoes]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    onChange({ ...profile, certificacoes: updated })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Certificacoes</h3>
          <p className="text-xs text-muted-foreground">
            A ordem define a prioridade no CV gerado. Use as setas para reordenar.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addCertification} disabled={disabled} className="gap-1">
          <Plus className="h-3 w-3" /> Certificacao
        </Button>
      </div>

      {profile.certificacoes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma certificacao adicionada. Clique em &quot;Certificacao&quot; para adicionar.
        </p>
      )}

      {profile.certificacoes.map((cert, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex flex-col shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => moveUp(index)}
              disabled={disabled || index === 0}
              className="h-5 w-5 p-0"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => moveDown(index)}
              disabled={disabled || index === profile.certificacoes.length - 1}
              className="h-5 w-5 p-0"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
          <span className="text-xs text-muted-foreground w-5 shrink-0 text-center">{index + 1}</span>
          <Input
            value={cert.text_pt}
            onChange={(e) => updateCertification(index, "text_pt", e.target.value)}
            placeholder="Certificacao (PT)"
            className="bg-background text-sm"
            disabled={disabled}
          />
          {showEN && (
            <Input
              value={cert.text_en || ""}
              onChange={(e) => updateCertification(index, "text_en", e.target.value)}
              placeholder="Certification (EN)"
              className="bg-background text-sm"
              disabled={disabled}
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeCertification(index)}
            disabled={disabled}
            className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </Button>
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
