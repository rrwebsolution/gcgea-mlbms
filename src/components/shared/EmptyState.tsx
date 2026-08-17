import type { LucideIcon } from "lucide-react"
import { Inbox } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  /** Loading takes precedence over all empty-state copy. */
  isLoading?: boolean
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className, isLoading }: EmptyStateProps) {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading content"
        aria-busy="true"
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12",
          className
        )}
      >
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3.5 w-full max-w-xs" />
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center", className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-heading text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}
