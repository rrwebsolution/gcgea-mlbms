import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import type { LucideIcon } from "lucide-react"
import { EmptyState } from "@/components/shared/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

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

export function DashboardListCard({ title, icon: Icon, viewAllPath, isLoading, isEmpty, emptyLabel = "Nothing to show right now.", className, children }: DashboardListCardProps) {
  return (
    <div className={cn("flex flex-col rounded-xl border border-border bg-card shadow-sm", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="size-4 text-primary" />
          {title}
        </span>
        {viewAllPath && (
          <Link to={viewAllPath} className="text-xs font-medium text-primary hover:underline">
            View All
          </Link>
        )}
      </div>
      <div className="flex-1 divide-y divide-border">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="p-4">
            <EmptyState title={emptyLabel} className="border-none bg-transparent py-6" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
