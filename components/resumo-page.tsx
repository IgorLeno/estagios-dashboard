"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { VagaEstagio, HistoricoResumo, StatusResumo, LocalResumo } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronRight, TrendingUp } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export function ResumoPage() {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [totalCandidaturas, setTotalCandidaturas] = useState(0)
  const [historico, setHistorico] = useState<HistoricoResumo[]>([])
  const [statusResumo, setStatusResumo] = useState<StatusResumo[]>([])
  const [locaisResumo, setLocaisResumo] = useState<LocalResumo[]>([])
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function loadResumo() {
    if (!startDate || !endDate) return

    setLoading(true)
    try {
      // Carregar todas as vagas no período
      const { data: vagas, error } = await supabase
        .from("vagas_estagio")
        .select("*")
        .gte("data_inscricao", startDate)
        .lte("data_inscricao", endDate)
        .order("data_inscricao", { ascending: true })

      if (error) throw error

      const vagasData = vagas || []
      setTotalCandidaturas(vagasData.length)

      // Processar histórico por dia
      const historicoMap = new Map<string, { meta: number; candidaturas: number }>()

      for (const vaga of vagasData) {
        const dateKey = vaga.data_inscricao
        if (!historicoMap.has(dateKey)) {
          historicoMap.set(dateKey, { meta: 0, candidaturas: 0 })
        }
        historicoMap.get(dateKey)!.candidaturas++
      }

      // Buscar metas
      const { data: metas } = await supabase
        .from("metas_diarias")
        .select("*")
        .gte("data", startDate)
        .lte("data", endDate)

      if (metas) {
        for (const meta of metas) {
          if (historicoMap.has(meta.data)) {
            historicoMap.get(meta.data)!.meta = meta.meta
          }
        }
      }

      const historicoArray: HistoricoResumo[] = Array.from(historicoMap.entries()).map(([data, info]) => ({
        data,
        meta: info.meta,
        candidaturas: info.candidaturas,
      }))
      setHistorico(historicoArray)

      // Processar resumo por status
      const statusMap = new Map<string, VagaEstagio[]>()
      for (const vaga of vagasData) {
        if (!statusMap.has(vaga.status)) {
          statusMap.set(vaga.status, [])
        }
        statusMap.get(vaga.status)!.push(vaga)
      }

      const statusArray: StatusResumo[] = Array.from(statusMap.entries()).map(([status, vagas]) => ({
        status,
        numero: vagas.length,
        vagas,
      }))
      setStatusResumo(statusArray)

      // Processar resumo por local
      const locaisMap = new Map<string, VagaEstagio[]>()
      for (const vaga of vagasData) {
        if (!locaisMap.has(vaga.local)) {
          locaisMap.set(vaga.local, [])
        }
        locaisMap.get(vaga.local)!.push(vaga)
      }

      const locaisArray: LocalResumo[] = Array.from(locaisMap.entries()).map(([local, vagas]) => ({
        local,
        numero: vagas.length,
        vagas,
      }))
      setLocaisResumo(locaisArray)
    } catch (error) {
      console.error("Erro ao carregar resumo:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtro por Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="startDate">Data de Início</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="endDate">Data de Término</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={loadResumo} disabled={loading || !startDate || !endDate}>
                {loading ? "Carregando..." : "Gerar Resumo"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {totalCandidaturas > 0 && (
        <>
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/90">Total de Candidaturas</p>
                  <p className="text-5xl font-bold mt-2">{totalCandidaturas}</p>
                </div>
                <TrendingUp className="h-12 w-12 text-white/80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Meta</TableHead>
                    <TableHead>Candidaturas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map((item) => (
                    <TableRow key={item.data}>
                      <TableCell>{format(new Date(item.data), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell>{item.meta || "-"}</TableCell>
                      <TableCell className="font-semibold">{item.candidaturas}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Número</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusResumo.map((item) => (
                    <Collapsible key={item.status} asChild>
                      <>
                        <CollapsibleTrigger asChild>
                          <TableRow className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]_&]:rotate-90" />
                            </TableCell>
                            <TableCell className="font-medium">{item.status}</TableCell>
                            <TableCell className="font-semibold">{item.numero}</TableCell>
                          </TableRow>
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={3} className="bg-muted/30 p-4">
                              <div className="space-y-2">
                                {item.vagas.map((vaga) => (
                                  <div
                                    key={vaga.id}
                                    className="flex justify-between items-center text-sm p-2 bg-background rounded border"
                                  >
                                    <span className="font-medium">{vaga.empresa}</span>
                                    <span className="text-muted-foreground">{vaga.cargo}</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Locais</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Número</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locaisResumo.map((item) => (
                    <Collapsible key={item.local} asChild>
                      <>
                        <CollapsibleTrigger asChild>
                          <TableRow className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]_&]:rotate-90" />
                            </TableCell>
                            <TableCell className="font-medium">{item.local}</TableCell>
                            <TableCell className="font-semibold">{item.numero}</TableCell>
                          </TableRow>
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={3} className="bg-muted/30 p-4">
                              <div className="space-y-2">
                                {item.vagas.map((vaga) => (
                                  <div
                                    key={vaga.id}
                                    className="flex justify-between items-center text-sm p-2 bg-background rounded border"
                                  >
                                    <span className="font-medium">{vaga.empresa}</span>
                                    <span className="text-muted-foreground">{vaga.cargo}</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
