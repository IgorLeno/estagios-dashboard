"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"
import { useMemo } from "react"
import { buildDossieFromProfile } from "@/lib/ai/dossie-builder"
import type { CandidateProfile } from "@/lib/types"

type ProfileData = Omit<CandidateProfile, "id" | "user_id" | "created_at" | "updated_at">

interface DossieInfoTabProps {
  profile?: ProfileData
}

export function DossieInfoTab({ profile }: DossieInfoTabProps) {
  const dossiePreview = useMemo(() => {
    if (!profile) return ""

    const fakeProfile = {
      id: "preview",
      created_at: "",
      updated_at: "",
      ...profile,
    } as CandidateProfile
    return buildDossieFromProfile(fakeProfile)
  }, [profile])

  return (
    <div className="space-y-4">
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <Info className="h-4 w-4 text-blue-500" />
        <AlertTitle>Dossie gerado automaticamente</AlertTitle>
        <AlertDescription className="text-xs">
          O dossie do candidato agora e gerado automaticamente a partir das abas Perfil, Habilidades,
          Projetos e Certificacoes. Nao e mais necessario editar o dossie manualmente.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Pre-visualizacao do Dossie</h3>
        <p className="text-xs text-muted-foreground">
          Este texto e enviado ao modelo de IA durante a analise de vagas.
        </p>
        {profile ? (
          <pre className="whitespace-pre-wrap rounded-lg border bg-muted/50 p-4 text-xs font-mono leading-relaxed">
            {dossiePreview}
          </pre>
        ) : (
          <div className="rounded-lg border bg-muted/50 p-4 text-xs text-muted-foreground">
            O dossie e gerado a partir dos dados da pagina de Perfil. Acesse Perfil para revisar o conteudo-fonte.
          </div>
        )}
      </div>
    </div>
  )
}
