import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface DialogSkeletonProps {
  /** Number of skeleton content rows to render below the title. */
  rows?: number
  className?: string
}

/** Drop-in skeleton for dialog bodies that fetch data on open, so the modal never flashes empty. */
export function DialogSkeleton({ rows = 3, className }: DialogSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <Skeleton className="h-5 w-2/3" />
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className={cn("h-4", i % 2 === 0 ? "w-full" : "w-4/5")} />
        ))}
      </div>
    </div>
  )
}
