import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight, type LucideIcon } from "lucide-react"
import { EmptyState } from "@/components/shared/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { usePageRefresh } from "@/contexts/PageRefreshContext"

interface DashboardListCardProps {
  title: string
  icon: LucideIcon
  viewAllPath?: string
  isLoading?: boolean
  isEmpty?: boolean
  emptyLabel?: string
  className?: string
  children: ReactNode
}

export function DashboardListCard({
  title,
  icon: Icon,
  viewAllPath,
  isLoading,
  isEmpty,
  emptyLabel = "Nothing to show right now.",
  className,
  children,
}: DashboardListCardProps) {
  const { isRefreshing } = usePageRefresh()
  const showSkeleton = Boolean(isLoading || isRefreshing)

  return (
    <div
      className={cn(
        "group/card flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xs shadow-xs",
        "transition-all duration-300 hover:border-border/90 hover:shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-muted/15 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
            <Icon className="size-3.5" strokeWidth={2.2} />
          </div>
          <span className="truncate font-heading text-sm font-semibold tracking-tight text-foreground/90">
            {title}
          </span>
        </div>

        {viewAllPath && (
          <Link
            to={viewAllPath}
            className="group/link flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-all duration-200 hover:bg-primary/10 active:scale-95"
          >
            <span>View All</span>
            <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
          </Link>
        )}
      </div>

      {/* Body Content */}
      <div className="flex-1 divide-y divide-border/40">
        {showSkeleton ? (
          <div className="space-y-3.5 p-4 sm:p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-lg bg-muted/60" />
                  <div className="w-full space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4 rounded-md bg-muted/60" />
                    <Skeleton className="h-2.5 w-1/2 rounded-md bg-muted/40" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 shrink-0 rounded-full bg-muted/50" />
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="p-6">
            <EmptyState title={emptyLabel} className="border-none bg-transparent py-4" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}