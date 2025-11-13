"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { getDataInscricao } from "@/lib/date-utils"
import type { VagaEstagio, MetaDiaria, Configuracao } from "@/lib/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { MetaCard } from "@/components/meta-card"
import { VagasTable } from "@/components/vagas-table"
import { ResumoPage } from "@/components/resumo-page"
import { ConfiguracoesPage } from "@/components/configuracoes-page"

export default function Page() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [vagas, setVagas] = useState<VagaEstagio[]>([])
  const [meta, setMeta] = useState<MetaDiaria | null>(null)
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<Configuracao | null>(null)

  const supabase = useMemo(() => createClient(), [])

  // Load config and initialize current date on mount
  useEffect(() => {
    loadConfigAndInitializeDate()
  }, [])

  async function loadConfigAndInitializeDate() {
    try {
      const { data, error: configError } = await supabase.from("configuracoes").select("*").single()
      if (configError && configError.code !== "PGRST116") {
        throw configError
      }
      setConfig(data)

      // Initialize currentDate with the inscription date logic
      const dataInscricaoStr = getDataInscricao(new Date(), data || undefined)
      const [year, month, day] = dataInscricaoStr.split("-").map(Number)
      const dataInscricaoDate = new Date(year, month - 1, day)
      setCurrentDate(dataInscricaoDate)
    } catch (error) {
      console.error("Erro ao carregar configurações:", error)
      // Fallback to today if config load fails
      const dataInscricaoStr = getDataInscricao(new Date())
      const [year, month, day] = dataInscricaoStr.split("-").map(Number)
      const dataInscricaoDate = new Date(year, month - 1, day)
      setCurrentDate(dataInscricaoDate)
    }
  }

  const loadData = useCallback(async () => {
    if (!currentDate) return

    setLoading(true)
    try {
      // Carregar vagas do dia selecionado
      const dateStr = currentDate.toISOString().split("T")[0]
      console.log("[Page] Buscando vagas para data:", dateStr, "currentDate:", currentDate)
      const { data: vagasData, error: vagasError } = await supabase
        .from("vagas_estagio")
        .select("*")
        .eq("data_inscricao", dateStr)
        .order("created_at", { ascending: false })
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

    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 1)
    setCurrentDate(newDate)
  }

  function handleNextDate() {
    if (!currentDate) return

    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 1)
    setCurrentDate(newDate)
  }

  function handleDateSelect(date: Date) {
    setCurrentDate(date)
  }

  // Don't render until currentDate is initialized
  if (!currentDate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Tabs defaultValue="estagios" className="space-y-6">
          <TabsList>
            <TabsTrigger value="estagios">Estágios</TabsTrigger>
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="estagios" className="space-y-6">
            <DashboardHeader
              currentDate={currentDate}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onDateSelect={handleDateSelect}
            />

            <MetaCard meta={meta?.meta || 0} candidaturas={vagas.length} onMetaChange={handleMetaChange} />

            <VagasTable vagas={vagas} loading={loading} onVagaUpdate={loadData} />
          </TabsContent>

          <TabsContent value="resumo">
            <ResumoPage />
          </TabsContent>

          <TabsContent value="configuracoes">
            <ConfiguracoesPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
