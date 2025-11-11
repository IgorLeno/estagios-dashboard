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
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Horário de Trabalho</CardTitle>
          </div>
          <CardDescription>Configure seu horário de trabalho para melhor organização das candidaturas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="horaInicio">Hora de Início</Label>
              <Input id="horaInicio" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horaTermino">Hora de Término</Label>
              <Input
                id="horaTermino"
                type="time"
                value={horaTermino}
                onChange={(e) => setHoraTermino(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading ? "Salvando..." : saved ? "Salvo!" : "Salvar Configurações"}
              {saved && <Check className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
