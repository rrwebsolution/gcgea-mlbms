import * as React from "react"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { getAppearance } from "@/services/settings.service"
import type { AppearanceSettings } from "@/types"

interface SidebarContextValue {
  isCollapsed: boolean
  toggleCollapsed: () => void
  isMobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(() =>
    readStorage<boolean>(STORAGE_KEYS.sidebarCollapsed, getAppearance().sidebarStyle === "collapsed")
  )
  const [isMobileOpen, setMobileOpen] = React.useState(false)

  React.useEffect(() => {
    function handleAppearanceChange(event: Event) {
      const value = (event as CustomEvent<AppearanceSettings>).detail
      const collapsed = value.sidebarStyle === "collapsed"
      setIsCollapsed(collapsed)
      writeStorage(STORAGE_KEYS.sidebarCollapsed, collapsed)
    }
    window.addEventListener("gcgea:appearance-changed", handleAppearanceChange)
    return () => window.removeEventListener("gcgea:appearance-changed", handleAppearanceChange)
  }, [])

  const toggleCollapsed = React.useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev
      writeStorage(STORAGE_KEYS.sidebarCollapsed, next)
      return next
    })
  }, [])

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      isCollapsed,
      toggleCollapsed,
      isMobileOpen,
      setMobileOpen,
    }),
    [isCollapsed, toggleCollapsed, isMobileOpen]
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebar(): SidebarContextValue {
  const ctx = React.useContext(SidebarContext)
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider")
  return ctx
}
