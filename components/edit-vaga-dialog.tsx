"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { VagaEstagio } from "@/lib/types"
import type { ParsedVagaData } from "@/lib/markdown-parser"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MarkdownUpload } from "@/components/markdown-upload"
import { FileUpload } from "@/components/file-upload"
import { toast } from "sonner"

interface EditVagaDialogProps {
  vaga: VagaEstagio
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditVagaDialog({ vaga, open, onOpenChange, onSuccess }: EditVagaDialogProps) {
  const [loading, setLoading] = useState(false)
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

  useEffect(() => {
    if (vaga) {
      setFormData({
        empresa: vaga.empresa,
        cargo: vaga.cargo,
        local: vaga.local,
        modalidade: vaga.modalidade,
        requisitos: vaga.requisitos?.toString() || "",
        fit: vaga.fit?.toString() || "",
        etapa: vaga.etapa || "",
        status: vaga.status,
        observacoes: vaga.observacoes || "",
        arquivo_analise_url: vaga.arquivo_analise_url || "",
        arquivo_cv_url: vaga.arquivo_cv_url || "",
      })
    }
  }, [vaga])

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
    toast.success("Campos atualizados a partir da análise!")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from("vagas_estagio")
        .update({
          empresa: formData.empresa,
          cargo: formData.cargo,
          local: formData.local,
          modalidade: formData.modalidade,
          requisitos: formData.requisitos ? Number.parseInt(formData.requisitos) : null,
          fit: formData.fit ? Number.parseInt(formData.fit) : null,
          etapa: formData.etapa || null,
          status: formData.status,
          observacoes: formData.observacoes || null,
          arquivo_analise_url: formData.arquivo_analise_url || null,
          arquivo_cv_url: formData.arquivo_cv_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", vaga.id)

      if (error) throw error

      toast.success("Vaga atualizada com sucesso!")
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error("Erro ao atualizar vaga:", error)
      toast.error("Erro ao atualizar vaga. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Vaga</DialogTitle>
          <DialogDescription>Atualize as informações da vaga de estágio</DialogDescription>
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
                onValueChange={(value) => setFormData({ ...formData, modalidade: value })}
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
            <div className="space-y-2">
              <Label htmlFor="requisitos">Requisitos (Score)</Label>
              <Input
                id="requisitos"
                type="number"
                min="0"
                max="100"
                value={formData.requisitos}
                onChange={(e) => setFormData({ ...formData, requisitos: e.target.value })}
                placeholder="0-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fit">Fit</Label>
              <Input
                id="fit"
                type="number"
                min="0"
                max="10"
                value={formData.fit}
                onChange={(e) => setFormData({ ...formData, fit: e.target.value })}
                placeholder="0-10"
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
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
