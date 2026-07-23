import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import { ChevronDown } from "lucide-react"
import { NAV_ITEMS, type NavItem } from "@/constants/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

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
  isChild = false 
}: { 
  item: NavItem 
  collapsed: boolean 
  isActive: boolean 
  isChild?: boolean 
}) {
  const Icon = item.icon
  const link = (
    <Link
      to={item.path}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg py-2 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        isChild ? "px-3 text-[13px]" : "px-2.5 text-sm",
        isActive
          ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground shadow-sm shadow-sidebar-primary/5"
          : cn(
              "font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isChild && "text-sidebar-foreground/70 font-normal hover:bg-sidebar-accent/80"
            ),
        collapsed && "justify-center px-0"
      )}
    >
      {Icon && (
        <Icon 
          className={cn(
            "shrink-0 transition-transform duration-200 group-hover:scale-105", 
            isChild ? "size-4 opacity-80" : "size-4.5"
          )} 
        />
      )}
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
    </Tooltip>
  )
}

function NavGroup({ item, collapsed, pathname }: { item: NavItem; collapsed: boolean; pathname: string }) {
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
            <NavLink key={child.path} item={child} collapsed={collapsed} isActive={pathname === child.path} isChild />
          ))}
        </div>
      )
    }
    return <NavLink item={item} collapsed={collapsed} isActive={isGroupActive} />
  }

  const Icon = item.icon

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring text-left",
          isGroupActive 
            ? "bg-sidebar-accent/30 text-sidebar-foreground font-semibold" 
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        {Icon && <Icon className="size-4.5 shrink-0 transition-transform duration-200" />}
        <span className="flex-1 truncate">{item.label}</span>
        <ChevronDown 
          className={cn(
            "size-3.5 shrink-0 text-sidebar-foreground/50 transition-transform duration-200 ease-in-out", 
            open && "rotate-180 text-sidebar-foreground"
          )} 
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 space-y-1 ml-4 border-l border-sidebar-border/40 pl-3 transition-all duration-300">
        {visibleChildren.map((child) => (
          <NavLink key={child.path} item={child} collapsed={collapsed} isActive={pathname === child.path} isChild />
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
    <nav className="flex flex-col gap-1 px-2.5" onClick={onNavigate}>
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