"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, X, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import type { CandidateProfile } from "@/lib/types"

type ProfileData = Omit<CandidateProfile, "id" | "user_id" | "created_at" | "updated_at">

interface SkillsTabProps {
  profile: ProfileData
  onChange: (profile: ProfileData) => void
  disabled?: boolean
}

export function SkillsTab({ profile, onChange, disabled }: SkillsTabProps) {
  const [showEN, setShowEN] = useState(false)

  function addCategory() {
    onChange({
      ...profile,
      habilidades: [...profile.habilidades, { category_pt: "", items_pt: [""] }],
    })
  }

  function removeCategory(index: number) {
    onChange({
      ...profile,
      habilidades: profile.habilidades.filter((_, i) => i !== index),
    })
  }

  function updateCategoryName(index: number, field: string, value: string) {
    const updated = profile.habilidades.map((cat, i) =>
      i === index ? { ...cat, [field]: value } : cat
    )
    onChange({ ...profile, habilidades: updated })
  }

  function addItem(catIndex: number, lang: "pt" | "en") {
    const updated = profile.habilidades.map((cat, i) => {
      if (i !== catIndex) return cat
      if (lang === "pt") {
        return { ...cat, items_pt: [...cat.items_pt, ""] }
      }
      return { ...cat, items_en: [...(cat.items_en || []), ""] }
    })
    onChange({ ...profile, habilidades: updated })
  }

  function removeItem(catIndex: number, itemIndex: number, lang: "pt" | "en") {
    const updated = profile.habilidades.map((cat, i) => {
      if (i !== catIndex) return cat
      if (lang === "pt") {
        return { ...cat, items_pt: cat.items_pt.filter((_, j) => j !== itemIndex) }
      }
      return { ...cat, items_en: (cat.items_en || []).filter((_, j) => j !== itemIndex) }
    })
    onChange({ ...profile, habilidades: updated })
  }

  function updateItem(catIndex: number, itemIndex: number, value: string, lang: "pt" | "en") {
    const updated = profile.habilidades.map((cat, i) => {
      if (i !== catIndex) return cat
      if (lang === "pt") {
        return { ...cat, items_pt: cat.items_pt.map((item, j) => (j === itemIndex ? value : item)) }
      }
      return {
        ...cat,
        items_en: (cat.items_en || []).map((item, j) => (j === itemIndex ? value : item)),
      }
    })
    onChange({ ...profile, habilidades: updated })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Categorias de Habilidades</h3>
          <p className="text-xs text-muted-foreground">
            Organize suas habilidades por categoria. Estas sao usadas no curriculo gerado.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addCategory} disabled={disabled} className="gap-1">
          <Plus className="h-3 w-3" /> Categoria
        </Button>
      </div>

      {profile.habilidades.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma categoria de habilidades. Clique em &quot;Categoria&quot; para adicionar.
        </p>
      )}

      {profile.habilidades.map((cat, catIndex) => (
        <div key={catIndex} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Input
              value={cat.category_pt}
              onChange={(e) => updateCategoryName(catIndex, "category_pt", e.target.value)}
              placeholder="Nome da categoria (PT)"
              className="bg-background text-sm font-medium"
              disabled={disabled}
            />
            {showEN && (
              <Input
                value={cat.category_en || ""}
                onChange={(e) => updateCategoryName(catIndex, "category_en", e.target.value)}
                placeholder="Category name (EN)"
                className="bg-background text-sm"
                disabled={disabled}
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeCategory(catIndex)}
              disabled={disabled}
              className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* PT Items */}
          <div className="space-y-2 pl-2">
            {cat.items_pt.map((item, itemIndex) => (
              <div key={itemIndex} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-4 shrink-0">{itemIndex + 1}.</span>
                <Input
                  value={item}
                  onChange={(e) => updateItem(catIndex, itemIndex, e.target.value, "pt")}
                  placeholder="Habilidade"
                  className="bg-background text-sm"
                  disabled={disabled}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(catIndex, itemIndex, "pt")}
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
              onClick={() => addItem(catIndex, "pt")}
              disabled={disabled}
              className="gap-1 text-xs"
            >
              <Plus className="h-3 w-3" /> Item
            </Button>
          </div>

          {/* EN Items */}
          {showEN && (
            <div className="space-y-2 pl-2 border-t pt-3">
              <p className="text-xs text-muted-foreground">English items:</p>
              {(cat.items_en || []).map((item, itemIndex) => (
                <div key={itemIndex} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 shrink-0">{itemIndex + 1}.</span>
                  <Input
                    value={item}
                    onChange={(e) => updateItem(catIndex, itemIndex, e.target.value, "en")}
                    placeholder="Skill (EN)"
                    className="bg-background text-sm"
                    disabled={disabled}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(catIndex, itemIndex, "en")}
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
                onClick={() => addItem(catIndex, "en")}
                disabled={disabled}
                className="gap-1 text-xs"
              >
                <Plus className="h-3 w-3" /> EN Item
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
