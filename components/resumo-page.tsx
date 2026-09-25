"use client"

import { useState, useEffect, useMemo } from "react"
import type { HistoricoResumo, VagaEstagio } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Briefcase } from "lucide-react"
import { format, parse, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useTheme } from "next-themes"

interface ResumoPageProps {
  vagas: VagaEstagio[]
}

export function ResumoPage({ vagas }: ResumoPageProps) {
  const [themeReady, setThemeReady] = useState(false)
  const { resolvedTheme } = useTheme()

  // Aguarda resolução do tema para evitar flash
  useEffect(() => {
    if (typeof resolvedTheme === "string") {
      setThemeReady(true)
    }
  }, [resolvedTheme])

  // Determine current theme (resolvedTheme handles "system" preference)
  // Só calcula após tema estar pronto para evitar flash
  const isDark = themeReady && resolvedTheme === "dark"

  // Explicit color palette for chart visibility
  // Usa valores padrão (light mode) até o tema estar pronto
  const chartColors = {
    line: isDark ? "#60A5FA" : "#2563EB", // Light blue (dark) / Blue (light)
    dot: isDark ? "#3B82F6" : "#06B6D4", // Blue (dark) / Cyan (light)
    grid: isDark ? "#374151" : "#E5E7EB", // Dark gray (dark) / Light gray (light)
    axis: isDark ? "#9CA3AF" : "#6B7280", // Medium-light gray (dark) / Medium gray (light)
    tooltipBg: isDark ? "#1F2937" : "#FFFFFF", // Dark (dark) / White (light)
    tooltipBorder: isDark ? "#374151" : "#D1D5DB", // Dark gray (dark) / Light gray (light)
    tooltipText: isDark ? "#E5E7EB" : "#1F2937", // Light (dark) / Dark (light)
  }

  const { totalCandidaturas, historico } = useMemo(() => summarizeLast7Days(vagas, new Date()), [vagas])

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
                data: format(parse(item.data, "yyyy-MM-dd", new Date()), "dd/MM", { locale: ptBR }),
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

function summarizeLast7Days(vagas: VagaEstagio[], endDate: Date) {
  // 7 days including today, every day initialized with 0
  const historicoMap = new Map<string, number>()
  for (let i = 0; i < 7; i++) {
    historicoMap.set(format(subDays(endDate, 6 - i), "yyyy-MM-dd"), 0)
  }

  let totalCandidaturas = 0
  for (const vaga of vagas) {
    const dateKey = vaga.data_inscricao.slice(0, 10)
    const current = historicoMap.get(dateKey)
    if (current !== undefined) {
      historicoMap.set(dateKey, current + 1)
      totalCandidaturas++
    }
  }

  const historico: HistoricoResumo[] = Array.from(historicoMap.entries()).map(([data, candidaturas]) => ({
    data,
    meta: 0,
    candidaturas,
  }))
  return { totalCandidaturas, historico }
}
