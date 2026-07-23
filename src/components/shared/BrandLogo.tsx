import * as React from "react"
import { ShieldCheck } from "lucide-react"
import { ORGANIZATION } from "@/constants/organization"
import { cn } from "@/lib/utils"
import { getAppearance } from "@/services/settings.service"
import type { AppearanceSettings } from "@/types"

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
  const [logoUrl, setLogoUrl] = React.useState(() => getAppearance().sidebarLogoUrl || ORGANIZATION.logoPath)

  React.useEffect(() => {
    function handleAppearanceChange(event: Event) {
      const appearance = (event as CustomEvent<AppearanceSettings>).detail
      setFailed(false)
      setLogoUrl(appearance.sidebarLogoUrl || ORGANIZATION.logoPath)
    }
    window.addEventListener("gcgea:appearance-changed", handleAppearanceChange)
    return () => window.removeEventListener("gcgea:appearance-changed", handleAppearanceChange)
  }, [])

  if (failed) {
    return (
      <span className={cn("flex shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground", className)}>
        <ShieldCheck className="size-1/2" />
      </span>
    )
  }

  return (
    <img
      src={logoUrl}
      alt={`${ORGANIZATION.acronym} logo`}
      className={cn("shrink-0 object-contain", className)}
      onError={() => setFailed(true)}
    />
  )
}
