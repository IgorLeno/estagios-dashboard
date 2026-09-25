"use client"

import { useState } from "react"
import type { VagaEstagio } from "@/lib/types"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { VagaTableRow } from "./vaga-table-row"

interface VagasTableProps {
  vagas: VagaEstagio[]
}

export function VagasTable({ vagas }: VagasTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterModalidade, setFilterModalidade] = useState<string>("todas")
  const [filterStatus, setFilterStatus] = useState<string>("todos")
  const [expandedVagaId, setExpandedVagaId] = useState<string | null>(null)

  const filteredVagas = vagas.filter((vaga) => {
    const matchesSearch =
      vaga.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vaga.cargo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesModalidade = filterModalidade === "todas" || vaga.modalidade === filterModalidade
    const matchesStatus = filterStatus === "todos" || vaga.status === filterStatus
    return matchesSearch && matchesModalidade && matchesStatus
  })

  return (
    <Card className="glass-card-intense hover-lift">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground" data-testid="vagas-card-title">
            Estágios
          </CardTitle>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-input border-border text-foreground hover:border-primary">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Avançado">Avançado</SelectItem>
                <SelectItem value="Melou">Melou</SelectItem>
                <SelectItem value="Contratado">Contratado</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("")
                setFilterModalidade("todas")
                setFilterStatus("todos")
              }}
              className="bg-transparent border-border text-foreground hover:bg-muted hover:border-primary"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredVagas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhuma vaga encontrada</div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead scope="col" className="text-left font-semibold w-[25%]">
                    Empresa
                  </TableHead>
                  <TableHead scope="col" className="text-left font-semibold w-[25%]">
                    Cargo
                  </TableHead>
                  <TableHead scope="col" className="text-left font-semibold w-[20%]">
                    Local
                  </TableHead>
                  <TableHead scope="col" className="text-left font-semibold w-[15%]">
                    Modalidade
                  </TableHead>
                  <TableHead scope="col" className="w-[15%]">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVagas.map((vaga) => (
                  <VagaTableRow
                    key={vaga.id}
                    vaga={vaga}
                    isExpanded={expandedVagaId === vaga.id}
                    onToggleExpand={() => setExpandedVagaId(expandedVagaId === vaga.id ? null : vaga.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
