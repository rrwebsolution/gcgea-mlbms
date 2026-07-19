import * as React from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight, Loader2, LogOut } from "lucide-react"
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
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
      toast.success("You have been logged out successfully.")
      navigate("/login", { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  const logoutButton = (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "w-full text-sidebar-foreground/75 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 font-medium",
        isCollapsed ? "justify-center px-0 h-10" : "justify-start px-3 gap-3 h-10"
      )}
      onClick={handleLogout}
      disabled={isLoggingOut}
      aria-label="Logout"
    >
      {isLoggingOut ? (
        <Loader2 className="size-4 animate-spin shrink-0" aria-hidden="true" />
      ) : (
        <LogOut className="size-4 shrink-0 transition-transform duration-200" aria-hidden="true" />
      )}
      {!isCollapsed && <span className="truncate">Logout</span>}
    </Button>
  )

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur-md shadow-sm transition-[width] duration-300 ease-in-out lg:flex",
        isCollapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Brand Header */}
      <div 
        className={cn(
          "flex h-14 items-center gap-3 border-b border-sidebar-border/80 px-4 transition-all duration-300", 
          isCollapsed && "justify-center px-0"
        )}
      >
        <SidebarBrand collapsed={isCollapsed} />
      </div>

      {/* Navigation Links Area */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-sidebar-border">
        <SidebarNav collapsed={isCollapsed} />
      </div>

      {/* Footer Area with Logout Action */}
      <div className="border-t border-sidebar-border/80 p-3 bg-sidebar/30">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger render={logoutButton} />
            <TooltipContent side="right" className="font-medium">Logout</TooltipContent>
          </Tooltip>
        ) : (
          logoutButton
        )}
      </div>

      {/* Edge toggle control button */}
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute top-1/2 -right-3 z-20 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-sidebar-border bg-background text-muted-foreground shadow-md transition-all duration-200 hover:text-foreground hover:bg-accent hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {isCollapsed ? (
          <ChevronRight className="size-3.5 transition-transform duration-200" />
        ) : (
          <ChevronLeft className="size-3.5 transition-transform duration-200" />
        )}
      </button>
    </aside>
  )
}