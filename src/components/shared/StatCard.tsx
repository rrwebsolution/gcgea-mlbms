import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  tone?: "primary" | "success" | "warning" | "danger" | "gold" | "info"
  trend?: { value: string; direction: "up" | "down" }
  isLoading?: boolean
}

const TONE_CLASSES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/10 text-destructive",
  gold: "bg-gold/15 text-gold-foreground",
  info: "bg-info/10 text-info",
}

export function StatCard({ label, value, icon: Icon, tone = "primary", trend, isLoading }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <p className="font-heading text-xl font-semibold text-foreground sm:text-2xl">{value}</p>
          )}
          {trend && !isLoading && (
            <div className={cn("flex items-center gap-1 text-xs font-medium", trend.direction === "up" ? "text-success" : "text-destructive")}>
              {trend.direction === "up" ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {trend.value}
            </div>
          )}
        </div>
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", TONE_CLASSES[tone])}>
          <Icon className="size-4.5" />
        </div>
      </div>
    </div>
  )
}
