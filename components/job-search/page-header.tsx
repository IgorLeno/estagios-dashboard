import type React from "react"
import { Database } from "lucide-react"
import { formatTimestamp } from "@/lib/job-search/present"
import type { JobSearchData } from "@/lib/job-search/types"
import { SyncButton } from "@/components/job-search/sync-button"

const SOURCE_LABEL: Record<JobSearchData["source"], string> = {
  fixture: "Fixture local (dados fictícios)",
  sheets: "Google Sheet do job-search",
}

export function PageHeader({
  title,
  description,
  data,
  children,
}: {
  title: string
  description?: string
  data?: Pick<JobSearchData, "source" | "fetchedAt">
  children?: React.ReactNode
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        {data && (
          <p
            className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
            data-testid="data-source"
          >
            <Database className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{SOURCE_LABEL[data.source]}</span>
            <span aria-hidden="true">·</span>
            <span>lido em {formatTimestamp(data.fetchedAt)}</span>
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {data && <SyncButton />}
      </div>
    </header>
  )
}
