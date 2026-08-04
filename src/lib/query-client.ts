import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Event-driven freshness: successful mutations trigger a system-wide
      // refresh below. Between writes, cached reads stay stable and do not
      // reload merely because the user focuses the browser window.
      staleTime: Number.POSITIVE_INFINITY,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
})

const DATA_CHANGED_CHANNEL = "gcgea:data-changed"
const dataChangedChannel = typeof BroadcastChannel !== "undefined"
  ? new BroadcastChannel(DATA_CHANGED_CHANNEL)
  : null
let refreshTimer: ReturnType<typeof setTimeout> | undefined
const pendingDomains = new Set<string>()

function refreshAffectedData(domains: string[]): void {
  domains.forEach((domain) => pendingDomains.add(domain))
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    refreshTimer = undefined
    pendingDomains.clear()

    // A mutation can affect summaries, approval queues, reports, picklists,
    // permissions, and related records outside its own URL namespace. Since
    // queries intentionally use an infinite stale time, targeted invalidation
    // can otherwise leave an already-cached page unchanged after an edit.
    //
    // Refetch everything currently visible, and discard inactive snapshots so
    // they perform a clean request when the user returns to those pages.
    queryClient.removeQueries({ type: "inactive" })
    void queryClient.invalidateQueries({ type: "active", refetchType: "active" })

    // ["lookups"] (roles/users/offices/loan-types/benefit-types/deduction-types/loan-settings,
    // see services/lookups.service.ts) has no direct useQuery observer of its own — it's only
    // reached through the imperative fetchQuery() calls inside listAllRoles()/getLoanSettings()/
    // etc. — so the "active" filter above never catches it. Invalidate it unconditionally so
    // edits to any of those 7 domains are picked up on next read instead of staying cached
    // until a full reload.
    void queryClient.invalidateQueries({ queryKey: ["lookups"] })
  }, 150)
}

// Called only after successful write requests. Closely grouped writes (for
// example, saving several Benefit Settings records) collapse into one refresh.
export function notifySystemDataChanged(domain: string): void {
  refreshAffectedData([domain])
  dataChangedChannel?.postMessage({ domain })
}

// Synchronize affected data in other tabs without periodic API polling.
if (dataChangedChannel) {
  dataChangedChannel.onmessage = (event: MessageEvent<{ domain?: string }>) => {
    if (event.data?.domain) refreshAffectedData([event.data.domain])
  }
}
