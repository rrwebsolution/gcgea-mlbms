import type { LucideIcon } from "lucide-react"
import { BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChartEmptyStateProps {
  label?: string
  description?: string
  icon?: LucideIcon
  className?: string
}

export function ChartEmptyState({
  label = "No data available",
  description = "Data will appear here once records are available.",
  icon: Icon = BarChart3,
  className,
}: ChartEmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex h-[260px] flex-col items-center justify-center overflow-hidden rounded-2xl",
        "border border-dashed border-border/70 bg-gradient-to-b from-muted/30 via-muted/10 to-transparent",
        "px-6 text-center backdrop-blur-xs",
        className
      )}
    >
      {/* Soft Ambient Radial Background Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-radial from-primary/5 via-transparent to-transparent opacity-70" />

      {/* Elevated Glass Icon Container */}
      <div className="relative mb-3 flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-background/80 text-muted-foreground shadow-2xs backdrop-blur-md ring-1 ring-black/5 dark:ring-white/5">
        <Icon className="size-6 text-muted-foreground/60" strokeWidth={1.8} />
      </div>

      {/* Primary Label */}
      <h4 className="font-heading text-sm font-semibold tracking-tight text-foreground/85">
        {label}
      </h4>

      {/* Subtitle Description */}
      <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-muted-foreground/70">
        {description}
      </p>
    </div>
  )
}