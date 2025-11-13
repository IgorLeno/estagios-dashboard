"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { VagaEstagio } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit2, FileText, Upload, Download } from "lucide-react"
import { EditVagaDialog } from "@/components/edit-vaga-dialog"
import { FitCard } from "@/components/fit-card"
import { StatusCard } from "@/components/status-card"
import { Sidebar } from "@/components/sidebar"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function VagaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [vaga, setVaga] = useState<VagaEstagio | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadVaga()
  }, [params.id])

  async function loadVaga() {
    try {
      const { data, error } = await supabase.from("vagas_estagio").select("*").eq("id", params.id).single()

      if (error) throw error
      setVaga(data)
    } catch (error) {
      console.error("Erro ao carregar vaga:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ml-20">
        <p className="text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    )
  }

  if (!vaga) {
    return (
      <div className="min-h-screen flex items-center justify-center ml-20">
        <p className="text-muted-foreground">Vaga não encontrada</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar activeTab="estagios" onTabChange={() => router.push("/")} />
      <main className="flex-1 ml-20">
        <div className="container mx-auto px-8 py-6 max-w-6xl">
        <Button variant="ghost" onClick={() => router.push("/")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{vaga.empresa}</h1>
              <p className="text-lg text-muted-foreground mb-1">{vaga.cargo}</p>
              <p className="text-sm text-muted-foreground">
                Inscrição realizada em{" "}
                {format(new Date(vaga.data_inscricao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            <Button size="sm" onClick={() => setEditDialogOpen(true)} className="bg-primary hover:bg-primary/90">
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>

          {/* Two-column layout for Info + Fit/Status cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Main info */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card-intense">
                <CardHeader>
                  <CardTitle>Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Local</p>
                    <p className="font-medium text-foreground">{vaga.local}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Modalidade</p>
                    <Badge variant="outline" className="bg-muted border-border">
                      {vaga.modalidade}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm text-foreground">{vaga.observacoes || "Nenhuma observação"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card-intense">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Análise da Vaga
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {vaga.arquivo_analise_url ? (
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">analise.md</span>
                      </div>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">Nenhum arquivo de análise enviado</p>
                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Análise (.md)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card-intense">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Currículo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {vaga.arquivo_cv_url ? (
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">curriculo.pdf</span>
                      </div>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">Nenhum currículo enviado</p>
                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload CV (.pdf/.docx)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column - Fit and Status cards */}
            <div className="space-y-6">
              <FitCard requisitos={vaga.requisitos || 0} perfil={vaga.perfil || 0} readonly />
              <StatusCard status={vaga.status} etapa={vaga.etapa} />
            </div>
          </div>
        </div>

        <EditVagaDialog vaga={vaga} open={editDialogOpen} onOpenChange={setEditDialogOpen} onSuccess={loadVaga} />
      </div>
      </main>
    </div>
  )
}
