"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTheme } from "next-themes"
import { Palette } from "lucide-react"
import { ConfiguracoesPrompts } from "@/components/configuracoes-prompts"

export function ConfiguracoesPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="max-w-4xl space-y-6">
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="prompts">Prompts de IA</TabsTrigger>
        </TabsList>

        {/* Tab: Geral */}
        <TabsContent value="geral" className="space-y-6 mt-6">
          {/* Theme Settings Card */}
          <Card className="glass-card-intense hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Palette className="h-6 w-6 text-primary" />
                </div>
                <span className="text-foreground">Aparência</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Personalize a aparência do dashboard
              </CardDescription>
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
        </TabsContent>

        {/* Tab: Prompts de IA */}
        <TabsContent value="prompts" className="mt-6">
          <ConfiguracoesPrompts />
        </TabsContent>
      </Tabs>
    </div>
  )
}
