"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getVagaById } from "@/lib/supabase/queries"
import type { VagaEstagio } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Edit2, FileText, Download, RefreshCw, Star, User, MapPin, Building2 } from "lucide-react"
import { EditVagaDialog } from "@/components/edit-vaga-dialog"
import { ResumeGeneratorDialog } from "@/components/resume-generator-dialog"
import { Sidebar } from "@/components/sidebar"
import { StarRating } from "@/components/ui/star-rating"
import { MarkdownPreview } from "@/components/ui/markdown-preview"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { downloadPdf } from "@/lib/url-utils"
import { toSafeNumber, getStatusVariant } from "@/lib/utils"
import { toast } from "sonner"

export default function VagaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [vaga, setVaga] = useState<VagaEstagio | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [markdownContent, setMarkdownContent] = useState("")
  const [isEditingMarkdown, setIsEditingMarkdown] = useState(false)

  useEffect(() => {
    loadVaga()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function loadVaga() {
    try {
      const { data, error } = await getVagaById(params.id as string)

      if (error) throw error
      setVaga(data)

      // Se houver arquivo de análise, carregar conteúdo para preview
      if (data?.observacoes) {
        setMarkdownContent(data.observacoes)
      }
    } catch (error) {
      console.error("Erro ao carregar vaga:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveMarkdown() {
    if (!vaga || !markdownContent) return

    try {
      const response = await fetch(`/api/vagas/${vaga.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observacoes: markdownContent }),
      })

      if (!response.ok) throw new Error("Failed to save markdown")

      toast.success("Análise atualizada com sucesso!")
      setIsEditingMarkdown(false)
      loadVaga()
    } catch (error) {
      console.error("Error saving markdown:", error)
      toast.error("Erro ao salvar análise")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ml-64">
        <p className="text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    )
  }

  if (!vaga) {
    return (
      <div className="min-h-screen flex items-center justify-center ml-64">
        <p className="text-muted-foreground">Vaga não encontrada</p>
      </div>
    )
  }

  const requisitos = toSafeNumber(vaga.requisitos)
  const perfil = toSafeNumber(vaga.perfil)

  return (
    <div className="min-h-screen flex">
      <Sidebar activeTab="dashboard" onTabChange={() => router.push("/")} />
      <main className="flex-1 ml-64">
        <div className="container mx-auto px-8 py-6 max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push("/")} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

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
          </div>

          {/* 3 Cards Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CARD 1: Informações Gerais da Vaga */}
            <Card className="glass-card-intense">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Informações Gerais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Empresa
                  </p>
                  <p className="text-sm font-semibold text-foreground">{vaga.empresa}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Cargo
                  </p>
                  <p className="text-sm font-semibold text-foreground">{vaga.cargo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Local
                  </p>
                  <p className="text-sm text-foreground">{vaga.local}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Modalidade</p>
                  <Badge variant="outline" className="bg-muted border-border">
                    {vaga.modalidade}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Status</p>
                  <Badge variant={getStatusVariant(vaga.status)} className="text-sm">
                    {vaga.status}
                  </Badge>
                  {vaga.etapa && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Etapa: <span className="text-foreground font-medium">{vaga.etapa}</span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: Análise Gerada pela IA */}
            <Card className="glass-card-intense lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Análise da Vaga
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Fit Stars */}
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Fit Requisitos</p>
                    <div className="flex items-center gap-2">
                      <StarRating value={requisitos} readonly size="md" />
                      <span className="text-lg font-bold text-foreground">{requisitos.toFixed(1)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Fit Perfil</p>
                    <div className="flex items-center gap-2">
                      <StarRating value={perfil} readonly size="md" />
                      <span className="text-lg font-bold text-foreground">{perfil.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-foreground">Descrição Completa da Vaga</p>
                    {!isEditingMarkdown && vaga.observacoes && (
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingMarkdown(true)}>
                        <Edit2 className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    )}
                  </div>

                  {vaga.observacoes ? (
                    isEditingMarkdown ? (
                      <div className="space-y-3">
                        <MarkdownPreview
                          content={markdownContent}
                          editable={true}
                          onChange={setMarkdownContent}
                          className="min-h-[300px]"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveMarkdown}>
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setMarkdownContent(vaga.observacoes || "")
                              setIsEditingMarkdown(false)
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <MarkdownPreview content={markdownContent} className="max-h-[400px] overflow-y-auto" />
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground italic py-4">Nenhuma análise disponível para esta vaga.</p>
                  )}
                </div>

                {/* Responsabilidades */}
                {vaga.arquivo_analise_url && (
                  <div>
                    <Button variant="outline" size="sm" onClick={() => downloadPdf(vaga.arquivo_analise_url, "analise-vaga.md")}>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Análise Completa (.md)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* CARD 3: Currículo Personalizado (Full Width Below) */}
          <Card className="glass-card-intense mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Currículo Personalizado
                </CardTitle>
                <div className="flex gap-2">
                  <ResumeGeneratorDialog
                    vagaId={vaga.id}
                    trigger={
                      <Button size="sm" variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerar Currículo
                      </Button>
                    }
                    onSuccess={(filename) => {
                      toast.success(`Currículo gerado: ${filename}`)
                      loadVaga()
                    }}
                  />
                  {vaga.arquivo_cv_url && (
                    <Button
                      size="sm"
                      onClick={() => downloadPdf(vaga.arquivo_cv_url, `curriculo-${vaga.empresa}.pdf`)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar PDF
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {vaga.arquivo_cv_url ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                    <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">curriculo-{vaga.empresa}.pdf</p>
                      <p className="text-xs text-muted-foreground">Currículo personalizado para esta vaga</p>
                    </div>
                  </div>

                  <Tabs defaultValue="preview" className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                      <TabsTrigger value="info">Informações</TabsTrigger>
                    </TabsList>
                    <TabsContent value="preview" className="mt-4">
                      <div className="bg-muted/30 rounded-lg p-6 border border-border">
                        <p className="text-sm text-muted-foreground text-center">
                          Preview do PDF disponível após fazer download
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="info" className="mt-4">
                      <div className="space-y-2 text-sm">
                        <p className="text-foreground">
                          <span className="font-medium">Gerado para:</span> {vaga.empresa} - {vaga.cargo}
                        </p>
                        <p className="text-foreground">
                          <span className="font-medium">Fit Requisitos:</span> {requisitos.toFixed(1)}/5.0
                        </p>
                        <p className="text-foreground">
                          <span className="font-medium">Fit Perfil:</span> {perfil.toFixed(1)}/5.0
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-6">Nenhum currículo gerado ainda</p>
                  <ResumeGeneratorDialog
                    vagaId={vaga.id}
                    trigger={
                      <Button size="lg" className="bg-primary hover:bg-primary/90">
                        <FileText className="h-5 w-5 mr-2" />
                        Gerar Currículo Personalizado
                      </Button>
                    }
                    onSuccess={(filename) => {
                      toast.success(`Currículo gerado: ${filename}`)
                      loadVaga()
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <EditVagaDialog vaga={vaga} open={editDialogOpen} onOpenChange={setEditDialogOpen} onSuccess={loadVaga} />
        </div>
      </main>
    </div>
  )
}
