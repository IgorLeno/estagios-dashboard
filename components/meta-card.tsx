"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Target, Check } from "lucide-react"

interface MetaCardProps {
  meta: number
  candidaturas: number
  onMetaChange: (newMeta: number) => void
}

export function MetaCard({ meta, candidaturas, onMetaChange }: MetaCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempMeta, setTempMeta] = useState(meta.toString())

  const progress = meta > 0 ? Math.min((candidaturas / meta) * 100, 100) : 0

  function handleSave() {
    const newMeta = Number.parseInt(tempMeta) || 0
    onMetaChange(newMeta)
    setIsEditing(false)
  }

  return (
    <Card className="glass-card-intense transition-all duration-700 ease-in-out hover:shadow-[0_0_30px_rgb(19_255_227_/_0.3)] hover:scale-[1.01] hover:border-[rgb(19_255_227_/_0.6)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[rgb(19_255_227_/_0.2)] border-2 border-[rgb(19_255_227)] flex items-center justify-center shadow-[0_0_15px_rgb(19_255_227_/_0.6)]">
            <Target className="h-6 w-6 text-[rgb(19_255_227)] transition-transform duration-300 hover:rotate-12" />
          </div>
          <span className="text-foreground">Meta do Dia</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Meta:</p>
            {isEditing ? (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                <Input
                  type="number"
                  value={tempMeta}
                  onChange={(e) => setTempMeta(e.target.value)}
                  className="w-24 h-9 bg-[rgb(20_40_70_/_0.6)] border-[rgb(19_255_227_/_0.4)] text-foreground placeholder:text-muted-foreground focus:border-[rgb(19_255_227)] focus:shadow-[0_0_10px_rgb(19_255_227_/_0.3)]"
                  min="0"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSave}
                  className="h-9 bg-[rgb(19_255_227_/_0.2)] border border-[rgb(19_255_227_/_0.5)] text-[rgb(19_255_227)] hover:bg-[rgb(19_255_227_/_0.3)] hover:shadow-[0_0_10px_rgb(19_255_227_/_0.5)] transition-all"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p
                className="text-2xl font-bold cursor-pointer text-foreground hover:text-[rgb(19_255_227)] transition-all hover:scale-105 active:scale-95"
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
            <p className="text-5xl font-bold tabular-nums text-[rgb(19_255_227)] drop-shadow-[0_0_15px_rgb(19_255_227_/_0.8)] transition-all duration-500 hover:scale-110">
              {candidaturas}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-foreground">Progresso</span>
            <span className="font-semibold tabular-nums text-[rgb(19_255_227)]">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-[rgb(30_50_80_/_0.5)] rounded-full overflow-hidden border border-[rgb(19_255_227_/_0.3)]">
            <div
              className="h-full bg-gradient-to-r from-[rgb(19_255_227)] to-[rgb(0_240_255)] shadow-[0_0_10px_rgb(19_255_227_/_0.8)] transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
