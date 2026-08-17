import * as React from "react"
import { Link } from "react-router-dom"
import { BrandLogo } from "@/components/shared/BrandLogo"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useGeneralSettings } from "@/hooks/useGeneralSettings"
import { getAppearance } from "@/services/settings.service"
import type { AppearanceSettings } from "@/types"

interface SidebarBrandProps {
  collapsed?: boolean
  onNavigate?: () => void
}

/** Logo + organization identity shown in both desktop and mobile sidebar headers. */
export function SidebarBrand({ collapsed = false, onNavigate }: SidebarBrandProps) {
  const general = useGeneralSettings()
  const [appearance, setAppearance] = React.useState(() => getAppearance())

  React.useEffect(() => {
    const handleAppearanceChange = (event: Event) =>
      setAppearance((event as CustomEvent<AppearanceSettings>).detail)
    window.addEventListener("gcgea:appearance-changed", handleAppearanceChange)
    return () => window.removeEventListener("gcgea:appearance-changed", handleAppearanceChange)
  }, [])

  const logoClass =
    appearance.logoSize === "small"
      ? "size-6"
      : appearance.logoSize === "large"
        ? "size-9"
        : "size-7"

  const brand = (
    <Link
      to="/dashboard"
      onClick={onNavigate}
      className={cn(
        "group relative flex min-w-0 items-center rounded-xl p-1.5 transition-all duration-200",
        "hover:bg-sidebar-accent/30 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar",
        collapsed ? "w-full justify-center" : "w-full gap-3"
      )}
    >
      {/* Elevated Glass Logo Container */}
      <div
        className={cn(
          "relative shrink-0 flex items-center justify-center rounded-xl",
          "border border-sidebar-border/60 bg-gradient-to-b from-background/90 to-background/50 backdrop-blur-md",
          "shadow-xs ring-1 ring-black/5 dark:ring-white/5",
          "transition-all duration-300 group-hover:scale-105 group-hover:border-primary/40 group-hover:shadow-sm",
          collapsed ? "size-10" : "p-1.5"
        )}
      >
        <BrandLogo
          className={cn(
            "shrink-0 object-contain transition-transform duration-300",
            collapsed ? "size-6" : logoClass
          )}
        />
      </div>

      {/* Brand Identity Typography */}
      {!collapsed && (
        <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
          <span className="truncate font-heading text-sm font-bold tracking-tight text-sidebar-foreground transition-colors duration-200 group-hover:text-primary">
            {general.systemShortName}
          </span>
          <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 transition-colors duration-200 group-hover:text-sidebar-foreground/75">
            {general.systemName}
          </span>
        </div>
      )}
    </Link>
  )

  if (!collapsed) return brand

  return (
    <Tooltip>
      <TooltipTrigger render={brand} />
      <TooltipContent side="right" align="center" className="flex flex-col gap-0.5 p-2.5 shadow-md">
        <span className="text-xs font-bold text-foreground">{general.systemShortName}</span>
        <span className="text-[10px] text-muted-foreground">{general.systemName}</span>
      </TooltipContent>
    </Tooltip>
  )
}
