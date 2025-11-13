"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { VagaEstagio } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Plus, Search, Eye, Upload, FileText, Edit, Trash2 } from "lucide-react"
import { AddVagaDialog } from "./add-vaga-dialog"
import { EditVagaDialog } from "./edit-vaga-dialog"
import { toast } from "sonner"

interface VagasTableProps {
  vagas: VagaEstagio[]
  loading: boolean
  onVagaUpdate: () => void
}

export function VagasTable({ vagas, loading, onVagaUpdate }: VagasTableProps) {
  const router = useRouter()
  const supabase = createClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterModalidade, setFilterModalidade] = useState<string>("todas")
  const [filterStatus, setFilterStatus] = useState<string>("todos")
  const [filterEtapa, setFilterEtapa] = useState<string>("todas")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingVaga, setEditingVaga] = useState<VagaEstagio | null>(null)

  // Get unique etapas from vagas for filter
  const etapas = Array.from(new Set(vagas.map((v) => v.etapa).filter(Boolean))) as string[]

  const filteredVagas = vagas.filter((vaga) => {
    const matchesSearch =
      vaga.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vaga.cargo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesModalidade = filterModalidade === "todas" || vaga.modalidade === filterModalidade
    const matchesStatus = filterStatus === "todos" || vaga.status === filterStatus
    const matchesEtapa = filterEtapa === "todas" || vaga.etapa === filterEtapa
    return matchesSearch && matchesModalidade && matchesStatus && matchesEtapa
  })

  function getFitBadgeColor(fit?: number) {
    if (!fit) return "bg-[rgb(100_116_139)] border-[rgb(100_116_139_/_0.5)]"
    if (fit >= 80) return "bg-[rgb(19_255_227_/_0.3)] border-[rgb(19_255_227)] text-[rgb(19_255_227)] shadow-[0_0_8px_rgb(19_255_227_/_0.4)]"
    if (fit >= 60) return "bg-[rgb(139_92_246_/_0.3)] border-[rgb(139_92_246)] text-[rgb(139_92_246)] shadow-[0_0_8px_rgb(139_92_246_/_0.4)]"
    if (fit >= 40) return "bg-[rgb(251_146_60_/_0.3)] border-[rgb(251_146_60)] text-[rgb(251_146_60)]"
    return "bg-[rgb(239_68_68_/_0.3)] border-[rgb(239_68_68)] text-[rgb(239_68_68)]"
  }

  async function handleDeleteVaga(vaga: VagaEstagio) {
    if (!confirm(`Tem certeza que deseja excluir a vaga de ${vaga.empresa}?`)) {
      return
    }

    try {
      const { error } = await supabase.from("vagas_estagio").delete().eq("id", vaga.id)

      if (error) throw error

      toast.success("Vaga excluída com sucesso!")
      onVagaUpdate()
    } catch (error) {
      console.error("Erro ao excluir vaga:", error)
      toast.error("Erro ao excluir vaga. Tente novamente.")
    }
  }

  return (
    <>
      <Card className="glass-card-intense hover:shadow-[0_0_25px_rgb(19_255_227_/_0.2)] transition-all">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">Vagas</CardTitle>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-[rgb(19_255_227_/_0.2)] border border-[rgb(19_255_227_/_0.6)] text-[rgb(19_255_227)] hover:bg-[rgb(19_255_227_/_0.3)] hover:shadow-[0_0_15px_rgb(19_255_227_/_0.5)] transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Vaga
            </Button>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(19_255_227)]" />
              <Input
                placeholder="Buscar por empresa ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-[rgb(20_40_70_/_0.5)] border-[rgb(19_255_227_/_0.3)] text-foreground placeholder:text-muted-foreground focus:border-[rgb(19_255_227)] focus:shadow-[0_0_10px_rgb(19_255_227_/_0.3)]"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Select value={filterModalidade} onValueChange={setFilterModalidade}>
                <SelectTrigger className="bg-[rgb(20_40_70_/_0.5)] border-[rgb(19_255_227_/_0.3)] text-foreground hover:border-[rgb(19_255_227_/_0.5)]">
                  <SelectValue placeholder="Modalidade" />
                </SelectTrigger>
                <SelectContent className="bg-[rgb(13_27_42)] border-[rgb(19_255_227_/_0.4)]">
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="Presencial">Presencial</SelectItem>
                  <SelectItem value="Híbrido">Híbrido</SelectItem>
                  <SelectItem value="Remoto">Remoto</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-[rgb(20_40_70_/_0.5)] border-[rgb(19_255_227_/_0.3)] text-foreground hover:border-[rgb(19_255_227_/_0.5)]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-[rgb(13_27_42)] border-[rgb(19_255_227_/_0.4)]">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Avançado">Avançado</SelectItem>
                  <SelectItem value="Melou">Melou</SelectItem>
                  <SelectItem value="Contratado">Contratado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterEtapa} onValueChange={setFilterEtapa}>
                <SelectTrigger className="bg-[rgb(20_40_70_/_0.5)] border-[rgb(19_255_227_/_0.3)] text-foreground hover:border-[rgb(19_255_227_/_0.5)]">
                  <SelectValue placeholder="Etapa" />
                </SelectTrigger>
                <SelectContent className="bg-[rgb(13_27_42)] border-[rgb(19_255_227_/_0.4)]">
                  <SelectItem value="todas">Todas</SelectItem>
                  {etapas.map((etapa) => (
                    <SelectItem key={etapa} value={etapa}>
                      {etapa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setFilterModalidade("todas")
                  setFilterStatus("todos")
                  setFilterEtapa("todas")
                }}
                className="w-full bg-transparent border-[rgb(19_255_227_/_0.4)] text-foreground hover:bg-[rgb(19_255_227_/_0.1)] hover:border-[rgb(19_255_227_/_0.6)]"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">Carregando...</div>
          ) : filteredVagas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma vaga encontrada para este dia</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Requisitos</TableHead>
                    <TableHead>Fit</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Obs</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVagas.map((vaga) => (
                    <TableRow key={vaga.id}>
                      <TableCell className="font-medium text-foreground">{vaga.empresa}</TableCell>
                      <TableCell className="text-foreground">{vaga.cargo}</TableCell>
                      <TableCell className="text-muted-foreground">{vaga.local}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-[rgb(20_40_70_/_0.3)] border-[rgb(19_255_227_/_0.4)] text-foreground"
                        >
                          {vaga.modalidade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {vaga.requisitos !== undefined && vaga.requisitos !== null ? (
                          <Badge className={getFitBadgeColor(vaga.requisitos)}>{vaga.requisitos}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vaga.fit !== undefined && vaga.fit !== null ? (
                          <Badge
                            variant="outline"
                            className="bg-[rgb(20_40_70_/_0.3)] border-[rgb(19_255_227_/_0.4)] text-[rgb(19_255_227)]"
                          >
                            {vaga.fit}/10
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-foreground">{vaga.etapa || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            vaga.status === "Contratado"
                              ? "bg-[rgb(19_255_227_/_0.3)] border-[rgb(19_255_227)] text-[rgb(19_255_227)] shadow-[0_0_8px_rgb(19_255_227_/_0.5)]"
                              : vaga.status === "Melou"
                                ? "bg-[rgb(239_68_68_/_0.3)] border-[rgb(239_68_68)] text-[rgb(239_68_68)]"
                                : vaga.status === "Avançado"
                                  ? "bg-[rgb(139_92_246_/_0.3)] border-[rgb(139_92_246)] text-[rgb(139_92_246)]"
                                  : "bg-[rgb(20_40_70_/_0.3)] border-[rgb(19_255_227_/_0.3)] text-muted-foreground"
                          }
                        >
                          {vaga.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-muted-foreground">{vaga.observacoes || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid="vaga-actions-button">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/vaga/${vaga.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingVaga(vaga)}>
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
                            <DropdownMenuItem onClick={() => handleDeleteVaga(vaga)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddVagaDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSuccess={onVagaUpdate} />
      {editingVaga && (
        <EditVagaDialog
          open={!!editingVaga}
          vaga={editingVaga}
          onOpenChange={(open) => !open && setEditingVaga(null)}
          onSuccess={() => {
            setEditingVaga(null)
            onVagaUpdate()
          }}
        />
      )}
    </>
  )
}
