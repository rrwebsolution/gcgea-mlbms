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
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
      <HeaderDropdownProvider>
        <div className="grid h-14 grid-cols-[auto_1fr_auto] items-center gap-2 px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2 justify-self-start">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu">
              <Menu />
            </Button>
          </div>

          <div className="flex min-w-0 justify-center">
            <GlobalSearch />
          </div>

          <div className="flex shrink-0 items-center gap-1 justify-self-end sm:gap-1.5">
            <ThemeSelector />
            <NotificationDropdown />
            <UserMenu />
          </div>
        </div>
      </HeaderDropdownProvider>
      {breadcrumbs.length > 0 && (
        <div className="border-t border-border/60 px-4 py-1.5 sm:px-6">
          <AppBreadcrumbs items={breadcrumbs} />
        </div>
      )}
    </header>
  )
}
