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
      className={cn("flex min-w-0 items-center gap-2", collapsed && "justify-center")}
    >
      <BrandLogo className={collapsed ? "size-9" : "size-10"} />
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate font-heading text-sm font-semibold">{ORGANIZATION.acronym}</span>
          <span className="block truncate text-[0.65rem] leading-tight text-sidebar-foreground/60">Membership, Loan &amp; Benefits</span>
        </span>
      )}
    </Link>
  )

  if (!collapsed) return brand

  return (
    <Tooltip>
      <TooltipTrigger render={brand} />
      <TooltipContent side="right">{`${ORGANIZATION.acronym} ${ORGANIZATION.systemName}`}</TooltipContent>
    </Tooltip>
  )
}
