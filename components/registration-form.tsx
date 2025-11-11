"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileUpload } from "@/components/file-upload"

interface FormData {
  nome: string
  email: string
  telefone: string
  curso: string
  periodo: string
  disponibilidade: string
  conhecimentos: string
  experiencia: string
  motivacao: string
  linkedin: string
  portfolio: string
  arquivo_cv_url: string
}

export function RegistrationForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    nome: "",
    email: "",
    telefone: "",
    curso: "",
    periodo: "",
    disponibilidade: "",
    conhecimentos: "",
    experiencia: "",
    motivacao: "",
    linkedin: "",
    portfolio: "",
    arquivo_cv_url: "",
  })

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: insertError } = await supabase.from("inscricoes").insert([formData])

      if (insertError) throw insertError

      setSuccess(true)

      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          nome: "",
          email: "",
          telefone: "",
          curso: "",
          periodo: "",
          disponibilidade: "",
          conhecimentos: "",
          experiencia: "",
          motivacao: "",
          linkedin: "",
          portfolio: "",
          arquivo_cv_url: "",
        })
        setSuccess(false)
      }, 3000)
    } catch (err) {
      console.error("[v0] Error submitting form:", err)
      setError(err instanceof Error ? err.message : "Erro ao enviar inscrição")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="pt-12 pb-12">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2 text-foreground">Inscrição Enviada!</h3>
            <p className="text-muted-foreground">Obrigado por se inscrever. Entraremos em contato em breve.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Formulário de Inscrição</CardTitle>
        <CardDescription>Campos marcados com * são obrigatórios</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Informações Pessoais</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  required
                  value={formData.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                type="tel"
                required
                value={formData.telefone}
                onChange={(e) => handleChange("telefone", e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          {/* Academic Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Informações Acadêmicas</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="curso">Curso *</Label>
                <Select required value={formData.curso} onValueChange={(value) => handleChange("curso", value)}>
                  <SelectTrigger id="curso">
                    <SelectValue placeholder="Selecione seu curso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engenharia-quimica">Engenharia Química</SelectItem>
                    <SelectItem value="quimica">Química</SelectItem>
                    <SelectItem value="quimica-industrial">Química Industrial</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="periodo">Período *</Label>
                <Select required value={formData.periodo} onValueChange={(value) => handleChange("periodo", value)}>
                  <SelectTrigger id="periodo">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1º Período</SelectItem>
                    <SelectItem value="2">2º Período</SelectItem>
                    <SelectItem value="3">3º Período</SelectItem>
                    <SelectItem value="4">4º Período</SelectItem>
                    <SelectItem value="5">5º Período</SelectItem>
                    <SelectItem value="6">6º Período</SelectItem>
                    <SelectItem value="7">7º Período</SelectItem>
                    <SelectItem value="8">8º Período</SelectItem>
                    <SelectItem value="9">9º Período</SelectItem>
                    <SelectItem value="10">10º Período</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="disponibilidade">Disponibilidade *</Label>
              <Select
                required
                value={formData.disponibilidade}
                onValueChange={(value) => handleChange("disponibilidade", value)}
              >
                <SelectTrigger id="disponibilidade">
                  <SelectValue placeholder="Selecione sua disponibilidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha">Manhã</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                  <SelectItem value="integral">Integral</SelectItem>
                  <SelectItem value="flexivel">Flexível</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Professional Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Informações Profissionais</h3>

            <div className="space-y-2">
              <Label htmlFor="conhecimentos">Conhecimentos e Habilidades *</Label>
              <Textarea
                id="conhecimentos"
                required
                value={formData.conhecimentos}
                onChange={(e) => handleChange("conhecimentos", e.target.value)}
                placeholder="Descreva suas principais habilidades técnicas e conhecimentos relevantes"
                className="min-h-24 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experiencia">Experiência Prévia</Label>
              <Textarea
                id="experiencia"
                value={formData.experiencia}
                onChange={(e) => handleChange("experiencia", e.target.value)}
                placeholder="Descreva experiências profissionais ou acadêmicas relevantes (opcional)"
                className="min-h-24 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivacao">Por que você quer esse estágio? *</Label>
              <Textarea
                id="motivacao"
                required
                value={formData.motivacao}
                onChange={(e) => handleChange("motivacao", e.target.value)}
                placeholder="Conte-nos o que te motiva a fazer parte da nossa equipe"
                className="min-h-32 resize-none"
              />
            </div>

            <FileUpload
              onUploadComplete={(url) => handleChange("arquivo_cv_url", url)}
              currentFile={formData.arquivo_cv_url}
            />
          </div>

          {/* Links Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Links (Opcional)</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) => handleChange("linkedin", e.target.value)}
                  placeholder="https://linkedin.com/in/seu-perfil"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="portfolio">Portfólio / GitHub</Label>
                <Input
                  id="portfolio"
                  type="url"
                  value={formData.portfolio}
                  onChange={(e) => handleChange("portfolio", e.target.value)}
                  placeholder="https://seu-portfolio.com"
                />
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isLoading} className="w-full md:w-auto" size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Inscrição"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
