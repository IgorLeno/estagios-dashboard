"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Target, Check } from "lucide-react"
import { cn, getMetaProgressColor, getMetaTextColor, getMetaCompletionEffects, toSafeNumber } from "@/lib/utils"

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
    <Card className="glass-card-intense hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <span className="text-foreground">Meta do Dia</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label {...(isEditing && { htmlFor: "meta-input" })} className="text-sm text-muted-foreground mb-2 block">
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
                    if (e.key === "Enter") {
                      handleSave()
                    } else if (e.key === "Escape") {
                      setIsEditing(false)
                    }
                  }}
                  className="w-24 h-9 bg-input border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                  min="0"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  aria-label="Salvar meta"
                  className="h-9 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p
                className="text-2xl font-bold cursor-pointer text-foreground hover:text-primary transition-all hover:scale-105 active:scale-95"
                onClick={() => {
                  setIsEditing(true)
                  setTempMeta(meta.toString())
                }}
              >
                {meta} inscrições
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-2">Candidaturas de Hoje:</p>
            <p className="text-5xl font-bold tabular-nums text-primary transition-all duration-500 hover:scale-110">
              {candidaturas}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-foreground">Progresso</span>
            <span
              className={cn("font-semibold tabular-nums transition-colors duration-300", getMetaTextColor(progress))}
            >
              {progress.toFixed(0)}%
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-700 ease-out",
                getMetaProgressColor(progress),
                getMetaCompletionEffects(progress)
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
