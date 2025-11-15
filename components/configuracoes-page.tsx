"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "next-themes"
import { Clock, Calendar, Palette } from "lucide-react"

export function ConfiguracoesPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="max-w-2xl space-y-6">
      {/* Theme Settings Card */}
      <Card className="glass-card-intense hover-lift">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Palette className="h-6 w-6 text-primary" />
            </div>
            <span className="text-foreground">Aparência</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">Personalize a aparência do dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
            <div>
              <h3 className="font-semibold text-foreground mb-1">Tema</h3>
              <p className="text-sm text-muted-foreground">Escolha entre tema claro, escuro ou automático</p>
            </div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-[140px] bg-background border-border">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Escuro</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Date System Info Card */}
      <Card className="glass-card-intense hover-lift">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <span className="text-foreground">Sistema de Datas</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Informações sobre o funcionamento do rastreamento de candidaturas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Início do Dia</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  O sistema utiliza o calendário padrão onde cada dia começa à <strong>meia-noite (00:00)</strong> e
                  termina às <strong>23:59</strong>. Todas as candidaturas são registradas com a data do calendário em
                  que foram criadas.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Rastreamento Automático</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                As candidaturas são automaticamente organizadas por data de inscrição, permitindo visualizar seu
                progresso diário e histórico de forma clara e consistente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
