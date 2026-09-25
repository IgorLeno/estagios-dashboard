"use client"

import { useParams, useRouter } from "next/navigation"
import type { VagaEstagio } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Star, User, MapPin, Building2 } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { StarRating } from "@/components/ui/star-rating"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toSafeNumber, getStatusBadgeClasses } from "@/lib/utils"

// Read-only shell: the job-search data layer (WP3) replaces this empty source.
const VAGAS: VagaEstagio[] = []

export default function VagaDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const vaga = VAGAS.find((item) => item.id === params.id) ?? null

  return (
    <div className="min-h-screen flex">
      <Sidebar activeTab="vagas" />
      <main className="flex-1 ml-64">
        <div className="container mx-auto px-8 py-6 max-w-7xl">
          <Button variant="ghost" onClick={() => router.push("/")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          {vaga ? (
            <VagaDetail vaga={vaga} />
          ) : (
            <p className="text-muted-foreground py-12 text-center">Vaga não encontrada</p>
          )}
        </div>
      </main>
    </div>
  )
}

function VagaDetail({ vaga }: { vaga: VagaEstagio }) {
  const requisitos = toSafeNumber(vaga.requisitos)
  const perfil = toSafeNumber(vaga.perfil)

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">{vaga.empresa}</h1>
        <p className="text-lg text-muted-foreground mb-1">{vaga.cargo}</p>
        <p className="text-sm text-muted-foreground">
          Inscrição realizada em {format(new Date(vaga.data_inscricao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* CARD 1: Informações Gerais + Fit Scores */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Informações da Vaga
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground mb-4">Informações Gerais</h3>
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
                <Badge className={`${getStatusBadgeClasses(vaga.status)} text-sm font-semibold border`}>
                  {vaga.status}
                </Badge>
                {vaga.etapa && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Etapa: <span className="text-foreground font-medium">{vaga.etapa}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-base font-semibold text-foreground mb-4">Fit</h3>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Requisitos</p>
                <div className="flex items-center gap-3">
                  <StarRating value={requisitos} readonly size="md" />
                  <span className="text-2xl font-bold text-foreground">{requisitos.toFixed(1)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Perfil</p>
                <div className="flex items-center gap-3">
                  <StarRating value={perfil} readonly size="md" />
                  <span className="text-2xl font-bold text-foreground">{perfil.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: Análise da Vaga */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Análise da Vaga
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vaga.observacoes ? (
            // Plain text on purpose: source text is untrusted and must not be rendered as HTML.
            <p className="max-h-[500px] overflow-y-auto whitespace-pre-wrap break-words text-sm text-foreground">
              {vaga.observacoes}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic py-4">Nenhuma análise disponível para esta vaga.</p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
