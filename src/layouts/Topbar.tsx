import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GlobalSearch } from "@/layouts/GlobalSearch"
import { NotificationDropdown } from "@/layouts/NotificationDropdown"
import { ThemeSelector } from "@/components/shared/ThemeSelector"
import { UserMenu } from "@/layouts/UserMenu"
import { AppBreadcrumbs } from "@/components/shared/AppBreadcrumbs"
import { useSidebar } from "@/contexts/SidebarContext"
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs"
import { HeaderDropdownProvider } from "@/contexts/HeaderDropdownContext"

export function Topbar() {
  const { setMobileOpen } = useSidebar()
  const breadcrumbs = useBreadcrumbs()

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-lg shadow-sm">
      <HeaderDropdownProvider>
        <div className="grid h-14 grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-6">
          
          {/* Left Slot: Mobile Navigation Trigger */}
          <div className="flex min-w-0 items-center gap-2 justify-self-start lg:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:bg-accent/80 active:scale-95 transition-all duration-200" 
              onClick={() => setMobileOpen(true)} 
              aria-label="Open navigation menu"
            >
              <Menu className="size-5 text-muted-foreground" />
            </Button>
          </div>

          {/* Center Slot: Focused Search Box */}
          <div className="flex min-w-0 justify-center">
            <div className="w-full max-w-md transition-all duration-200">
              <GlobalSearch />
            </div>
          </div>

          {/* Right Slot: Action Utilities */}
          <div className="flex shrink-0 items-center gap-2 justify-self-end sm:gap-3">
            <ThemeSelector />
            <NotificationDropdown />
            <UserMenu />
          </div>

        </div>
      </HeaderDropdownProvider>

      {/* Structured Sub-Header Breadcrumb Ribbon */}
      {breadcrumbs.length > 0 && (
        <div className="border-t border-border/40 bg-muted/25 px-4 py-2 sm:px-6 transition-all duration-300">
          <AppBreadcrumbs items={breadcrumbs} />
        </div>
      )}
    </header>
  )
}