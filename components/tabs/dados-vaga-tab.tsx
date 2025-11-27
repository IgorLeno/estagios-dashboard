"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { RotateCcw, ChevronRight } from "lucide-react"
import type { FormData } from "@/lib/utils/ai-mapper"
import type { JobDetails } from "@/lib/ai/types"

interface DadosVagaTabProps {
  formData: FormData
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void
  jobAnalysisData: JobDetails | null
  onRefreshAnalysis: () => Promise<void>
  refreshing: boolean
  onNextTab: () => void
}

export function DadosVagaTab({
  formData,
  setFormData,
  jobAnalysisData,
  onRefreshAnalysis,
  refreshing,
  onNextTab,
}: DadosVagaTabProps) {
  return (
    <div className="space-y-4">
      {/* Form fields section */}
      <div className="border-b pb-4 mb-4">
        <h3 className="font-semibold mb-3 text-sm text-slate-700">Campos da Vaga</h3>

        <div className="space-y-4">
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
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                placeholder="Indefinido (se não preenchido)"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="local">Local</Label>
              <Input
                id="local"
                value={formData.local}
                onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                placeholder="Indefinido (se não preenchido)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modalidade">Modalidade</Label>
              <Select
                value={formData.modalidade}
                onValueChange={(value) =>
                  setFormData({ ...formData, modalidade: value as "Presencial" | "Híbrido" | "Remoto" })
                }
              >
                <SelectTrigger id="modalidade">
                  <SelectValue placeholder="Presencial (padrão)" />
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
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value as "Pendente" | "Avançado" | "Melou" | "Contratado" })
              }
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Pendente (padrão)" />
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
        </div>
      </div>

      {/* Job analysis preview section */}
      {jobAnalysisData && (
        <div className="border-b pb-4 mb-4">
          <h3 className="font-semibold mb-3 text-sm text-slate-700">Análise da Vaga</h3>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-slate-600">Empresa:</span>
                <p className="text-slate-900">{jobAnalysisData.empresa}</p>
              </div>
              <div>
                <span className="font-medium text-slate-600">Cargo:</span>
                <p className="text-slate-900">{jobAnalysisData.cargo}</p>
              </div>
              <div>
                <span className="font-medium text-slate-600">Local:</span>
                <p className="text-slate-900">{jobAnalysisData.local}</p>
              </div>
              <div>
                <span className="font-medium text-slate-600">Modalidade:</span>
                <p className="text-slate-900">{jobAnalysisData.modalidade}</p>
              </div>
            </div>
            {jobAnalysisData.requisitos_obrigatorios && jobAnalysisData.requisitos_obrigatorios.length > 0 && (
              <div>
                <span className="font-medium text-slate-600 text-sm">Requisitos Obrigatórios:</span>
                <ul className="list-disc list-inside text-sm text-slate-700 mt-1 space-y-1">
                  {jobAnalysisData.requisitos_obrigatorios.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
            {jobAnalysisData.responsabilidades && jobAnalysisData.responsabilidades.length > 0 && (
              <div>
                <span className="font-medium text-slate-600 text-sm">Responsabilidades:</span>
                <ul className="list-disc list-inside text-sm text-slate-700 mt-1 space-y-1">
                  {jobAnalysisData.responsabilidades.slice(0, 5).map((resp, idx) => (
                    <li key={idx}>{resp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Refazer análise button */}
      {jobAnalysisData && (
        <Button onClick={onRefreshAnalysis} variant="outline" className="w-full" disabled={refreshing}>
          {refreshing ? (
            <>
              <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
              Refazendo Análise...
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 h-4 w-4" />
              Refazer Análise
            </>
          )}
        </Button>
      )}

      {/* Footer with navigation button */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onNextTab}>
          Próximo
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
