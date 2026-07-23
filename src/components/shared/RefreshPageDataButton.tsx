import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { usePageRefresh } from "@/contexts/PageRefreshContext"

export function RefreshPageDataButton() {
  const { isRefreshing, refresh } = usePageRefresh()

  async function refreshPageData() {
    if (isRefreshing) return
    try {
      await refresh()
      toast.success("Page data refreshed.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to refresh page data.")
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-9 gap-2 px-2 sm:px-3"
      disabled={isRefreshing}
      onClick={refreshPageData}
      aria-label="Refresh current page data"
      title="Refresh current page data"
    >
      <RefreshCw className={isRefreshing ? "size-4 animate-spin" : "size-4"} />
      <span className="hidden text-xs font-medium md:inline">
        {isRefreshing ? "Refreshing..." : "Refresh Data"}
      </span>
    </Button>
  )
}
