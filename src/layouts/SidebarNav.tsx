import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import { ChevronDown } from "lucide-react"
import { NAV_ITEMS, type NavItem } from "@/constants/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

function isItemVisible(item: NavItem, hasPermission: (code: import("@/types").PermissionCode) => boolean): boolean {
  if (item.children) {
    return item.children.some((child) => isItemVisible(child, hasPermission))
  }
  return item.permission ? hasPermission(item.permission) : true
}

function NavLink({ item, collapsed, isActive }: { item: NavItem; collapsed: boolean; isActive: boolean }) {
  const Icon = item.icon
  const link = (
    <Link
      to={item.path}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-0"
      )}
    >
      {Icon && <Icon className="size-4.5 shrink-0" />}
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

function NavGroup({ item, collapsed, pathname }: { item: NavItem; collapsed: boolean; pathname: string }) {
  const { hasPermission } = useAuth()
  const visibleChildren = (item.children ?? []).filter((child) => isItemVisible(child, hasPermission))
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
            <NavLink key={child.path} item={child} collapsed={collapsed} isActive={pathname === child.path} />
          ))}
        </div>
      )
    }
    return <NavLink item={item} collapsed={collapsed} isActive={isGroupActive} />
  }

  const Icon = item.icon

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
          isGroupActive ? "text-sidebar-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        {Icon && <Icon className="size-4.5 shrink-0" />}
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3.5">
        {visibleChildren.map((child) => (
          <NavLink key={child.path} item={child} collapsed={collapsed} isActive={pathname === child.path} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { hasPermission } = useAuth()
  const location = useLocation()
  const visibleItems = NAV_ITEMS.filter((item) => isItemVisible(item, hasPermission))

  return (
    <nav className="flex flex-col gap-0.5 px-2" onClick={onNavigate}>
      {visibleItems.map((item) =>
        item.children ? (
          <NavGroup key={item.path} item={item} collapsed={collapsed} pathname={location.pathname} />
        ) : (
          <NavLink key={item.path} item={item} collapsed={collapsed} isActive={location.pathname === item.path} />
        )
      )}
    </nav>
  )
}
