import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, HardDrive, Loader2, LogOut } from "lucide-react"
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

  // Storage calculations
  const percentUsed = storageUsage && storageUsage.totalBytes > 0 
    ? (storageUsage.usedBytes / storageUsage.totalBytes) * 100 
    : 0
  const isDanger = percentUsed >= 90
  const isWarning = !isDanger && percentUsed >= 75

  const logoutButton = (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "group/btn relative w-full overflow-hidden rounded-xl font-medium transition-all duration-300",
        "text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 active:scale-[0.98]",
        isCollapsed ? "h-10 w-10 justify-center p-0 mx-auto" : "h-10 justify-start px-3 gap-3"
      )}
      onClick={handleLogout}
      disabled={isLoggingOut}
      aria-label="Logout"
    >
      {isLoggingOut ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-destructive" aria-hidden="true" />
      ) : (
        <LogOut 
          className="size-4 shrink-0 transition-transform duration-300 group-hover/btn:-translate-x-0.5 group-hover/btn:rotate-[-6deg]" 
          aria-hidden="true" 
        />
      )}
      {!isCollapsed && <span className="truncate text-xs font-semibold tracking-wide">Log out</span>}
    </Button>
  )

  return (
    <TooltipProvider delay={150}>
      <aside
        className={cn(
          "group/sidebar relative sticky top-0 hidden h-svh shrink-0 flex-col",
          "border-r border-sidebar-border/60 bg-sidebar/95 backdrop-blur-2xl text-sidebar-foreground",
          "shadow-[1px_0_24px_rgba(0,0,0,0.03)] dark:shadow-[1px_0_24px_rgba(0,0,0,0.2)]",
          "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:flex z-30",
          isCollapsed ? "w-[76px]" : "w-[272px]"
        )}
      >
        {/* Brand Header */}
        <div 
          className={cn(
            "relative flex h-16 shrink-0 items-center border-b border-sidebar-border/40 transition-all duration-300",
            "bg-gradient-to-b from-sidebar-accent/25 via-transparent to-transparent",
            isCollapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          <SidebarBrand collapsed={isCollapsed} />
        </div>

        {/* Navigation Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 scrollbar-thin scrollbar-thumb-sidebar-border/60 scrollbar-track-transparent">
          <SidebarNav collapsed={isCollapsed} />
        </div>

        {/* Footer Area */}
        <div className="relative shrink-0 border-t border-sidebar-border/40 bg-sidebar-accent/10 p-3 flex flex-col gap-2.5 backdrop-blur-md">
          {/* Association Footer Logos */}
          {footerBranding.showSidebarFooterLogos && (
            <div
              className={cn(
                "rounded-xl border border-sidebar-border/40 bg-sidebar-accent/20 transition-all duration-300",
                isCollapsed 
                  ? "flex flex-col items-center gap-2 p-1.5 bg-transparent border-transparent" 
                  : "grid grid-cols-2 gap-2 p-2"
              )}
              aria-label="Association logos"
            >
              {[
                { src: footerBranding.sidebarFooterLeftLogoUrl, label: footerBranding.sidebarFooterLeftLogoLabel },
                { src: footerBranding.sidebarFooterRightLogoUrl, label: footerBranding.sidebarFooterRightLogoLabel },
              ].map((logo, index) => (
                <div
                  key={index}
                  className="group/logo flex min-w-0 flex-col items-center gap-1.5 transition-transform duration-200 hover:scale-[1.02]"
                >
                  <div className="relative flex items-center justify-center rounded-lg bg-background/80 p-1.5 shadow-xs ring-1 ring-border/20 backdrop-blur-xs transition-shadow duration-200 group-hover/logo:shadow-sm">
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
                              ? "size-9"
                              : "size-7"
                      )}
                    />
                  </div>
                  {!isCollapsed && (
                    <span className="w-full truncate text-center text-[9px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                      {logo.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Storage Meter */}
          {storageUsage && (
            isCollapsed ? (
              <Tooltip>
                <TooltipTrigger
                  render={(
                    <div className="flex size-10 mx-auto items-center justify-center rounded-xl border border-sidebar-border/50 bg-sidebar-accent/25 hover:bg-sidebar-accent/40 transition-colors cursor-pointer" />
                  )}
                >
                  <HardDrive className={cn(
                    "size-4 transition-colors",
                    isDanger ? "text-destructive" : isWarning ? "text-amber-500" : "text-sidebar-foreground/70"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="right" align="center" className="text-xs p-2.5">
                  <p className="font-semibold mb-1">Storage Usage ({percentUsed.toFixed(0)}%)</p>
                  <p className="text-muted-foreground text-[11px]">
                    {formatBytes(storageUsage.usedBytes)} / {formatBytes(storageUsage.totalBytes)}
                  </p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="relative overflow-hidden rounded-xl border border-sidebar-border/50 bg-sidebar-accent/20 p-2.5 shadow-2xs backdrop-blur-xs transition-all duration-200 hover:border-sidebar-border/80">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-sidebar-foreground/75">
                    <span className={cn(
                      "size-1.5 rounded-full animate-pulse",
                      isDanger ? "bg-destructive" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                    )} />
                    <span className="font-semibold tracking-tight">Disk Usage</span>
                  </div>
                  <span className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-bold font-mono tracking-tight",
                    isDanger 
                      ? "bg-destructive/15 text-destructive" 
                      : isWarning 
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" 
                        : "bg-sidebar-accent/50 text-sidebar-foreground/70"
                  )}>
                    {percentUsed.toFixed(0)}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-sidebar-border/40 p-[1px]">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-out",
                      isDanger 
                        ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" 
                        : isWarning 
                          ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" 
                          : "bg-primary shadow-[0_0_8px_var(--color-primary)]"
                    )}
                    style={{
                      width: `${storageUsage.usedBytes > 0 ? Math.max(3, Math.min(100, percentUsed)) : 0}%`,
                    }}
                  />
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium text-sidebar-foreground/55 font-mono">
                  <span>{formatBytes(storageUsage.usedBytes)}</span>
                  <span>{formatBytes(storageUsage.totalBytes)}</span>
                </div>
              </div>
            )
          )}

          {/* Logout Action */}
          <div className="w-full">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger render={logoutButton} />
                <TooltipContent side="right" align="center" className="font-medium text-xs">
                  Log out
                </TooltipContent>
              </Tooltip>
            ) : (
              logoutButton
            )}
          </div>
        </div>

        {/* Sleek Edge Collapse Toggle Button */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "absolute top-1/2 -right-3.5 z-40 flex size-7 -translate-y-1/2 items-center justify-center rounded-full",
            "border border-border/80 bg-background text-foreground/70 shadow-md ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-md",
            "transition-all duration-200 hover:scale-110 hover:text-foreground hover:bg-accent active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "opacity-0 group-hover/sidebar:opacity-100 focus-visible:opacity-100"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="size-3.5" strokeWidth={2.5} />
          ) : (
            <ChevronLeft className="size-3.5" strokeWidth={2.5} />
          )}
        </button>
      </aside>
    </TooltipProvider>
  )
}
