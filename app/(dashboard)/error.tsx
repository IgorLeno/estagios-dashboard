"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

// Source failures (Sheet unreachable, credentials, session) land here instead of a blank page.
// Server error details are not shown: production only exposes a digest.
export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="glass-card mx-auto mt-12 max-w-lg rounded-xl p-6 text-center" role="alert">
      <AlertTriangle className="mx-auto h-8 w-8 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <h1 className="mt-3 text-lg font-semibold text-foreground">Não foi possível ler os dados do job-search</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A fonte pode estar indisponível ou a sessão pode ter expirado. Nada foi alterado.
      </p>
      <Button className="mt-4" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  )
}
