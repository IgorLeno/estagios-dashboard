import type React from "react"
import { AlertOctagon, AlertTriangle } from "lucide-react"
import type { Tone } from "@/lib/job-search/present"
import { cn } from "@/lib/utils"

export const TONE_CLASSES: Record<Tone, string> = {
  good: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  warning: "bg-amber-500/10 text-amber-800 border-amber-500/40 dark:text-amber-300",
  critical: "bg-red-500/10 text-red-700 border-red-500/40 dark:text-red-300",
  info: "bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-300",
  neutral: "bg-secondary text-secondary-foreground border-border",
  muted: "bg-muted/60 text-muted-foreground border-border",
}

/** Status pill: the text always carries the meaning; warning/critical add an icon, never color alone. */
export function ToneBadge({
  tone,
  children,
  className,
  title,
  ...props
}: {
  tone: Tone
  children: React.ReactNode
  className?: string
  title?: string
} & React.HTMLAttributes<HTMLSpanElement>) {
  const Icon = tone === "critical" ? AlertOctagon : tone === "warning" ? AlertTriangle : null
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      {children}
    </span>
  )
}
