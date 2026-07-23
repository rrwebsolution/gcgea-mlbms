import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface CardLoaderProps {
  /** Number of label/value skeleton rows to render (e.g. Member Summary, Loan Summary). */
  rows?: number
  /** Show a skeleton title above the rows. */
  showTitle?: boolean
  className?: string
}

/** Generic skeleton replacement for summary info cards (Member/Loan/Benefit/Contribution/Payroll/Office Summary). */
export function CardLoader({ rows = 4, showTitle = true, className }: CardLoaderProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 shadow-sm", className)}>
      {showTitle && <Skeleton className="mb-4 h-4 w-32" />}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}
