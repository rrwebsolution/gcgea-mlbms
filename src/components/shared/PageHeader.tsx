import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { RefreshPageDataButton } from "@/components/shared/RefreshPageDataButton"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold text-foreground sm:text-2xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2 self-start">
        <RefreshPageDataButton />
        {actions}
      </div>
    </div>
  )
}
