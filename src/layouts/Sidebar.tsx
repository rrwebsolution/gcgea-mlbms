import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, Database, Loader2, LogOut } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { SidebarNav } from "@/layouts/SidebarNav"
import { SidebarBrand } from "@/layouts/SidebarBrand"
import { useSidebar } from "@/contexts/SidebarContext"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { getAppearance, getStorageUsage } from "@/services/settings.service"
import type { AppearanceSettings } from "@/types"

function formatBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / 1024 ** 2
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export function Sidebar() {
  const { isCollapsed, toggleCollapsed } = useSidebar()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const [footerBranding, setFooterBranding] = React.useState(() => getAppearance())
  const { data: storageUsage } = useQuery({ queryKey: ["system-storage-usage"], queryFn: getStorageUsage })

  React.useEffect(() => {
    function handleAppearanceChange(event: Event) {
      setFooterBranding((event as CustomEvent<AppearanceSettings>).detail)
    }
    window.addEventListener("gcgea:appearance-changed", handleAppearanceChange)
    return () => window.removeEventListener("gcgea:appearance-changed", handleAppearanceChange)
  }, [])

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
        "w-full rounded-xl text-sidebar-foreground/75 hover:bg-destructive/12 hover:text-destructive transition-all duration-300 font-medium group/btn shadow-none",
        isCollapsed ? "justify-center px-0 h-10 w-10 mx-auto" : "justify-start px-3.5 gap-3 h-10"
      )}
      onClick={handleLogout}
      disabled={isLoggingOut}
      aria-label="Logout"
    >
      {isLoggingOut ? (
        <Loader2 className="size-4 animate-spin shrink-0 text-destructive" aria-hidden="true" />
      ) : (
        <LogOut 
          className="size-4 shrink-0 transition-transform duration-300 group-hover/btn:-translate-x-0.5 group-hover/btn:scale-105" 
          aria-hidden="true" 
        />
      )}
      {!isCollapsed && <span className="truncate text-xs font-semibold">Logout</span>}
    </Button>
  )

  return (
    <TooltipProvider delay={100}>
      <aside
        className={cn(
          "group/sidebar sticky top-0 hidden h-svh shrink-0 flex-col border-r border-sidebar-border/60 bg-sidebar/90 text-sidebar-foreground backdrop-blur-xl shadow-lg shadow-black/5 transition-[width] duration-300 ease-in-out lg:flex z-30",
          isCollapsed ? "w-[76px]" : "w-[270px]"
        )}
      >
        {/* Brand Header */}
        <div 
          className={cn(
            "flex h-16 items-center gap-3 border-b border-sidebar-border/40 px-5 transition-all duration-300 bg-gradient-to-b from-sidebar-accent/15 via-transparent to-transparent", 
            isCollapsed && "justify-center px-0"
          )}
        >
          <SidebarBrand collapsed={isCollapsed} />
        </div>

        {/* Navigation Links Area */}
        <div className="flex-1 overflow-y-auto py-5 px-3 scrollbar-thin scrollbar-thumb-sidebar-border/60 scrollbar-track-transparent">
          <SidebarNav collapsed={isCollapsed} />
        </div>

        {/* Footer Area with Logos & Logout Action */}
        <div className="border-t border-sidebar-border/40 bg-sidebar-accent/10 p-3.5 flex flex-col gap-3">
          {/* Association footer logos are optional and hidden by default. */}
          {footerBranding.showSidebarFooterLogos && (
            <div
              className={cn(
                "flex items-center justify-center rounded-2xl border border-sidebar-border/30 bg-sidebar-accent/20 p-2.5 backdrop-blur-md transition-all duration-300",
                isCollapsed ? "flex-col gap-2.5 bg-transparent border-transparent p-0" : "flex-row gap-4"
              )}
              aria-label="Association logos"
            >
              {[
                { src: footerBranding.sidebarFooterLeftLogoUrl, label: footerBranding.sidebarFooterLeftLogoLabel },
                { src: footerBranding.sidebarFooterRightLogoUrl, label: footerBranding.sidebarFooterRightLogoLabel },
              ].map((logo, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex min-w-0 flex-col items-center gap-1.5 transition-all duration-300",
                    isCollapsed ? "scale-95" : "scale-100 flex-1"
                  )}
                >
                  <div className="relative flex items-center justify-center rounded-xl bg-background/80 p-2 shadow-2xs ring-1 ring-border/10 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xs">
                    <img
                      src={logo.src}
                      alt={`${logo.label} logo`}
                      title={logo.label}
                      className={cn(
                        "shrink-0 object-contain transition-all duration-300",
                        isCollapsed
                          ? "size-6"
                          : footerBranding.logoSize === "small"
                            ? "size-6"
                            : footerBranding.logoSize === "large"
                              ? "size-10"
                              : "size-8"
                      )}
                    />
                  </div>
                  {!isCollapsed && (
                    <span className="max-w-[90px] truncate text-center text-[9px] font-bold uppercase tracking-wider text-sidebar-foreground/50">
                      {logo.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Disk Usage */}
          {!isCollapsed && storageUsage && (() => {
            const percent = (storageUsage.usedBytes / storageUsage.totalBytes) * 100
            const isDanger = percent >= 90
            const isWarning = !isDanger && percent >= 75
            return (
            <div className="rounded-xl border border-sidebar-border/30 bg-sidebar-accent/15 p-2.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/60">
                <Database className="size-3" aria-hidden="true" />
                Disk Usage
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-sidebar-border/40">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500",
                    isDanger ? "bg-destructive" : isWarning ? "bg-warning" : "bg-primary"
                  )}
                  style={{
                    width: `${storageUsage.usedBytes > 0 ? Math.max(2, Math.min(100, percent)) : 0}%`,
                  }}
                />
              </div>
              <p className={cn("mt-1.5 text-[10px] font-medium", isDanger ? "text-destructive" : "text-sidebar-foreground/60")}>
                {formatBytes(storageUsage.usedBytes)} / {formatBytes(storageUsage.totalBytes)} used
              </p>
            </div>
            )
          })()}

          {/* Logout Action */}
          <div className="w-full">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger render={logoutButton} />
                <TooltipContent side="right" align="center" className="font-semibold text-xs">
                  Logout
                </TooltipContent>
              </Tooltip>
            ) : (
              logoutButton
            )}
          </div>
        </div>

        {/* Edge toggle control button */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "absolute top-1/2 -right-3.5 z-40 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-sidebar-border bg-background/95 text-sidebar-foreground/70 shadow-md ring-1 ring-black/5 backdrop-blur-sm transition-all duration-300 hover:text-foreground hover:bg-sidebar-accent hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "opacity-0 group-hover/sidebar:opacity-100"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="size-4 text-sidebar-foreground" />
          ) : (
            <ChevronLeft className="size-4 text-sidebar-foreground" />
          )}
        </button>
      </aside>
    </TooltipProvider>
  )
}
