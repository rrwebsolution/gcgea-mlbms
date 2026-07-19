import { Link } from "react-router-dom"
import { BrandLogo } from "@/components/shared/BrandLogo"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ORGANIZATION } from "@/constants/organization"
import { cn } from "@/lib/utils"

interface SidebarBrandProps {
  collapsed?: boolean
  onNavigate?: () => void
}

/** Logo + organization identity shown in both the desktop and mobile sidebar headers. */
export function SidebarBrand({ collapsed = false, onNavigate }: SidebarBrandProps) {
  const brand = (
    <Link
      to="/dashboard"
      onClick={onNavigate}
      className={cn(
        "group flex min-w-0 items-center gap-3 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar rounded-lg",
        collapsed && "justify-center"
      )}
    >
      <div className="shrink-0 transition-transform duration-300 ease-out group-hover:scale-105 group-active:scale-95">
        <BrandLogo className={collapsed ? "size-9" : "size-10"} />
      </div>
      {!collapsed && (
        <span className="min-w-0 transition-all duration-300 ease-in-out">
          <span className="block truncate font-heading text-sm font-bold tracking-tight text-sidebar-foreground group-hover:text-sidebar-foreground/90">
            {ORGANIZATION.acronym}
          </span>
          <span className="block truncate text-[10px] font-medium tracking-wide leading-none text-sidebar-foreground/60 mt-0.5">
            Membership, Loan &amp; Benefits
          </span>
        </span>
      )}
    </Link>
  )

  if (!collapsed) return brand

  return (
    <Tooltip>
      <TooltipTrigger render={brand} />
      <TooltipContent side="right" className="font-medium">
        {`${ORGANIZATION.acronym} ${ORGANIZATION.systemName}`}
      </TooltipContent>
    </Tooltip>
  )
}