"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { HistoricoResumo } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Briefcase } from "lucide-react"
import { format, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"

export function ResumoPage() {
  const [totalCandidaturas, setTotalCandidaturas] = useState(0)
  const [historico, setHistorico] = useState<HistoricoResumo[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadLast7Days()
  }, [])

  async function loadLast7Days() {
    setLoading(true)
    try {
      // Calculate date range for last 7 days
      const endDate = new Date()
      const startDate = subDays(endDate, 6) // 7 days total including today

      const startDateStr = format(startDate, "yyyy-MM-dd")
      const endDateStr = format(endDate, "yyyy-MM-dd")

      // Load all vagas from last 7 days
      const { data: vagas, error } = await supabase
        .from("vagas_estagio")
        .select("*")
        .gte("data_inscricao", startDateStr)
        .lte("data_inscricao", endDateStr)
        .order("data_inscricao", { ascending: true })

      if (error) throw error

      const vagasData = vagas || []
      setTotalCandidaturas(vagasData.length)

      // Create map for all 7 days (initialize with 0)
      const historicoMap = new Map<string, { meta: number; candidaturas: number }>()
      for (let i = 0; i < 7; i++) {
        const date = subDays(endDate, 6 - i)
        const dateStr = format(date, "yyyy-MM-dd")
        historicoMap.set(dateStr, { meta: 0, candidaturas: 0 })
      }

      // Count candidaturas per day
      for (const vaga of vagasData) {
        const dateKey = vaga.data_inscricao
        if (historicoMap.has(dateKey)) {
          historicoMap.get(dateKey)!.candidaturas++
        }
      }

      const historicoArray: HistoricoResumo[] = Array.from(historicoMap.entries()).map(([data, info]) => ({
        data,
        meta: info.meta,
        candidaturas: info.candidaturas,
      }))
      setHistorico(historicoArray)
    } catch (error) {
      console.error("Erro ao carregar resumo:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground animate-pulse">Carregando resumo...</p>
      </div>
    )
  }

  const maxCandidaturas = Math.max(...historico.map((h) => h.candidaturas), 1)

  return (
    <div className="space-y-6">
      {/* Total Candidaturas Card */}
      <Card className="glass-card-intense hover-lift border-primary/20">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Total de Candidaturas (últimos 7 dias)</p>
              <p className="text-6xl font-bold text-primary">{totalCandidaturas}</p>
            </div>
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-10 w-10 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart - Last 7 Days */}
      <Card className="glass-card-intense hover-lift">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Histórico - Últimos 7 Dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {historico.map((item) => {
              const percentage = maxCandidaturas > 0 ? (item.candidaturas / maxCandidaturas) * 100 : 0
              const dateFormatted = format(new Date(item.data), "dd/MM", { locale: ptBR })

              return (
                <div key={item.data} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">{dateFormatted}</span>
                    <span className="text-foreground font-semibold">{item.candidaturas}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-8 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300 flex items-center justify-end px-3"
                      style={{ width: `${Math.max(percentage, item.candidaturas > 0 ? 10 : 0)}%` }}
                    >
                      {item.candidaturas > 0 && <span className="text-xs font-medium text-white">{item.candidaturas}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
