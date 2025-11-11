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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!vaga) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-muted-foreground">Vaga não encontrada</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <Button variant="ghost" onClick={() => router.push("/")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{vaga.empresa}</h1>
              <p className="text-muted-foreground">
                Inscrição realizada em{" "}
                {format(new Date(vaga.data_inscricao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Informações Gerais</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setEditDialogOpen(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Cargo</p>
                <p className="font-medium">{vaga.cargo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Local</p>
                <p className="font-medium">{vaga.local}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Modalidade</p>
                <Badge variant="outline">{vaga.modalidade}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Fit</p>
                {vaga.fit ? (
                  <Badge className="bg-blue-600 text-white">{vaga.fit}%</Badge>
                ) : (
                  <p className="text-muted-foreground">-</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Etapa</p>
                <p className="font-medium">{vaga.etapa || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <Badge
                  variant={
                    vaga.status === "Aprovado" ? "default" : vaga.status === "Reprovado" ? "destructive" : "secondary"
                  }
                >
                  {vaga.status}
                </Badge>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground mb-1">Requisitos</p>
                <p className="text-sm">{vaga.requisitos || "-"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{vaga.observacoes || "-"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
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
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">Nenhum arquivo de análise enviado</p>
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Análise (.md)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
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
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">Nenhum currículo enviado</p>
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CV (.pdf/.docx)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <EditVagaDialog vaga={vaga} open={editDialogOpen} onOpenChange={setEditDialogOpen} onSuccess={loadVaga} />
      </div>
    </div>
  )
}
