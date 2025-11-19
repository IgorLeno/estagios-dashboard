"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getDataInscricao } from "@/lib/date-utils"
import type { Configuracao } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AiParserTab } from "@/components/tabs/ai-parser-tab"
import { ManualEntryTab } from "@/components/tabs/manual-entry-tab"
import { MarkdownUploadTab } from "@/components/tabs/markdown-upload-tab"
import { toast } from "sonner"
import { normalizeRatingForSave } from "@/lib/utils"
import type { FormData } from "@/lib/utils/ai-mapper"

interface AddVagaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddVagaDialog({ open, onOpenChange, onSuccess }: AddVagaDialogProps) {
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [activeTab, setActiveTab] = useState("ai-parser")
  const [formData, setFormData] = useState<FormData>({
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

      toast.success("Job added successfully!")
      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error("Error adding job:", error)
      toast.error("Failed to add job. Try again.")
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
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
    setActiveTab("ai-parser")
  }

  function handleTabComplete() {
    setActiveTab("manual")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Job</DialogTitle>
          <DialogDescription>
            Use AI parsing, manual entry, or upload markdown file
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai-parser">AI Parser</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="upload">Upload .md</TabsTrigger>
          </TabsList>

          <TabsContent value="ai-parser" className="mt-4">
            <AiParserTab
              formData={formData}
              setFormData={setFormData}
              onComplete={handleTabComplete}
            />
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <ManualEntryTab
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <MarkdownUploadTab
              formData={formData}
              setFormData={setFormData}
              onComplete={handleTabComplete}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
