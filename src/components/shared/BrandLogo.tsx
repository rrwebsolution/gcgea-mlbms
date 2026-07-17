import * as React from "react"
import { ShieldCheck } from "lucide-react"
import { ORGANIZATION } from "@/constants/organization"
import { cn } from "@/lib/utils"

interface BrandLogoProps {
  className?: string
}

/**
 * Official GCGEA logo, reused everywhere branding appears. Falls back to a
 * plain badge icon if the logo file fails to load, so a missing/broken asset
 * never breaks the surrounding layout.
 */
export function BrandLogo({ className }: BrandLogoProps) {
  const [failed, setFailed] = React.useState(false)

  if (failed) {
    return (
      <span className={cn("flex shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground", className)}>
        <ShieldCheck className="size-1/2" />
      </span>
    )
  }

  return (
    <img
      src={ORGANIZATION.logoPath}
      alt={`${ORGANIZATION.acronym} logo`}
      className={cn("shrink-0 object-contain", className)}
      onError={() => setFailed(true)}
    />
  )
}
