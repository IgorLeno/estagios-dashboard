"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Configuracao } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Clock, Check } from "lucide-react"

export function ConfiguracoesPage() {
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [horaInicio, setHoraInicio] = useState("")
  const [horaTermino, setHoraTermino] = useState("")
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      const { data, error } = await supabase.from("configuracoes").select("*").single()

      if (error) throw error

      if (data) {
        setConfig(data)
        setHoraInicio(data.hora_inicio.substring(0, 5))
        setHoraTermino(data.hora_termino.substring(0, 5))
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error)
    }
  }

  async function handleSave() {
    setLoading(true)
    setSaved(false)

    try {
      const { error } = await supabase
        .from("configuracoes")
        .update({
          hora_inicio: horaInicio + ":00",
          hora_termino: horaTermino + ":00",
          updated_at: new Date().toISOString(),
        })
        .eq("id", config?.id)

      if (error) throw error

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      loadConfig()
    } catch (error) {
      console.error("Erro ao salvar configurações:", error)
      alert("Erro ao salvar configurações")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <Card className="glass-card-intense">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[rgb(19_255_227_/_0.2)] border-2 border-[rgb(19_255_227)] flex items-center justify-center shadow-[0_0_15px_rgb(19_255_227_/_0.6)]">
              <Clock className="h-6 w-6 text-[rgb(19_255_227)]" />
            </div>
            <span className="text-foreground">Horário de Trabalho</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Configure seu horário de trabalho para melhor organização das candidaturas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="horaInicio" className="text-foreground">
                Hora de Início
              </Label>
              <Input
                id="horaInicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="bg-[rgb(20_40_70_/_0.5)] border-[rgb(19_255_227_/_0.3)] text-foreground focus:border-[rgb(19_255_227)] focus:shadow-[0_0_10px_rgb(19_255_227_/_0.3)]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horaTermino" className="text-foreground">
                Hora de Término
              </Label>
              <Input
                id="horaTermino"
                type="time"
                value={horaTermino}
                onChange={(e) => setHoraTermino(e.target.value)}
                className="bg-[rgb(20_40_70_/_0.5)] border-[rgb(19_255_227_/_0.3)] text-foreground focus:border-[rgb(19_255_227)] focus:shadow-[0_0_10px_rgb(19_255_227_/_0.3)]"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-[rgb(19_255_227_/_0.2)] border border-[rgb(19_255_227_/_0.6)] text-[rgb(19_255_227)] hover:bg-[rgb(19_255_227_/_0.3)] hover:shadow-[0_0_15px_rgb(19_255_227_/_0.5)] transition-all"
            >
              {loading ? "Salvando..." : saved ? "Salvo!" : "Salvar Configurações"}
              {saved && <Check className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
