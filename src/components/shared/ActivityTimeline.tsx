import type { LucideIcon } from "lucide-react"
import { Circle } from "lucide-react"
import { formatDateTime } from "@/utils/format"
import { cn } from "@/lib/utils"

export interface TimelineEntry {
  id: string
  title: string
  description?: string
  timestamp: string
  actor?: string
  icon?: LucideIcon
  tone?: "neutral" | "success" | "warning" | "danger" | "info"
}

const TONE_CLASSES: Record<NonNullable<TimelineEntry["tone"]>, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
  info: "bg-info/15 text-info",
}

export function ActivityTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
  }

  return (
    <ol className="space-y-0">
      {entries.map((entry, idx) => {
        const Icon = entry.icon ?? Circle
        const isLast = idx === entries.length - 1
        return (
          <li key={entry.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && <span className="absolute top-7 left-3.5 h-[calc(100%-1.5rem)] w-px bg-border" aria-hidden="true" />}
            <span className={cn("z-10 flex size-7 shrink-0 items-center justify-center rounded-full", TONE_CLASSES[entry.tone ?? "neutral"])}>
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-medium text-foreground">{entry.title}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(entry.timestamp)}</p>
              </div>
              {entry.description && <p className="mt-0.5 text-sm text-muted-foreground">{entry.description}</p>}
              {entry.actor && <p className="mt-0.5 text-xs text-muted-foreground">by {entry.actor}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
