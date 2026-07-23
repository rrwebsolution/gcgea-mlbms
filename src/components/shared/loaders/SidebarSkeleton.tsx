import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface SidebarSkeletonProps {
  collapsed?: boolean
  /** How many nav-item rows to render. */
  items?: number
}

/**
 * Skeleton stand-in for the sidebar's logo + nav list. Not currently mounted anywhere —
 * `ProtectedRoute` already keeps the whole authenticated layout (sidebar included) behind
 * `AppLoader` until auth/permissions resolve, so the real `Sidebar` never mounts mid-fetch
 * today. Kept as a ready building block if that changes (e.g. a standalone nav refetch).
 */
export function SidebarSkeleton({ collapsed = false, items = 7 }: SidebarSkeletonProps) {
  return (
    <div className={cn("flex h-svh flex-col border-r border-sidebar-border bg-sidebar/95", collapsed ? "w-[72px]" : "w-[260px]")}>
      <div className={cn("flex h-14 items-center gap-3 border-b border-sidebar-border/80 px-4", collapsed && "justify-center px-0")}>
        <Skeleton className="size-8 shrink-0 rounded-lg" />
        {!collapsed && <Skeleton className="h-4 w-28" />}
      </div>
      <div className="flex-1 space-y-1.5 px-2.5 py-4">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2", collapsed && "justify-center px-0")}>
            <Skeleton className="size-4.5 shrink-0 rounded-sm" />
            {!collapsed && <Skeleton className="h-3.5 flex-1" style={{ maxWidth: `${60 + ((i * 17) % 40)}%` }} />}
          </div>
        ))}
      </div>
    </div>
  )
}
