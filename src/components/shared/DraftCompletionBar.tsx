import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DraftCompletionBarProps {
  percentage: number
  sections?: { label: string; complete: boolean }[]
  showLabel?: boolean
  className?: string
}

/** Generalizes ProfileCompleteness into a reusable draft-progress bar with an optional missing-sections list. */
export function DraftCompletionBar({ percentage, sections, showLabel = true, className }: DraftCompletionBarProps) {
  const clamped = Math.min(100, Math.max(0, percentage))
  const tone = clamped >= 100 ? "text-success" : clamped >= 60 ? "text-warning" : "text-destructive"
  const barClass = clamped >= 100 ? "bg-success" : clamped >= 60 ? "bg-warning" : "bg-destructive"

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <div
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-muted"
        >
          <div className={cn("h-full rounded-full transition-all", barClass)} style={{ width: `${clamped}%` }} />
        </div>
        {showLabel && <span className={cn("text-xs font-medium tabular-nums", tone)}>{clamped}% complete</span>}
      </div>
      {sections && sections.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {sections.map((section) => (
            <li key={section.label} className={cn("flex items-center gap-1", section.complete && "text-success")}>
              {section.complete ? <Check className="size-3" /> : <X className="size-3 text-muted-foreground/60" />}
              {section.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
