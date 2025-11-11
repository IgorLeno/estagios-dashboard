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

  // Gradiente dinâmico: vermelho → rosa → laranja → amarelo → verde → dourado
  function getGradientColor(progress: number): string {
    if (progress === 0) return "from-red-500 to-red-600"
    if (progress < 20) return "from-red-500 via-pink-500 to-pink-600"
    if (progress < 40) return "from-pink-500 via-orange-500 to-orange-600"
    if (progress < 60) return "from-orange-500 via-yellow-500 to-yellow-600"
    if (progress < 80) return "from-yellow-500 via-green-500 to-green-600"
    if (progress < 100) return "from-green-500 to-green-600"
    return "from-yellow-400 via-yellow-500 to-amber-500" // Dourado para 100%
  }

  function handleSave() {
    const newMeta = Number.parseInt(tempMeta) || 0
    onMetaChange(newMeta)
    setIsEditing(false)
  }

  return (
    <Card className={`bg-gradient-to-r ${getGradientColor(progress)} text-white border-0 shadow-lg`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Target className="h-5 w-5" />
          Meta do Dia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/90">Meta:</p>
            {isEditing ? (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  value={tempMeta}
                  onChange={(e) => setTempMeta(e.target.value)}
                  className="w-24 h-8 bg-white/20 border-white/40 text-white placeholder:text-white/60"
                  min="0"
                />
                <Button size="sm" variant="secondary" onClick={handleSave} className="h-8">
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p
                className="text-2xl font-bold cursor-pointer hover:underline"
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
            <p className="text-sm text-white/90">Candidaturas de Hoje:</p>
            <p className="text-4xl font-bold">{candidaturas}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span className="font-semibold">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
