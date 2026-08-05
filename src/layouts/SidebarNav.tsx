import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown } from "lucide-react"
import { NAV_ITEMS, type NavItem } from "@/constants/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { listMyApprovals } from "@/services/approvals.service"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/** Live count of items awaiting this user's action — same query the Approval Inbox page's
 *  own "Pending My Action" stat uses, so the two stay in sync and share one network call. */
function ApprovalInboxBadge({ variant }: { variant: "inline" | "dot" }) {
  const { user } = useAuth()
  const { data } = useQuery({
    queryKey: ["my-approvals", user?.id, { tab: "pending", page: 1, perPage: 1 }],
    queryFn: () => listMyApprovals({ tab: "pending", page: 1, perPage: 1 }),
    refetchInterval: 5 * 60_000,
  })
  const count = data?.meta.totalRecords ?? 0
  if (count === 0) return null

  if (variant === "dot") {
    return (
      <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[0.6rem] font-bold text-destructive-foreground ring-2 ring-sidebar">
        {count > 9 ? "9+" : count}
      </span>
    )
  }

  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[0.65rem] font-bold text-destructive-foreground">
      {count > 99 ? "99+" : count}
    </span>
  )
}

function isItemVisible(
  item: NavItem,
  hasPermission: (code: import("@/types").PermissionCode) => boolean,
  hasAnyPermission: (codes: import("@/types").PermissionCode[]) => boolean
): boolean {
  if (item.children) {
    return item.children.some((child) => isItemVisible(child, hasPermission, hasAnyPermission))
  }
  if (item.anyOf) return hasAnyPermission(item.anyOf)
  return item.permission ? hasPermission(item.permission) : true
}

function NavLink({ 
  item, 
  collapsed, 
  isActive, 
  isChild = false,
  onNavigate,
}: { 
  item: NavItem 
  collapsed: boolean 
  isActive: boolean 
  isChild?: boolean 
  onNavigate?: () => void
}) {
  const Icon = item.icon
  const showBadge = item.path === "/my-approvals"

  const link = (
    <Link
      to={item.path}
      onClick={onNavigate}
      className={cn(
        "group/link relative flex items-center gap-2.5 rounded-xl py-2 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        isChild ? "px-3 text-[13px]" : "px-3 text-sm",
        isActive
          ? isChild
            ? "bg-gold/15 font-semibold text-gold-foreground dark:text-gold shadow-2xs"
            : "bg-sidebar-primary font-semibold text-sidebar-primary-foreground shadow-sm shadow-sidebar-primary/10"
          : cn(
              "font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isChild && "text-sidebar-foreground/65 font-normal hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            ),
        collapsed && "justify-center px-0 h-10 w-10 mx-auto"
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "shrink-0 transition-transform duration-200 group-hover/link:scale-110",
            isChild
              ? "size-4 opacity-80 group-hover/link:opacity-100"
              : "size-[18px]"
          )}
        />
      )}
      {!collapsed && <span className="truncate">{item.label}</span>}
      {showBadge && <ApprovalInboxBadge variant={collapsed ? "dot" : "inline"} />}
    </Link>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right" className="font-semibold text-xs">
        {item.label}
      </TooltipContent>
    </Tooltip>
  )
}

function NavGroup({ item, collapsed, pathname, onNavigate }: { item: NavItem; collapsed: boolean; pathname: string; onNavigate?: () => void }) {
  const { hasPermission, hasAnyPermission } = useAuth()
  const visibleChildren = (item.children ?? []).filter((child) => isItemVisible(child, hasPermission, hasAnyPermission))
  const isGroupActive = pathname.startsWith(item.path === "/admin" ? "/admin" : item.path)
  const [open, setOpen] = React.useState(isGroupActive)

  React.useEffect(() => {
    if (isGroupActive) setOpen(true)
  }, [isGroupActive])

  if (visibleChildren.length === 0) return null

  if (collapsed) {
    if (item.flattenWhenCollapsed) {
      return (
        <div className="space-y-1">
          {visibleChildren.map((child) => (
            <NavLink key={child.path} item={child} collapsed={collapsed} isActive={pathname === child.path} isChild onNavigate={onNavigate} />
          ))}
        </div>
      )
    }
    return <NavLink item={item} collapsed={collapsed} isActive={isGroupActive} onNavigate={onNavigate} />
  }

  const Icon = item.icon

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring text-left group/trigger",
          isGroupActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm shadow-sidebar-primary/10"
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        {Icon && (
          <Icon className="size-[18px] shrink-0 transition-transform duration-200 group-hover/trigger:scale-110" />
        )}
        <span className="flex-1 truncate">{item.label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-200 ease-in-out",
            isGroupActive ? "text-sidebar-primary-foreground/80" : "text-sidebar-foreground/45",
            open && "rotate-180",
            open && !isGroupActive && "text-sidebar-foreground"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down my-1 space-y-1 ml-4 border-l border-sidebar-border/50 pl-2.5">
        {visibleChildren.map((child) => (
          <NavLink key={child.path} item={child} collapsed={collapsed} isActive={pathname === child.path} isChild onNavigate={onNavigate} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { hasPermission, hasAnyPermission } = useAuth()
  const location = useLocation()
  const visibleItems = NAV_ITEMS.filter((item) => isItemVisible(item, hasPermission, hasAnyPermission))

  return (
    <nav className="flex flex-col gap-1.5 px-2">
      {visibleItems.map((item) =>
        item.children ? (
          <NavGroup key={item.path} item={item} collapsed={collapsed} pathname={location.pathname} onNavigate={onNavigate} />
        ) : (
          <NavLink key={item.path} item={item} collapsed={collapsed} isActive={location.pathname === item.path} onNavigate={onNavigate} />
        )
      )}
    </nav>
  )
}
