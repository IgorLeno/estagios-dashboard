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
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingVaga, setEditingVaga] = useState<VagaEstagio | null>(null)

  const filteredVagas = vagas.filter((vaga) => {
    const matchesSearch =
      vaga.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vaga.cargo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesModalidade = filterModalidade === "todas" || vaga.modalidade === filterModalidade
    return matchesSearch && matchesModalidade
  })

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
      <Card className="glass-card-intense hover-lift">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">Vagas</CardTitle>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Vaga
            </Button>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="search-vagas"
                aria-label="Buscar vagas por empresa ou cargo"
                placeholder="Buscar por empresa ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex gap-3">
              <Select value={filterModalidade} onValueChange={setFilterModalidade}>
                <SelectTrigger className="bg-input border-border text-foreground hover:border-primary">
                  <SelectValue placeholder="Modalidade" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="Presencial">Presencial</SelectItem>
                  <SelectItem value="Híbrido">Híbrido</SelectItem>
                  <SelectItem value="Remoto">Remoto</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setFilterModalidade("todas")
                }}
                className="bg-transparent border-border text-foreground hover:bg-muted hover:border-primary"
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
                  <TableRow className="border-b border-border">
                    <TableHead scope="col" className="text-left font-semibold">
                      Empresa
                    </TableHead>
                    <TableHead scope="col" className="text-left font-semibold">
                      Cargo
                    </TableHead>
                    <TableHead scope="col" className="text-left font-semibold">
                      Local
                    </TableHead>
                    <TableHead scope="col" className="text-left font-semibold">
                      Modalidade
                    </TableHead>
                    <TableHead scope="col" className="w-[50px]">
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVagas.map((vaga) => (
                    <TableRow key={vaga.id} className="border-b border-border hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">{vaga.empresa}</TableCell>
                      <TableCell className="text-foreground">{vaga.cargo}</TableCell>
                      <TableCell className="text-muted-foreground">{vaga.local}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{vaga.modalidade}</Badge>
                      </TableCell>
                      <TableCell>
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
