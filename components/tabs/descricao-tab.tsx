"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Sparkles } from "lucide-react"

interface DescricaoTabProps {
  description: string
  setDescription: (value: string) => void
  analyzing: boolean
  onFillJobData: () => Promise<void>
}

const MIN_CHARS = 50
const MAX_CHARS = 50000

export function DescricaoTab({ description, setDescription, analyzing, onFillJobData }: DescricaoTabProps) {
  const charCount = description.length
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="descricao">Descrição da Vaga</Label>
          <span
            className={`text-xs ${
              charCount < MIN_CHARS
                ? "text-muted-foreground"
                : charCount > MAX_CHARS
                  ? "text-destructive"
                  : "text-green-600"
            }`}
          >
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} caracteres
            {charCount < MIN_CHARS && ` (mín. ${MIN_CHARS})`}
          </span>
        </div>

        <Textarea
          id="descricao"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Cole a descrição completa da vaga aqui (mínimo 50 caracteres)..."
          rows={14}
          className="font-mono text-sm resize-none"
          disabled={analyzing}
        />

        <p className="text-xs text-muted-foreground">
          Cole a descrição da vaga do LinkedIn, Indeed, e-mail ou site da empresa. A IA vai extrair empresa, cargo,
          local, requisitos e muito mais.
        </p>
      </div>

      <Button onClick={onFillJobData} disabled={!isValid || analyzing} className="w-full" size="lg">
        {analyzing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Preenchendo Dados...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Preencher Dados
          </>
        )}
      </Button>
    </div>
  )
}
