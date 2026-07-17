import { cn } from "@/lib/utils"

interface ProfileCompletenessProps {
  percentage: number
  showLabel?: boolean
  className?: string
}

export function ProfileCompleteness({ percentage, showLabel = true, className }: ProfileCompletenessProps) {
  const clamped = Math.min(100, Math.max(0, percentage))
  const tone = clamped >= 100 ? "text-success" : clamped >= 60 ? "text-warning" : "text-destructive"
  const barClass = clamped >= 100 ? "bg-success" : clamped >= 60 ? "bg-warning" : "bg-destructive"

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"
      >
        <div className={cn("h-full rounded-full transition-all", barClass)} style={{ width: `${clamped}%` }} />
      </div>
      {showLabel && <span className={cn("text-xs font-medium tabular-nums", tone)}>{clamped}%</span>}
    </div>
  )
}
