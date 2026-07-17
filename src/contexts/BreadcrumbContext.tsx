import * as React from "react"

interface BreadcrumbContextValue {
  extra: string | null
  setExtra: (label: string | null) => void
}

const BreadcrumbContext = React.createContext<BreadcrumbContextValue | undefined>(undefined)

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [extra, setExtra] = React.useState<string | null>(null)
  const value = React.useMemo(() => ({ extra, setExtra }), [extra])
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>
}

export function useBreadcrumbContext(): BreadcrumbContextValue {
  const ctx = React.useContext(BreadcrumbContext)
  if (!ctx) throw new Error("useBreadcrumbContext must be used within a BreadcrumbProvider")
  return ctx
}

/** Sets a trailing breadcrumb label (e.g. a member's name) for the current route, clearing it on unmount. */
export function useBreadcrumbExtra(label: string | null | undefined) {
  const { setExtra } = useBreadcrumbContext()
  React.useEffect(() => {
    setExtra(label ?? null)
    return () => setExtra(null)
  }, [label, setExtra])
}
