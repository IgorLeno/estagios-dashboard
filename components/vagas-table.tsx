"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { VagaEstagio } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Plus, Search, Eye, Upload, FileText } from "lucide-react"
import { AddVagaDialog } from "./add-vaga-dialog"

interface VagasTableProps {
  vagas: VagaEstagio[]
  loading: boolean
  onVagaUpdate: () => void
}

export function VagasTable({ vagas, loading, onVagaUpdate }: VagasTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterModalidade, setFilterModalidade] = useState<string>("todas")
  const [filterStatus, setFilterStatus] = useState<string>("todos")
  const [showAddDialog, setShowAddDialog] = useState(false)

  const filteredVagas = vagas.filter((vaga) => {
    const matchesSearch =
      vaga.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vaga.cargo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesModalidade = filterModalidade === "todas" || vaga.modalidade === filterModalidade
    const matchesStatus = filterStatus === "todos" || vaga.status === filterStatus
    return matchesSearch && matchesModalidade && matchesStatus
  })

  function getFitBadgeColor(fit?: number) {
    if (!fit) return "bg-gray-500"
    if (fit >= 80) return "bg-green-500"
    if (fit >= 60) return "bg-yellow-500"
    if (fit >= 40) return "bg-orange-500"
    return "bg-red-500"
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vagas</CardTitle>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Vaga
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por empresa ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterModalidade} onValueChange={setFilterModalidade}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Modalidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="Presencial">Presencial</SelectItem>
                <SelectItem value="Híbrido">Híbrido</SelectItem>
                <SelectItem value="Remoto">Remoto</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Aguardando">Aguardando</SelectItem>
                <SelectItem value="Em processo">Em processo</SelectItem>
                <SelectItem value="Aprovado">Aprovado</SelectItem>
                <SelectItem value="Reprovado">Reprovado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
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
                      <TableCell className="font-medium">{vaga.empresa}</TableCell>
                      <TableCell>{vaga.cargo}</TableCell>
                      <TableCell>{vaga.local}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{vaga.modalidade}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{vaga.requisitos || "-"}</TableCell>
                      <TableCell>
                        {vaga.fit ? (
                          <Badge className={`${getFitBadgeColor(vaga.fit)} text-white`}>{vaga.fit}%</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{vaga.etapa || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            vaga.status === "Aprovado"
                              ? "default"
                              : vaga.status === "Reprovado"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {vaga.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">{vaga.observacoes || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/vaga/${vaga.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Análise
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="h-4 w-4 mr-2" />
                              Upload CV
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
    </>
  )
}
