"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { HistoricoResumo } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Briefcase } from "lucide-react"
import { format, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useTheme } from "next-themes"

export function ResumoPage() {
  const [totalCandidaturas, setTotalCandidaturas] = useState(0)
  const [historico, setHistorico] = useState<HistoricoResumo[]>([])
  const [loading, setLoading] = useState(true)
  const { theme, resolvedTheme } = useTheme()

  const supabase = createClient()

  // Determine current theme (resolvedTheme handles "system" preference)
  const isDark = resolvedTheme === "dark"

  // Explicit color palette for chart visibility
  const chartColors = {
    line: isDark ? "#60A5FA" : "#2563EB", // Light blue (dark) / Blue (light)
    dot: isDark ? "#3B82F6" : "#06B6D4", // Blue (dark) / Cyan (light)
    grid: isDark ? "#374151" : "#E5E7EB", // Dark gray (dark) / Light gray (light)
    axis: isDark ? "#9CA3AF" : "#6B7280", // Medium-light gray (dark) / Medium gray (light)
    tooltipBg: isDark ? "#1F2937" : "#FFFFFF", // Dark (dark) / White (light)
    tooltipBorder: isDark ? "#374151" : "#D1D5DB", // Dark gray (dark) / Light gray (light)
    tooltipText: isDark ? "#E5E7EB" : "#1F2937", // Light (dark) / Dark (light)
  }

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
        const rawKey = vaga.data_inscricao as string | Date
        const dateKey = typeof rawKey === "string" ? rawKey.slice(0, 10) : format(rawKey, "yyyy-MM-dd")
        const current = historicoMap.get(dateKey)
        if (current) current.candidaturas++
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

      {/* Line Chart - Last 7 Days */}
      <Card className="glass-card-intense hover-lift">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Histórico - Últimos 7 Dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={historico.map((item) => ({
                data: format(new Date(item.data), "dd/MM", { locale: ptBR }),
                candidaturas: item.candidaturas,
              }))}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} opacity={0.5} vertical={false} />
              <XAxis
                dataKey="data"
                stroke={chartColors.axis}
                tick={{ fill: chartColors.axis, fontSize: 12 }}
                tickLine={{ stroke: chartColors.axis }}
              />
              <YAxis
                stroke={chartColors.axis}
                tick={{ fill: chartColors.axis, fontSize: 12 }}
                tickLine={{ stroke: chartColors.axis }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartColors.tooltipBg,
                  border: `1px solid ${chartColors.tooltipBorder}`,
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                labelStyle={{ color: chartColors.tooltipText, fontWeight: 600 }}
                itemStyle={{ color: chartColors.line }}
              />
              <Line
                type="monotone"
                dataKey="candidaturas"
                stroke={chartColors.line}
                strokeWidth={3}
                dot={{ fill: chartColors.dot, r: 6, strokeWidth: 2, stroke: "#FFFFFF" }}
                activeDot={{ r: 8, fill: chartColors.line, strokeWidth: 2, stroke: "#FFFFFF" }}
                name="Candidaturas"
                animationDuration={800}
                animationEasing="ease-in-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
