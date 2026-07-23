import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { IndeterminateBar } from "@/components/shared/loaders/IndeterminateBar"
import { usePageRefresh } from "@/contexts/PageRefreshContext"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

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

function compactNumericValue(value: string): string {
  const trimmed = value.trim()
  const match = trimmed.match(/^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/)
  if (!match) return value

  const numericValue = Number(match[2].replaceAll(",", ""))
  if (!Number.isFinite(numericValue) || Math.abs(numericValue) < 10_000) return value

  const compact = new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(numericValue)

  return `${match[1]}${compact}${match[3]}`
}

export function StatCard({ label, value, icon: Icon, tone = "primary", trend, isLoading }: StatCardProps) {
  const { isRefreshing } = usePageRefresh()
  const showSkeleton = Boolean(isLoading || isRefreshing)
  const displayValue = compactNumericValue(value)
  const card = (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
      {showSkeleton && <IndeterminateBar className="mb-3" />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          {showSkeleton ? <Skeleton className="h-3 w-20" /> : <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>}
          {showSkeleton ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <p
              className="max-w-full truncate font-heading text-base font-semibold leading-tight text-foreground sm:text-lg xl:text-xl"
            >
              {displayValue}
            </p>
          )}
          {trend && !showSkeleton && (
            <div className={cn("flex items-center gap-1 text-xs font-medium", trend.direction === "up" ? "text-success" : "text-destructive")}>
              {trend.direction === "up" ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {trend.value}
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
            showSkeleton ? "bg-muted text-muted-foreground/50" : TONE_CLASSES[tone]
          )}
        >
          <Icon className="size-4.5" />
        </div>
      </div>
      {showSkeleton && <IndeterminateBar className="mt-3 w-12" />}
    </div>
  )

  return (
    <Tooltip disabled={showSkeleton}>
      <TooltipTrigger render={card} />
      <TooltipContent side="top" className="flex-col items-start gap-0.5 px-3 py-2">
        <span className="text-[10px] font-medium opacity-75">{label}</span>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      </TooltipContent>
    </Tooltip>
  )
}
