import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { RefreshPageDataButton } from "@/components/shared/RefreshPageDataButton"

interface PageHeaderProps {
  title: string
  description?: string
  badge?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, badge, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border/40 pb-5 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {badge && <div className="inline-flex items-center">{badge}</div>}
        </div>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground max-w-3xl">
            {description}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-center">
        <RefreshPageDataButton />
        {actions}
      </div>
    </div>
  )
}