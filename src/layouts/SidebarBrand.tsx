import { Link } from "react-router-dom"
import { BrandLogo } from "@/components/shared/BrandLogo"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useGeneralSettings } from "@/hooks/useGeneralSettings"

interface SidebarBrandProps {
  collapsed?: boolean
  onNavigate?: () => void
}

/** Logo + organization identity shown in both the desktop and mobile sidebar headers. */
export function SidebarBrand({ collapsed = false, onNavigate }: SidebarBrandProps) {
  const general = useGeneralSettings()
  const brand = (
    <Link
      to="/dashboard"
      onClick={onNavigate}
      className={cn(
        "group flex min-w-0 items-center gap-3 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar rounded-xl p-1 -m-1",
        collapsed && "justify-center"
      )}
    >
      {/* Elevated Logo Badge Container */}
      <div className="relative shrink-0 flex items-center justify-center rounded-xl bg-background/80 p-1.5 shadow-2xs ring-1 ring-border/10 transition-all duration-300 ease-out group-hover:scale-105 group-hover:ring-primary/30 group-hover:shadow-xs group-active:scale-95 backdrop-blur-sm">
        <BrandLogo className={collapsed ? "size-7" : "size-8"} />
      </div>

      {!collapsed && (
        <span className="min-w-0 transition-all duration-300 ease-in-out">
          <span className="block truncate font-heading text-sm font-bold tracking-tight text-sidebar-foreground transition-colors group-hover:text-primary">
            {general.systemShortName}
          </span>
          <span className="block truncate text-[9px] font-bold tracking-wider uppercase text-sidebar-foreground/50 mt-0.5">
            {general.systemName}
          </span>
        </span>
      )}
    </Link>
  )

  if (!collapsed) return brand

  return (
    <Tooltip>
      <TooltipTrigger render={brand} />
      <TooltipContent side="right" className="font-semibold text-xs">
        {`${general.systemShortName} — ${general.systemName}`}
      </TooltipContent>
    </Tooltip>
  )
}
