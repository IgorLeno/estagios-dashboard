"use client"

import { useRouter } from "next/navigation"
import type { VagaEstagio } from "@/lib/types"
import { TableCell, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, Eye, FileText, Target, Activity } from "lucide-react"
import { StarRating } from "@/components/ui/star-rating"
import { cn, toSafeNumber } from "@/lib/utils"

interface VagaTableRowProps {
  vaga: VagaEstagio
  isExpanded: boolean
  onToggleExpand: () => void
}

export function VagaTableRow({ vaga, isExpanded, onToggleExpand }: VagaTableRowProps) {
  const router = useRouter()

  return (
    <>
      {/* Linha principal */}
      <TableRow
        className={cn(
          "border-b border-border/50 transition-all duration-200 group",
          "hover:bg-primary/5 hover:border-primary/20",
          isExpanded && "bg-primary/8 border-primary/30"
        )}
      >
        <TableCell className="font-medium text-foreground">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-2 w-full text-left font-semibold hover:text-primary transition-colors group-hover:text-primary/90"
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200",
                isExpanded && "rotate-90 text-primary"
              )}
            />
            {vaga.empresa}
          </button>
        </TableCell>
        <TableCell className="text-foreground">{vaga.cargo}</TableCell>
        <TableCell className="text-muted-foreground">{vaga.local}</TableCell>
        <TableCell>
          <Badge
            className={cn(
              "text-xs font-medium border rounded-full px-2.5 py-0.5",
              vaga.modalidade === "Remoto" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
              vaga.modalidade === "Híbrido" && "bg-primary/10 text-primary border-primary/20",
              vaga.modalidade === "Presencial" && "bg-accent/10 text-accent border-accent/20",
              !["Remoto", "Híbrido", "Presencial"].includes(vaga.modalidade) &&
                "bg-muted text-muted-foreground border-border"
            )}
          >
            {vaga.modalidade}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/vaga/${vaga.id}`)}
              className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
              title="Ver detalhes da vaga"
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver Detalhes
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Linha expandida com cards */}
      {isExpanded && (
        <TableRow className="border-b border-primary/10">
          <TableCell colSpan={5} className="bg-primary/3 p-6 max-w-full overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full min-w-0">
              {/* Card Principal: Resumo da Análise (2/3 da largura) */}
              <Card className="glass-card lg:col-span-2 min-w-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Resumo
                  </CardTitle>
                </CardHeader>
                <CardContent className="min-w-0">
                  {vaga.observacoes ? (
                    // Plain text on purpose: source text is untrusted and must not be rendered as HTML.
                    <p className="max-h-[400px] overflow-y-auto whitespace-pre-wrap break-words text-sm text-foreground">
                      {vaga.observacoes}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma análise disponível para esta vaga.</p>
                  )}
                </CardContent>
              </Card>

              {/* Coluna Direita: Fit e Status empilhados (1/3 da largura) */}
              <div className="lg:col-span-1 flex flex-col gap-4">
                {/* Card Fit */}
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Fit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Requisitos */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Requisitos</p>
                      <div className="flex items-center gap-2">
                        <StarRating value={toSafeNumber(vaga.requisitos)} readonly size="sm" />
                        <span className="text-sm font-semibold text-foreground">
                          {toSafeNumber(vaga.requisitos || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Perfil */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Perfil</p>
                      <div className="flex items-center gap-2">
                        <StarRating value={toSafeNumber(vaga.perfil)} readonly size="sm" />
                        <span className="text-sm font-semibold text-foreground">
                          {toSafeNumber(vaga.perfil || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Status */}
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge
                      className={cn(
                        "w-full justify-center py-2 text-sm font-semibold rounded-lg border",
                        vaga.status === "Pendente" && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                        vaga.status === "Avançado" && "bg-primary/10 text-primary border-primary/20",
                        vaga.status === "Melou" && "bg-destructive/10 text-destructive border-destructive/20",
                        vaga.status === "Contratado" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                        !["Pendente", "Avançado", "Melou", "Contratado"].includes(vaga.status) &&
                          "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {vaga.status}
                    </Badge>
                    {vaga.etapa && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">Etapa</p>
                        <p className="text-sm font-medium">{vaga.etapa}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
