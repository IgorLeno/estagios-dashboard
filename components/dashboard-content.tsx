"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  LogOut,
  Search,
  Eye,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  Clock,
  FileText,
  LinkIcon,
  Download,
} from "lucide-react"
import type { Inscricao } from "@/lib/types"
import type { User } from "@supabase/supabase-js"

interface DashboardContentProps {
  user: User
  inscricoes: Inscricao[]
}

export function DashboardContent({ user, inscricoes: initialInscricoes }: DashboardContentProps) {
  const router = useRouter()
  const [inscricoes] = useState<Inscricao[]>(initialInscricoes)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedInscricao, setSelectedInscricao] = useState<Inscricao | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/admin/login")
    router.refresh()
  }

  const filteredInscricoes = inscricoes.filter((inscricao) => {
    const search = searchTerm.toLowerCase()
    return (
      inscricao.nome.toLowerCase().includes(search) ||
      inscricao.email.toLowerCase().includes(search) ||
      inscricao.curso.toLowerCase().includes(search)
    )
  })

  const handleViewDetails = (inscricao: Inscricao) => {
    setSelectedInscricao(inscricao)
    setIsDetailsOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">Bem-vindo, {user.email}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Inscrições</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inscricoes.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hoje</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    inscricoes.filter((i) => {
                      const today = new Date().toDateString()
                      return new Date(i.created_at).toDateString() === today
                    }).length
                  }
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    inscricoes.filter((i) => {
                      const weekAgo = new Date()
                      weekAgo.setDate(weekAgo.getDate() - 7)
                      return new Date(i.created_at) >= weekAgo
                    }).length
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Applications Table */}
          <Card>
            <CardHeader>
              <CardTitle>Inscrições Recebidas</CardTitle>
              <CardDescription>Lista completa de todas as candidaturas ao programa de estágio</CardDescription>
              <div className="flex items-center gap-2 pt-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, e-mail ou curso..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Curso</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInscricoes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhuma inscrição encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInscricoes.map((inscricao) => (
                        <TableRow key={inscricao.id}>
                          <TableCell className="font-medium">{inscricao.nome}</TableCell>
                          <TableCell>{inscricao.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{inscricao.curso}</Badge>
                          </TableCell>
                          <TableCell>{inscricao.periodo}º</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(inscricao.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(inscricao)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Ver Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Detalhes da Inscrição</DialogTitle>
            <DialogDescription>Informações completas do candidato</DialogDescription>
          </DialogHeader>

          {selectedInscricao && (
            <div className="space-y-6 pt-4">
              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Informações Pessoais
                </h3>
                <div className="grid gap-3 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Nome:</span>
                    <span className="col-span-2 font-medium">{selectedInscricao.nome}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> E-mail:
                    </span>
                    <span className="col-span-2">{selectedInscricao.email}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Telefone:
                    </span>
                    <span className="col-span-2">{selectedInscricao.telefone}</span>
                  </div>
                </div>
              </div>

              {/* Academic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Informações Acadêmicas</h3>
                <div className="grid gap-3 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Curso:</span>
                    <span className="col-span-2">
                      <Badge>{selectedInscricao.curso}</Badge>
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Período:</span>
                    <span className="col-span-2">{selectedInscricao.periodo}º Período</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Disponibilidade:</span>
                    <span className="col-span-2 capitalize">{selectedInscricao.disponibilidade}</span>
                  </div>
                </div>
              </div>

              {/* Professional Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Informações Profissionais</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">Conhecimentos:</span>
                    <p className="bg-muted p-3 rounded-md text-balance">{selectedInscricao.conhecimentos}</p>
                  </div>
                  {selectedInscricao.experiencia && (
                    <div>
                      <span className="text-muted-foreground block mb-1">Experiência:</span>
                      <p className="bg-muted p-3 rounded-md text-balance">{selectedInscricao.experiencia}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground block mb-1">Motivação:</span>
                    <p className="bg-muted p-3 rounded-md text-balance">{selectedInscricao.motivacao}</p>
                  </div>
                </div>
              </div>

              {selectedInscricao.arquivo_cv_url && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Currículo
                  </h3>
                  <Button asChild variant="outline" className="w-full bg-transparent">
                    <a href={selectedInscricao.arquivo_cv_url} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Currículo
                    </a>
                  </Button>
                </div>
              )}

              {/* Links */}
              {(selectedInscricao.linkedin || selectedInscricao.portfolio) && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    Links
                  </h3>
                  <div className="grid gap-2 text-sm">
                    {selectedInscricao.linkedin && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">LinkedIn:</span>
                        <a
                          href={selectedInscricao.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {selectedInscricao.linkedin}
                        </a>
                      </div>
                    )}
                    {selectedInscricao.portfolio && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Portfólio:</span>
                        <a
                          href={selectedInscricao.portfolio}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {selectedInscricao.portfolio}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Recebido em: {formatDate(selectedInscricao.created_at)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
