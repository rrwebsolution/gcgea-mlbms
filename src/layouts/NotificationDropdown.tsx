import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/services/notifications.service"
import { formatDateTime } from "@/utils/format"
import { cn } from "@/lib/utils"
import { useHeaderDropdownSlot } from "@/contexts/HeaderDropdownContext"

export function NotificationDropdown() {
  const [open, setOpen] = useHeaderDropdownSlot("notifications")
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
  const unreadCount = notifications.filter((n) => !n.isRead).length
  const [markingId, setMarkingId] = React.useState<string | null>(null)
  const [isMarkingAllRead, setIsMarkingAllRead] = React.useState(false)

  async function handleMarkRead(id: string) {
    setMarkingId(id)
    try {
      await markNotificationRead(id)
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    } finally {
      setMarkingId(null)
    }
  }

  async function openNotification(notification: (typeof notifications)[number]) {
    if (!notification.isRead) await handleMarkRead(notification.id)
    setOpen(false)
    if (notification.link) navigate(notification.link)
  }

  async function handleMarkAllRead() {
    setIsMarkingAllRead(true)
    try {
      await markAllNotificationsRead()
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    } finally {
      setIsMarkingAllRead(false)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen)
      if (nextOpen) void refetch()
    }}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications" />
        }
      >
        <Bell className="size-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[0.6rem] font-semibold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" disabled={isMarkingAllRead} onClick={handleMarkAllRead}>
              {isMarkingAllRead ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCheck className="size-3.5" />}
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading notifications…</div>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">You're all caught up.</p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(n)}
                    disabled={markingId === n.id}
                    className={cn(
                      "flex w-full flex-col gap-0.5 border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/60 disabled:opacity-60",
                      !n.isRead && "bg-primary/5"
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {markingId === n.id ? (
                        <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
                      ) : (
                        !n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                      <span className="text-sm font-medium text-foreground">{n.title}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{n.message}</span>
                    <span className="text-[0.65rem] text-muted-foreground/70">{formatDateTime(n.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full" render={<Link to="/notifications" />}>
            View All Notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
