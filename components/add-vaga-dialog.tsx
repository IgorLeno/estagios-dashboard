"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getDataInscricao } from "@/lib/date-utils"
import type { ParsedVagaData } from "@/lib/markdown-parser"
import type { Configuracao } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MarkdownUpload } from "@/components/markdown-upload"
import { FileUpload } from "@/components/file-upload"
import { toast } from "sonner"
import { normalizeRatingForSave } from "@/lib/utils"

interface AddVagaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddVagaDialog({ open, onOpenChange, onSuccess }: AddVagaDialogProps) {
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [formData, setFormData] = useState({
    empresa: "",
    cargo: "",
    local: "",
    modalidade: "Presencial" as "Presencial" | "Híbrido" | "Remoto",
    requisitos: "",
    fit: "",
    etapa: "",
    status: "Pendente" as "Pendente" | "Avançado" | "Melou" | "Contratado",
    observacoes: "",
    arquivo_analise_url: "",
    arquivo_cv_url: "",
  })

  const supabase = createClient()

  // Load config on mount
  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      const { data } = await supabase.from("configuracoes").select("*").single()
      if (data) setConfig(data)
    } catch (error) {
      console.error("Erro ao carregar configurações:", error)
    }
  }

  function handleParsedData(parsed: ParsedVagaData) {
    setFormData((prev) => ({
      ...prev,
      ...(parsed.empresa && { empresa: parsed.empresa }),
      ...(parsed.cargo && { cargo: parsed.cargo }),
      ...(parsed.local && { local: parsed.local }),
      ...(parsed.modalidade && { modalidade: parsed.modalidade }),
      ...(parsed.requisitos !== undefined && { requisitos: parsed.requisitos.toString() }),
      ...(parsed.fit !== undefined && { fit: parsed.fit.toString() }),
      ...(parsed.etapa && { etapa: parsed.etapa }),
      ...(parsed.status && { status: parsed.status }),
      ...(parsed.observacoes && { observacoes: parsed.observacoes }),
    }))
    toast.success("Campos preenchidos automaticamente a partir da análise!")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const dataInscricao = getDataInscricao(new Date(), config || undefined)
      if (process.env.NODE_ENV === "development") {
        console.log("[AddVagaDialog] Criando vaga com data_inscricao:", dataInscricao, "Config:", config)
      }

      const { error } = await supabase.from("vagas_estagio").insert({
        empresa: formData.empresa,
        cargo: formData.cargo,
        local: formData.local,
        modalidade: formData.modalidade,
        requisitos: normalizeRatingForSave(formData.requisitos),
        fit: normalizeRatingForSave(formData.fit),
        etapa: formData.etapa || null,
        status: formData.status,
        observacoes: formData.observacoes || null,
        arquivo_analise_url: formData.arquivo_analise_url || null,
        arquivo_cv_url: formData.arquivo_cv_url || null,
        data_inscricao: dataInscricao,
      })

      if (error) throw error

      toast.success("Vaga adicionada com sucesso!")
      setFormData({
        empresa: "",
        cargo: "",
        local: "",
        modalidade: "Presencial",
        requisitos: "",
        fit: "",
        etapa: "",
        status: "Pendente",
        observacoes: "",
        arquivo_analise_url: "",
        arquivo_cv_url: "",
      })
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error("Erro ao adicionar vaga:", error)
      toast.error("Erro ao adicionar vaga. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Vaga</DialogTitle>
          <DialogDescription>Preencha os dados da vaga de estágio</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa *</Label>
              <Input
                id="empresa"
                value={formData.empresa}
                onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo *</Label>
              <Input
                id="cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="local">Local *</Label>
              <Input
                id="local"
                value={formData.local}
                onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modalidade">Modalidade *</Label>
              <Select
                value={formData.modalidade}
                onValueChange={(value) =>
                  setFormData({ ...formData, modalidade: value as "Presencial" | "Híbrido" | "Remoto" })
                }
              >
                <SelectTrigger id="modalidade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Presencial">Presencial</SelectItem>
                  <SelectItem value="Híbrido">Híbrido</SelectItem>
                  <SelectItem value="Remoto">Remoto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/*
              Campo Fit Requisitos
              - Valor válido: 0 a 5, em incrementos de 0.5
              - Valores percentuais (0-100) NÃO são mais aceitos diretamente
              - Se dados antigos/externos chegarem fora do range, a função normalizeRatingForSave()
                realiza conversão automática de 0-100 → 0-5
              - Exemplo: 85 (percentual) → 4.5 (normalizado)
            */}
            <div className="space-y-2">
              <Label htmlFor="requisitos">Fit Requisitos (⭐)</Label>
              <Input
                id="requisitos"
                type="number"
                min="0"
                max="5"
                step="0.5"
                value={formData.requisitos}
                onChange={(e) => setFormData({ ...formData, requisitos: e.target.value })}
                placeholder="0.0 - 5.0"
              />
            </div>

            {/*
              Campo Fit Perfil
              - Valor válido: 0 a 5, em incrementos de 0.5
              - Valores percentuais (0-100) ou escala 0-10 NÃO são mais aceitos diretamente
              - Se dados antigos/externos chegarem fora do range, a função normalizeRatingForSave()
                realiza conversão automática para escala 0-5
              - Exemplo: 8 (escala 0-10) → 4.0 (normalizado)
            */}
            <div className="space-y-2">
              <Label htmlFor="fit">Fit Perfil (⭐)</Label>
              <Input
                id="fit"
                type="number"
                min="0"
                max="5"
                step="0.5"
                value={formData.fit}
                onChange={(e) => setFormData({ ...formData, fit: e.target.value })}
                placeholder="0.0 - 5.0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="etapa">Etapa</Label>
              <Input
                id="etapa"
                value={formData.etapa}
                onChange={(e) => setFormData({ ...formData, etapa: e.target.value })}
                placeholder="Ex: Inscrição"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value as "Pendente" | "Avançado" | "Melou" | "Contratado" })
              }
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Avançado">Avançado</SelectItem>
                <SelectItem value="Melou">Melou</SelectItem>
                <SelectItem value="Contratado">Contratado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="border-t pt-4 space-y-4">
            <h3 className="font-medium text-sm">Arquivos</h3>

            <MarkdownUpload
              onUploadComplete={(url, parsedData) => {
                setFormData({ ...formData, arquivo_analise_url: url })
                if (parsedData) handleParsedData(parsedData)
              }}
              onParseComplete={handleParsedData}
              currentFile={formData.arquivo_analise_url}
              label="Análise da Vaga (.md)"
              autoFillFields={true}
            />

            <FileUpload
              onUploadComplete={(url) => setFormData({ ...formData, arquivo_cv_url: url })}
              currentFile={formData.arquivo_cv_url}
              label="Currículo (PDF/DOCX)"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
