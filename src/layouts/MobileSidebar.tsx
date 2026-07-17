import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SidebarNav } from "@/layouts/SidebarNav"
import { SidebarBrand } from "@/layouts/SidebarBrand"
import { useSidebar } from "@/contexts/SidebarContext"

export function MobileSidebar() {
  const { isMobileOpen, setMobileOpen } = useSidebar()

  return (
    <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
        <SheetHeader className="border-b border-sidebar-border">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SidebarBrand onNavigate={() => setMobileOpen(false)} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pb-4">
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
