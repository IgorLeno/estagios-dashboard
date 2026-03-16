"use client"

import { useState } from "react"
import { Check, ChevronDown, ChevronRight, Code2, Copy, Eye } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { SystemPromptEntry } from "@/lib/ai/system-prompts-registry"

interface SystemPromptsViewerProps {
  prompts: SystemPromptEntry[]
}

const CATEGORY_LABELS: Record<SystemPromptEntry["category"], string> = {
  resume: "Currículo",
  analysis: "Análise",
  skills: "Skills",
  parsing: "Parsing",
}

const CATEGORY_COLORS: Record<SystemPromptEntry["category"], string> = {
  resume: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100",
  analysis: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
  skills: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  parsing: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
}

function SystemPromptCard({ entry }: { entry: SystemPromptEntry }) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(entry.content)
      setCopied(true)
      toast.success("Prompt copiado!")
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Não foi possível copiar o prompt")
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-border/70">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-4 transition-colors hover:bg-muted/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {open ? (
                  <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-sm font-medium">{entry.title}</CardTitle>
                    <Badge variant="secondary" className={`text-xs ${CATEGORY_COLORS[entry.category]}`}>
                      {CATEGORY_LABELS[entry.category]}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1 text-xs">{entry.description}</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0 pb-4">
            <div className="flex items-center gap-2">
              <Code2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{entry.sourceFile}</span>
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleCopy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>

            <textarea
              readOnly
              value={entry.content}
              className="h-48 w-full resize-y rounded-md border bg-muted/40 p-3 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

export function SystemPromptsViewer({ prompts }: SystemPromptsViewerProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <p className="text-xs text-amber-900 dark:text-amber-100">
          Estes prompts são <strong>somente leitura</strong> e controlam o comportamento interno do sistema de IA.
          Para alterá-los, edite os arquivos em <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">lib/ai/</code>{" "}
          no código-fonte.
        </p>
      </div>

      <div className="space-y-2">
        {prompts.map((entry) => (
          <SystemPromptCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}
