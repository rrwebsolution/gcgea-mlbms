import { Skeleton } from "@/components/ui/skeleton"
import { AvatarSkeleton } from "@/components/shared/loaders/AvatarSkeleton"
import { CardLoader } from "@/components/shared/loaders/CardLoader"
import { cn } from "@/lib/utils"

interface ProfileSkeletonProps {
  /** Number of summary/info cards to render below the header. */
  cards?: number
  /** Show a skeleton tab bar (Overview / History / Documents, etc.). */
  showTabs?: boolean
  className?: string
}

/** Full detail/profile page skeleton — header avatar + name, info cards, and an optional tab bar. Replaces bare centered spinners on detail pages. */
export function ProfileSkeleton({ cards = 2, showTabs = true, className }: ProfileSkeletonProps) {
  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <AvatarSkeleton size="lg" className="size-16" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {showTabs && (
        <div className="flex gap-2 border-b border-border pb-px">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-t-md" />
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: cards }).map((_, i) => (
          <CardLoader key={i} />
        ))}
      </div>
    </div>
  )
}
