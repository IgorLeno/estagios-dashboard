"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import type { FormData } from "@/lib/utils/ai-mapper"

interface ManualEntryTabProps {
  formData: FormData
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void
  onSubmit: (e: React.FormEvent) => Promise<void>
  loading: boolean
}

export function ManualEntryTab({ formData, setFormData, onSubmit, loading }: ManualEntryTabProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
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

        <div className="space-y-2">
          <Label htmlFor="perfil">Fit Perfil (⭐)</Label>
          <Input
            id="perfil"
            type="number"
            min="0"
            max="5"
            step="0.5"
            value={formData.perfil}
            onChange={(e) => setFormData({ ...formData, perfil: e.target.value })}
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
        <Label htmlFor="observacoes">Análise</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes}
          onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
          placeholder="Insights sobre a vaga, fit técnico e cultural, preparação para entrevista..."
          rows={8}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Vaga"}
        </Button>
      </div>
    </form>
  )
}
