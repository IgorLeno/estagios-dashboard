"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { getDataInscricao } from "@/lib/date-utils"
import { getVagasByDate } from "@/lib/supabase/queries"
import type { VagaEstagio, MetaDiaria } from "@/lib/types"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { MetaCard } from "@/components/meta-card"
import { VagasTable } from "@/components/vagas-table"
import { ResumoPage } from "@/components/resumo-page"
import { ConfiguracoesPage } from "@/components/configuracoes-page"

export default function Page() {
  const [activeTab, setActiveTab] = useState("vagas") // Start with main vagas tab
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [vagas, setVagas] = useState<VagaEstagio[]>([])
  const [meta, setMeta] = useState<MetaDiaria | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = useMemo(() => createClient(), [])

  // Initialize current date on mount
  useEffect(() => {
    const dataInscricaoStr = getDataInscricao(new Date())
    const [year, month, day] = dataInscricaoStr.split("-").map(Number)
    // Cria data em UTC para evitar problemas de timezone
    const dataInscricaoDate = new Date(Date.UTC(year, month - 1, day))
    setCurrentDate(dataInscricaoDate)
  }, [])

  const loadData = useCallback(async () => {
    if (!currentDate) return

    setLoading(true)
    try {
      // Carregar vagas do dia selecionado (filtrando dados de teste automaticamente)
      const dateStr = currentDate.toISOString().split("T")[0]
      console.log("[Page] Buscando vagas para data:", dateStr, "currentDate:", currentDate)
      const { data: vagasData, error: vagasError } = await getVagasByDate(dateStr)
      console.log("[Page] Vagas encontradas:", vagasData?.length || 0)

      if (vagasError) throw vagasError
      setVagas(vagasData || [])

      // Carregar meta do dia
      const { data: metaData, error: metaError } = await supabase
        .from("metas_diarias")
        .select("*")
        .eq("data", dateStr)
        .single()

      if (metaError && metaError.code !== "PGRST116") throw metaError
      setMeta(metaData || null)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }, [currentDate, supabase])

  useEffect(() => {
    if (currentDate) {
      loadData()
    }
  }, [currentDate, loadData])

  async function handleMetaChange(newMeta: number) {
    if (!currentDate) return

    const dateStr = currentDate.toISOString().split("T")[0]
    try {
      const { data, error } = await supabase
        .from("metas_diarias")
        .upsert({ data: dateStr, meta: newMeta }, { onConflict: "data" })
        .select()
        .single()

      if (error) throw error
      setMeta(data)
    } catch (error) {
      console.error("Erro ao atualizar meta:", error)
    }
  }

  function handlePrevDate() {
    if (!currentDate) return

    // Manipula data em UTC para manter consistência
    const newDate = new Date(currentDate)
    newDate.setUTCDate(newDate.getUTCDate() - 1)
    setCurrentDate(newDate)
  }

  function handleNextDate() {
    if (!currentDate) return

    // Manipula data em UTC para manter consistência
    const newDate = new Date(currentDate)
    newDate.setUTCDate(newDate.getUTCDate() + 1)
    setCurrentDate(newDate)
  }

  function handleDateSelect(date: Date) {
    // Normaliza data selecionada para UTC meia-noite para manter consistência
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()
    const utcDate = new Date(Date.UTC(year, month, day))
    setCurrentDate(utcDate)
  }

  // Don't render until currentDate is initialized
  if (!currentDate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 ml-64">
        <div className="container mx-auto px-8 py-6 max-w-7xl">
          {activeTab === "vagas" && (
            <div className="space-y-6">
              <DashboardHeader
                currentDate={currentDate}
                onPrevDate={handlePrevDate}
                onNextDate={handleNextDate}
                onDateSelect={handleDateSelect}
              />

              <MetaCard meta={meta?.meta || 0} candidaturas={vagas.length} onMetaChange={handleMetaChange} />

              <VagasTable vagas={vagas} loading={loading} onVagaUpdate={loadData} />
            </div>
          )}

          {activeTab === "resumo" && <ResumoPage />}

          {activeTab === "configuracoes" && <ConfiguracoesPage />}
        </div>
      </main>
    </div>
  )
}
