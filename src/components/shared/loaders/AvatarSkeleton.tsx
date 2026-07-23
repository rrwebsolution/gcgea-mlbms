import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const SIZE_CLASS = {
  sm: "size-6",
  default: "size-8",
  lg: "size-10",
} as const

interface AvatarSkeletonProps {
  size?: keyof typeof SIZE_CLASS
  className?: string
}

/** Circular pulse skeleton matching `Avatar`'s size variants, for member/user photos still loading. */
export function AvatarSkeleton({ size = "default", className }: AvatarSkeletonProps) {
  return <Skeleton className={cn("shrink-0 rounded-full", SIZE_CLASS[size], className)} />
}
