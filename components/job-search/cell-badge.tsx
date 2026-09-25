import { labelFor } from "@/lib/job-search/enums"
import { ANALYSIS_META, type CellDisplay } from "@/lib/job-search/present"
import type { AnalysisLevel } from "@/lib/job-search/types"
import { ToneBadge } from "@/components/job-search/tone-badge"

/** Badge for one Sheet enum cell. An out-of-domain value shows its raw text flagged as invalid. */
export function CellBadge({
  cell,
  empty = "—",
  testId,
  className,
}: {
  cell: CellDisplay
  empty?: string
  testId?: string
  className?: string
}) {
  if (cell.value === null) {
    return (
      <ToneBadge tone="muted" data-testid={testId} className={className}>
        {empty}
      </ToneBadge>
    )
  }
  if (cell.invalid) {
    return (
      <ToneBadge tone="warning" title="Valor fora do domínio do job-search" data-testid={testId} className={className}>
        Inválido: {cell.value}
      </ToneBadge>
    )
  }
  return (
    <ToneBadge tone={cell.tone} data-testid={testId} className={className}>
      {labelFor(cell.value)}
    </ToneBadge>
  )
}

export function AnalysisBadge({
  level,
  testId,
  className,
}: {
  level: AnalysisLevel
  testId?: string
  className?: string
}) {
  const meta = ANALYSIS_META[level]
  return (
    <ToneBadge tone={meta.tone} title={meta.description} data-testid={testId} className={className}>
      {meta.label}
    </ToneBadge>
  )
}
