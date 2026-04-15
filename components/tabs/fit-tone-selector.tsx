"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { FitToneOptions } from "@/lib/ai/types"

interface FitToneSelectorProps {
  value: FitToneOptions
  onChange: (opts: FitToneOptions) => void
}

interface ToneButtonProps {
  label: string
  selected: boolean
  onClick: () => void
}

function ToneButton({ label, selected, onClick }: ToneButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      {label}
    </button>
  )
}

interface GroupProps {
  label: string
  children: React.ReactNode
}

function Group({ label, children }: GroupProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

export function FitToneSelector({ value, onChange }: FitToneSelectorProps) {
  const [estiloInputOpen, setEstiloInputOpen] = useState(value.estilo === "personalizado_estilo")
  const [focoInputOpen, setFocoInputOpen] = useState(value.foco === "personalizado_foco")
  const [enfaseInputOpen, setEnfaseInputOpen] = useState(value.enfase === "personalizado_enfase")

  function set<K extends keyof FitToneOptions>(key: K, val: FitToneOptions[K]) {
    onChange({ ...value, [key]: val })
  }

  return (
    <div className="space-y-4">
      {/* Group 1: Estilo de Escrita */}
      <Group label="Estilo de Escrita">
        {(["padrao", "tecnico_formal", "executivo", "conversacional"] as const).map((v) => (
          <ToneButton
            key={v}
            label={
              v === "padrao"
                ? "Padrão"
                : v === "tecnico_formal"
                  ? "Técnico-Formal"
                  : v === "executivo"
                    ? "Executivo"
                    : "Conversacional"
            }
            selected={value.estilo === v}
            onClick={() => {
              set("estilo", v)
              setEstiloInputOpen(false)
            }}
          />
        ))}
        <ToneButton
          label="Personalizado..."
          selected={value.estilo === "personalizado_estilo"}
          onClick={() => {
            set("estilo", "personalizado_estilo")
            setEstiloInputOpen(true)
          }}
        />
        {estiloInputOpen && (
          <Input
            value={value.estilo_customizado ?? ""}
            onChange={(e) => set("estilo_customizado", e.target.value)}
            placeholder="Ex.: Use tom inspirador com foco em potencial de crescimento"
            className="mt-1 text-xs"
            autoFocus
          />
        )}
      </Group>

      {/* Group 2: Foco de Conteúdo */}
      <Group label="Foco de Conteúdo">
        {(["padrao", "keywords", "resultados", "competencias"] as const).map((v) => (
          <ToneButton
            key={v}
            label={
              v === "padrao"
                ? "Padrão"
                : v === "keywords"
                  ? "Máximo de Keywords"
                  : v === "resultados"
                    ? "Resultados e Métricas"
                    : "Competências Técnicas"
            }
            selected={value.foco === v}
            onClick={() => {
              set("foco", v)
              setFocoInputOpen(false)
            }}
          />
        ))}
        <ToneButton
          label="Personalizado..."
          selected={value.foco === "personalizado_foco"}
          onClick={() => {
            set("foco", "personalizado_foco")
            setFocoInputOpen(true)
          }}
        />
        {focoInputOpen && (
          <Input
            value={value.foco_customizado ?? ""}
            onChange={(e) => set("foco_customizado", e.target.value)}
            placeholder="Ex.: Priorize menções a metodologias ágeis e gestão de projetos"
            className="mt-1 text-xs"
            autoFocus
          />
        )}
      </Group>

      {/* Group 3: Ênfase de Carreira */}
      <Group label="Ênfase de Carreira">
        {(["padrao", "academica", "pratica", "lideranca"] as const).map((v) => (
          <ToneButton
            key={v}
            label={
              v === "padrao"
                ? "Padrão"
                : v === "academica"
                  ? "Base Acadêmica"
                  : v === "pratica"
                    ? "Experiência Prática"
                    : "Potencial de Liderança"
            }
            selected={value.enfase === v}
            onClick={() => {
              set("enfase", v)
              setEnfaseInputOpen(false)
            }}
          />
        ))}
        <ToneButton
          label="Personalizado..."
          selected={value.enfase === "personalizado_enfase"}
          onClick={() => {
            set("enfase", "personalizado_enfase")
            setEnfaseInputOpen(true)
          }}
        />
        {enfaseInputOpen && (
          <Input
            value={value.enfase_customizado ?? ""}
            onChange={(e) => set("enfase_customizado", e.target.value)}
            placeholder="Ex.: Destaque projetos de pesquisa e publicações acadêmicas"
            className="mt-1 text-xs"
            autoFocus
          />
        )}
      </Group>
    </div>
  )
}
