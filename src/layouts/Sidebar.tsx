import { useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SidebarNav } from "@/layouts/SidebarNav"
import { SidebarBrand } from "@/layouts/SidebarBrand"
import { useSidebar } from "@/contexts/SidebarContext"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const { isCollapsed, toggleCollapsed } = useSidebar()
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    toast.success("You have been logged out successfully.")
    navigate("/login", { replace: true })
  }

  const logoutButton = (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "w-full text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive",
        isCollapsed && "justify-center px-0"
      )}
      onClick={handleLogout}
      aria-label="Logout"
    >
      <LogOut />
      {!isCollapsed && "Logout"}
    </Button>
  )

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
        isCollapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      <div className={cn("flex h-14 items-center gap-2 border-b border-sidebar-border px-3", isCollapsed && "justify-center px-0")}>
        <SidebarBrand collapsed={isCollapsed} />
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        <SidebarNav collapsed={isCollapsed} />
      </div>

      <div className="border-t border-sidebar-border p-2">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger render={logoutButton} />
            <TooltipContent side="right">Logout</TooltipContent>
          </Tooltip>
        ) : (
          logoutButton
        )}
      </div>

      {/* Collapse/expand toggle — a small icon-only control centered on the sidebar's edge. */}
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute top-1/2 -right-3 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-sidebar-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground"
      >
        {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
      </button>
    </aside>
  )
}
