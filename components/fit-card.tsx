"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StarRating } from "@/components/ui/star-rating"

interface FitCardProps {
  requisitos: number // 0 to 5
  perfil: number // 0 to 5
  onRequisitosChange?: (value: number) => void
  onPerfilChange?: (value: number) => void
  readonly?: boolean
}

export function FitCard({ requisitos, perfil, onRequisitosChange, onPerfilChange, readonly = false }: FitCardProps) {
  return (
    <Card className="glass-card hover-lift">
      <CardHeader>
        <CardTitle className="text-lg">Fit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Requisitos</label>
          <StarRating value={requisitos} onChange={onRequisitosChange} readonly={readonly} size="md" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Perfil</label>
          <StarRating value={perfil} onChange={onPerfilChange} readonly={readonly} size="md" />
        </div>
      </CardContent>
    </Card>
  )
}
