"use client"

import { useRouter } from "next/navigation"
import type { VagaEstagio } from "@/lib/types"
import { TableCell, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Edit,
  FileText,
  Trash2,
  Download,
  Target,
  Activity,
  ExternalLink,
} from "lucide-react"
import { StarRating } from "@/components/ui/star-rating"
import { MarkdownPreview } from "@/components/ui/markdown-preview"
import { cn, toSafeNumber, getStatusVariant } from "@/lib/utils"
import { downloadPdf } from "@/lib/url-utils"

interface VagaTableRowProps {
  vaga: VagaEstagio
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: (vaga: VagaEstagio) => void
  onDelete: (vaga: VagaEstagio) => void
}

export function VagaTableRow({ vaga, isExpanded, onToggleExpand, onEdit, onDelete }: VagaTableRowProps) {
  const router = useRouter()
  void ChevronDown
  void getStatusVariant(vaga.status)

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="vaga-actions-button"
                  aria-label="Ações da vaga"
                  title="Ações da vaga"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(vaga)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(vaga)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                    <div className="space-y-3 w-full min-w-0">
                      <div className="w-full overflow-hidden min-w-0">
                        <MarkdownPreview
                          content={vaga.observacoes}
                          editable={false}
                          className="max-h-[400px] w-full min-w-0"
                        />
                      </div>
                      {/* Se houver link para análise completa */}
                      {vaga.arquivo_analise_url && (
                        <Button
                          variant="link"
                          size="sm"
                          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm mt-3 px-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadPdf(vaga.arquivo_analise_url, "analise-vaga.md")
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                          Ver análise completa
                        </Button>
                      )}
                    </div>
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

                {/* Card Currículo (só mostra se houver arquivo) */}
                {vaga.arquivo_cv_url && (
                  <Card className="glass-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Currículo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-border hover:border-primary hover:bg-primary/10 hover:text-primary transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadPdf(vaga.arquivo_cv_url, `curriculo-${vaga.empresa}.pdf`)
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
