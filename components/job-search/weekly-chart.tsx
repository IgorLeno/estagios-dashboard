"use client"

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { WeekPoint } from "@/lib/job-search/metrics"
import { formatDay } from "@/lib/job-search/present"

interface Row {
  week: string
  analises: number
  candidaturas: number
}

/** Merges the two weekly series on one shared week axis (both are counts: one y-scale). */
export function mergeWeeks(analyses: WeekPoint[], applications: WeekPoint[]): Row[] {
  const weeks = [...new Set([...analyses, ...applications].map((point) => point.week))].sort()
  if (weeks.length === 0) return []
  const out: Row[] = []
  const cursor = new Date(`${weeks[0]}T00:00:00Z`)
  const last = weeks[weeks.length - 1]
  const count = (points: WeekPoint[], week: string) => points.find((point) => point.week === week)?.count ?? 0
  while (cursor.toISOString().slice(0, 10) <= last) {
    const week = cursor.toISOString().slice(0, 10)
    out.push({ week, analises: count(analyses, week), candidaturas: count(applications, week) })
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }
  return out
}

const SERIES = [
  { key: "analises", name: "Vagas analisadas", color: "var(--series-1)" },
  { key: "candidaturas", name: "Candidaturas enviadas", color: "var(--series-2)" },
] as const

function shortWeek(week: string): string {
  return formatDay(week).slice(0, 5)
}

export function WeeklyChart({ analyses, applications }: { analyses: WeekPoint[]; applications: WeekPoint[] }) {
  const data = mergeWeeks(analyses, applications)
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Sem datas no período.</p>
  }

  return (
    <div>
      <div className="h-64 w-full" role="img" aria-label="Vagas analisadas e candidaturas por semana">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="week"
              tickFormatter={shortWeek}
              stroke="var(--chart-axis)"
              tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-grid)" }}
            />
            <YAxis
              allowDecimals={false}
              stroke="var(--chart-axis)"
              tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              labelFormatter={(week) => `Semana de ${formatDay(String(week))}`}
              contentStyle={{
                background: "rgb(var(--popover))",
                border: "1px solid rgb(var(--border))",
                borderRadius: 8,
                color: "rgb(var(--popover-foreground))",
                fontSize: 12,
              }}
              labelStyle={{ color: "rgb(var(--popover-foreground))", fontWeight: 600 }}
              itemStyle={{ color: "rgb(var(--popover-foreground))" }}
              cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
            />
            <Legend
              iconType="plainline"
              wrapperStyle={{ fontSize: 12, color: "rgb(var(--muted-foreground))" }}
              formatter={(value) => <span style={{ color: "rgb(var(--foreground))" }}>{value}</span>}
            />
            {SERIES.map((series) => (
              <Line
                key={series.key}
                type="linear"
                dataKey={series.key}
                name={series.name}
                stroke={series.color}
                strokeWidth={2}
                dot={{ r: 4, fill: series.color, stroke: "rgb(var(--card))", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: series.color, stroke: "rgb(var(--card))", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver tabela</summary>
        <table className="mt-2 w-full text-left text-xs tabular-nums">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">Semana</th>
              <th className="py-1 font-medium">Analisadas</th>
              <th className="py-1 font-medium">Candidaturas</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.week} className="border-t border-border/60">
                <td className="py-1">{formatDay(row.week)}</td>
                <td className="py-1">{row.analises}</td>
                <td className="py-1">{row.candidaturas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
