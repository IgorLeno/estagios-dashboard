"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Target, Check } from "lucide-react"
import { cn, getMetaTextColor, toSafeNumber } from "@/lib/utils"

interface MetaCardProps {
  meta: number
  candidaturas: number
  onMetaChange: (newMeta: number) => void
}

export function MetaCard({ meta, candidaturas, onMetaChange }: MetaCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempMeta, setTempMeta] = useState(meta.toString())

  // Garantir que meta e candidaturas sejam números válidos
  const safeMeta = toSafeNumber(meta)
  const safeCandidaturas = toSafeNumber(candidaturas)
  const progress = safeMeta > 0 ? Math.min((safeCandidaturas / safeMeta) * 100, 100) : 0

  function handleSave() {
    const parsed = Number.parseInt(tempMeta, 10)
    const newMeta = Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
    if (newMeta !== meta) onMetaChange(newMeta)
    setIsEditing(false)
  }

  return (
    <Card className="glass-card-intense hover-lift overflow-hidden">
      <div className="h-0.5 w-full bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50" />
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Meta do Dia</h3>
              <p className="text-xs text-muted-foreground">Candidaturas planejadas</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-0.5">Realizadas hoje</p>
            <p className="text-4xl font-black gradient-text tabular-nums leading-none">{safeCandidaturas}</p>
          </div>
        </div>

        <div className="mb-4">
          <label {...(isEditing && { htmlFor: "meta-input" })} className="text-xs text-muted-foreground block mb-1.5">
            Meta:
          </label>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                id="meta-input"
                type="number"
                value={tempMeta}
                onChange={(e) => setTempMeta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave()
                  else if (e.key === "Escape") setIsEditing(false)
                }}
                className="w-28 h-8 text-sm"
                min="0"
                autoFocus
              />
              <Button type="button" size="sm" onClick={handleSave} className="h-8 bg-primary" aria-label="Salvar meta">
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsEditing(true)
                setTempMeta(meta.toString())
              }}
              className="text-lg font-bold text-foreground hover:text-primary transition-colors group flex items-center gap-2"
            >
              {safeMeta} inscrições
              <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                (editar)
              </span>
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-medium">Progresso</span>
            <span className={cn("font-bold tabular-nums", getMetaTextColor(progress))}>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden bg-slate-200/90 ring-1 ring-slate-300/70 dark:bg-white/10 dark:ring-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r shadow-[0_0_18px_rgba(99,102,241,0.22)]",
                progress > 0 && "min-w-1.5",
                progress >= 100
                  ? "from-emerald-400 to-emerald-500"
                  : progress >= 75
                    ? "from-primary to-accent"
                    : "from-primary/80 to-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
