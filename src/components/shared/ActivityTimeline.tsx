import type { LucideIcon } from "lucide-react"
import { Circle, User, Inbox } from "lucide-react"
import { formatDateTime } from "@/utils/format"
import { cn } from "@/lib/utils"

export interface TimelineEntry {
  id: string
  title: string
  description?: string
  timestamp: string
  actor?: string
  /** Shown as a badge before the actor's name, e.g. the role that authorized this action. */
  actorRole?: string
  icon?: LucideIcon
  tone?: "neutral" | "success" | "warning" | "danger" | "info"
}

// Custom tone styling with soft backgrounds, subtle borders, and glow shadows
const TONE_CLASSES: Record<NonNullable<TimelineEntry["tone"]>, { node: string; icon: string }> = {
  neutral: {
    node: "bg-muted text-muted-foreground border-border/60 shadow-xs",
    icon: "text-muted-foreground",
  },
  success: {
    node: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-xs shadow-emerald-500/10 ring-2 ring-emerald-500/5",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    node: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-xs shadow-amber-500/10 ring-2 ring-amber-500/5",
    icon: "text-amber-600 dark:text-amber-400",
  },
  danger: {
    node: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shadow-xs shadow-rose-500/10 ring-2 ring-rose-500/5",
    icon: "text-rose-600 dark:text-rose-400",
  },
  info: {
    node: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 shadow-xs shadow-sky-500/10 ring-2 ring-sky-500/5",
    icon: "text-sky-600 dark:text-sky-400",
  },
}

export function ActivityTimeline({ entries }: { entries: TimelineEntry[] }) {
  // Enhanced Empty State
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center bg-muted/20">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
          <Inbox className="size-5" />
        </div>
        <p className="text-sm font-medium text-foreground">No activity recorded</p>
        <p className="text-xs text-muted-foreground mt-0.5">Events and activity history will appear here.</p>
      </div>
    )
  }

  return (
    <ol className="relative space-y-1">
      {entries.map((entry, idx) => {
        const Icon = entry.icon ?? Circle
        const isLast = idx === entries.length - 1
        const toneStyle = TONE_CLASSES[entry.tone ?? "neutral"]

        return (
          <li key={entry.id} className="group relative flex gap-4 rounded-xl p-2.5 transition-colors duration-150 hover:bg-muted/40">
            {/* Timeline Vertical Connector Line */}
            {!isLast && (
              <span
                className="absolute left-6 top-10 -ml-px h-[calc(100%-0.75rem)] w-0.5 bg-gradient-to-b from-border/80 via-border/50 to-transparent"
                aria-hidden="true"
              />
            )}

            {/* Icon Node */}
            <div className="relative flex shrink-0 items-start pt-0.5">
              <span
                className={cn(
                  "z-10 flex size-7 items-center justify-center rounded-full border transition-transform duration-200 group-hover:scale-105",
                  toneStyle.node
                )}
              >
                <Icon className={cn("size-3.5 shrink-0", toneStyle.icon)} />
              </span>
            </div>

            {/* Content Body */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                <p className="text-sm font-medium text-foreground leading-tight">{entry.title}</p>
                <time className="text-[11px] font-mono text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">
                  {formatDateTime(entry.timestamp)}
                </time>
              </div>

              {entry.description && (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed break-words">
                  {entry.description}
                </p>
              )}

              {(entry.actor || entry.actorRole) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {entry.actorRole && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary border border-primary/20">
                      {entry.actorRole}
                    </span>
                  )}
                  {entry.actor && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground border border-border/30">
                      <User className="size-3 text-muted-foreground/70" />
                      {entry.actor}
                    </span>
                  )}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
