"use client"

import { Suspense, useState, useEffect } from "react"
import type { VagaEstagio } from "@/lib/types"
import { Sidebar } from "@/components/sidebar"
import { VagasTable } from "@/components/vagas-table"
import { ResumoPage } from "@/components/resumo-page"
import { ConfiguracoesPage } from "@/components/configuracoes-page"
import { useSearchParams } from "next/navigation"

const VALID_HOME_TABS = new Set(["vagas", "resumo", "configuracoes"])

// Read-only shell: the job-search data layer (WP3) replaces this empty source.
const VAGAS: VagaEstagio[] = []

export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PageContent />
    </Suspense>
  )
}

function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background mesh-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent animate-pulse" />
        <p className="text-muted-foreground text-sm animate-pulse">Carregando...</p>
      </div>
    </div>
  )
}

function PageContent() {
  const [activeTab, setActiveTab] = useState("vagas")
  const searchParams = useSearchParams()

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && VALID_HOME_TABS.has(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex bg-background mesh-bg">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 ml-64 min-h-screen">
        <div className="sticky top-0 z-40 h-0.5 w-full bg-gradient-to-r from-primary via-accent to-primary opacity-60" />
        <div className="px-8 py-8 max-w-[1400px] mx-auto">
          {activeTab === "vagas" && <VagasTable vagas={VAGAS} />}

          {activeTab === "resumo" && <ResumoPage vagas={VAGAS} />}

          {activeTab === "configuracoes" && <ConfiguracoesPage />}
        </div>
      </main>
    </div>
  )
}
