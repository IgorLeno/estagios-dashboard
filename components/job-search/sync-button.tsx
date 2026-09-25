"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { syncJobSearch } from "@/app/actions/job-search"
import { Button } from "@/components/ui/button"

export function SyncButton() {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      data-testid="sync-button"
      onClick={() =>
        startTransition(async () => {
          try {
            await syncJobSearch()
            router.refresh()
            toast.success("Dados relidos da fonte.")
          } catch {
            toast.error("Não foi possível sincronizar. Tente novamente.")
          }
        })
      }
    >
      <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
      {pending ? "Sincronizando…" : "Sincronizar"}
    </Button>
  )
}
