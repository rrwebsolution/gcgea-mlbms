import * as React from "react"
import { queryClient } from "@/lib/query-client"

interface PageRefreshContextValue {
  isRefreshing: boolean
  refresh: () => Promise<void>
}

const PageRefreshContext = React.createContext<PageRefreshContextValue>({
  isRefreshing: false,
  refresh: async () => undefined,
})

export function PageRefreshProvider({ children }: { children: React.ReactNode }) {
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const refresh = React.useCallback(async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      await queryClient.refetchQueries({ type: "active" }, { throwOnError: true })
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing])

  const value = React.useMemo(() => ({ isRefreshing, refresh }), [isRefreshing, refresh])
  return <PageRefreshContext.Provider value={value}>{children}</PageRefreshContext.Provider>
}

export function usePageRefresh() {
  return React.useContext(PageRefreshContext)
}
