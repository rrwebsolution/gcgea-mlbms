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
    <header className="sticky top-0 z-30 w-full">
      {/* Soft background separation */}
      <div className="absolute inset-0 -z-10 border-b border-border/60 bg-background/80 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/70" />

      <HeaderDropdownProvider>
        <div className="relative grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 sm:gap-5 sm:px-6 lg:px-8">
          {/* Mobile menu */}
          <div className="flex items-center justify-self-start lg:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 rounded-xl border border-transparent text-muted-foreground transition-all duration-200 hover:border-border/60 hover:bg-accent hover:text-foreground active:scale-95"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="size-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="flex min-w-0 justify-center">
            <div className="w-full max-w-xl rounded-xl bg-muted/30 ring-1 ring-border/50 transition-all duration-200 hover:bg-muted/45 hover:ring-border focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20">
              <GlobalSearch />
            </div>
          </div>

          {/* Utilities */}
          <div className="flex shrink-0 items-center justify-self-end">
            <div className="flex items-center gap-1 rounded-2xl border border-border/60 bg-background/70 p-1 shadow-sm sm:gap-1.5">
              <ThemeSelector />

              <div
                aria-hidden="true"
                className="mx-0.5 hidden h-5 w-px bg-border/70 sm:block"
              />

              <NotificationDropdown />

              <div
                aria-hidden="true"
                className="mx-0.5 hidden h-5 w-px bg-border/70 sm:block"
              />

              <UserMenu />
            </div>
          </div>
        </div>
      </HeaderDropdownProvider>

      {/* Breadcrumb ribbon */}
      {breadcrumbs.length > 0 && (
        <nav
          className="border-t border-border/40 bg-gradient-to-r from-muted/35 via-muted/20 to-transparent px-4 py-2 sm:px-6 lg:px-8"
          aria-label="Breadcrumb"
        >
          <div className="mx-auto w-full">
            <AppBreadcrumbs items={breadcrumbs} />
          </div>
        </nav>
      )}

      {/* Bottom accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </header>
  )
}
