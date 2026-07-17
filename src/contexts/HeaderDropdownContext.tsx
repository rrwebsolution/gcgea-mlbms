import * as React from "react"

type HeaderDropdownId = "search" | "notifications" | "profile" | null

interface HeaderDropdownContextValue {
  openId: HeaderDropdownId
  setOpenId: (id: HeaderDropdownId) => void
}

const HeaderDropdownContext = React.createContext<HeaderDropdownContextValue | undefined>(undefined)

/** Ensures only one header overlay (search, notifications, profile) is open at a time. */
export function HeaderDropdownProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = React.useState<HeaderDropdownId>(null)
  const value = React.useMemo(() => ({ openId, setOpenId }), [openId])
  return <HeaderDropdownContext.Provider value={value}>{children}</HeaderDropdownContext.Provider>
}

export function useHeaderDropdown(): HeaderDropdownContextValue {
  const ctx = React.useContext(HeaderDropdownContext)
  if (!ctx) throw new Error("useHeaderDropdown must be used within a HeaderDropdownProvider")
  return ctx
}

/** Convenience hook for a single dropdown: returns its open state plus a setter that claims/releases the shared slot. */
export function useHeaderDropdownSlot(id: Exclude<HeaderDropdownId, null>) {
  const { openId, setOpenId } = useHeaderDropdown()
  const open = openId === id
  const setOpen = React.useCallback((next: boolean) => setOpenId(next ? id : null), [id, setOpenId])
  return [open, setOpen] as const
}
