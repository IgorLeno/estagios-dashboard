"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { VagaEstagio } from "@/lib/types"
import { TableCell, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, ChevronRight, MoreHorizontal, Eye, Edit, Upload, FileText, Trash2, Download } from "lucide-react"
import { StarRating } from "@/components/ui/star-rating"
import { cn, toSafeNumber } from "@/lib/utils"
import { safeOpenSupabaseStorageUrl } from "@/lib/url-utils"

interface VagaTableRowProps {
  vaga: VagaEstagio
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: (vaga: VagaEstagio) => void
  onDelete: (vaga: VagaEstagio) => void
}

const statusConfig = {
  Pendente: "bg-gray-100 text-gray-700 border-gray-300",
  Avançado: "bg-purple-100 text-purple-700 border-purple-300",
  Melou: "bg-red-100 text-red-700 border-red-300",
  Contratado: "bg-green-100 text-green-700 border-green-300",
}

export function VagaTableRow({ vaga, isExpanded, onToggleExpand, onEdit, onDelete }: VagaTableRowProps) {
  const router = useRouter()
  const [lastClickTime, setLastClickTime] = useState(0)

  // Gerenciar clique simples vs duplo clique
  function handleRowClick() {
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTime

    if (timeSinceLastClick < 300) {
      // Duplo clique - navegar para detalhes
      router.push(`/vaga/${vaga.id}`)
    } else {
      // Clique simples - expandir/recolher
      onToggleExpand()
    }

    setLastClickTime(now)
  }

  return (
    <>
      {/* Linha principal */}
      <TableRow
        className={cn(
          "border-b border-border hover:bg-muted/50 transition-colors cursor-pointer",
          isExpanded && "bg-muted/30"
        )}
        onClick={handleRowClick}
      >
        <TableCell className="font-medium text-foreground">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            {vaga.empresa}
          </div>
        </TableCell>
        <TableCell className="text-foreground">{vaga.cargo}</TableCell>
        <TableCell className="text-muted-foreground">{vaga.local}</TableCell>
        <TableCell>
          <Badge variant="outline">{vaga.modalidade}</Badge>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
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
              <DropdownMenuItem onClick={() => router.push(`/vaga/${vaga.id}`)}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(vaga)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Upload className="h-4 w-4 mr-2" />
                Upload Análise
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="h-4 w-4 mr-2" />
                Upload CV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(vaga)} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {/* Linha expandida com cards */}
      {isExpanded && (
        <TableRow className="border-b border-border">
          <TableCell colSpan={5} className="bg-muted/20 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card Fit */}
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Fit</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Requisitos</p>
                    <StarRating value={toSafeNumber(vaga.requisitos)} readonly size="sm" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Perfil</p>
                    <StarRating value={toSafeNumber(vaga.perfil)} readonly size="sm" />
                  </div>
                </CardContent>
              </Card>

              {/* Card Status */}
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className={cn("w-full justify-center py-2", statusConfig[vaga.status])}>
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

              {/* Card Análise (só mostra se houver arquivo) */}
              {vaga.arquivo_analise_url && (
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Análise</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        safeOpenSupabaseStorageUrl(vaga.arquivo_analise_url)
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download .md
                    </Button>
                  </CardContent>
                </Card>
              )}

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
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        safeOpenSupabaseStorageUrl(vaga.arquivo_cv_url)
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Card Observações (só mostra se houver) */}
              {vaga.observacoes && (
                <Card className="glass-card lg:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{vaga.observacoes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
