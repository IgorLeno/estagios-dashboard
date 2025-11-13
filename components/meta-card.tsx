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
            <p className="text-sm text-muted-foreground mb-2">Meta:</p>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={tempMeta}
                  onChange={(e) => setTempMeta(e.target.value)}
                  className="w-24 h-9 bg-input border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                  min="0"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleSave}
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
            <span className="font-semibold tabular-nums text-primary">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
