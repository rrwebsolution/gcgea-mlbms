import { Outlet } from "react-router-dom"
import { SidebarProvider } from "@/contexts/SidebarContext"
import { BreadcrumbProvider } from "@/contexts/BreadcrumbContext"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Sidebar } from "@/layouts/Sidebar"
import { MobileSidebar } from "@/layouts/MobileSidebar"
import { Topbar } from "@/layouts/Topbar"
import { Footer } from "@/layouts/Footer"
import { SessionExpiredModal } from "@/layouts/SessionExpiredModal"

export function AppLayout() {
  return (
    <SidebarProvider>
      <BreadcrumbProvider>
        <TooltipProvider delay={200}>
          <div className="flex min-h-svh bg-muted/30">
            <Sidebar />
            <MobileSidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar />
              <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
                <Outlet />
              </main>
              <Footer />
            </div>
          </div>
          <SessionExpiredModal />
        </TooltipProvider>
      </BreadcrumbProvider>
    </SidebarProvider>
  )
}
