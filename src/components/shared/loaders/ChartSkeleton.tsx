import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { IndeterminateBar } from "@/components/shared/loaders/IndeterminateBar"

interface ChartSkeletonProps {
  height?: number
  variant?: "bars" | "bars-horizontal" | "area"
  className?: string
}

const BAR_HEIGHTS = [55, 80, 40, 95, 65, 50, 85, 60]

/** Animated placeholder shown in place of a blank Recharts container while its data is loading. */
export function ChartSkeleton({ height = 260, variant = "bars", className }: ChartSkeletonProps) {
  if (variant === "bars-horizontal") {
    return (
      <div className={cn("space-y-3", className)}>
        <IndeterminateBar />
        <div className="flex flex-col justify-center gap-3 px-2" style={{ height }}>
          {BAR_HEIGHTS.slice(0, 6).map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-20 shrink-0" />
              <Skeleton className="h-4 rounded-r-full" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (variant === "area") {
    return (
      <div className={cn("space-y-3", className)}>
        <IndeterminateBar />
        <div className="relative overflow-hidden rounded-lg" style={{ height }}>
          <Skeleton className="absolute inset-0 rounded-lg" />
          <svg className="absolute inset-x-0 bottom-0 h-2/3 w-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 40">
            <path d="M0,35 C15,15 25,30 40,20 C55,10 65,25 80,15 C90,10 95,18 100,12 L100,40 L0,40 Z" className="fill-muted-foreground/30" />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <IndeterminateBar />
      <div className="flex items-end justify-between gap-2.5 px-2" style={{ height }}>
        {BAR_HEIGHTS.map((h, i) => (
          <Skeleton key={i} className="w-full rounded-t-md" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}
