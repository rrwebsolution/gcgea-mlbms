import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/services/notifications.service"
import { formatDateTime } from "@/utils/format"
import { cn } from "@/lib/utils"

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [unreadOnly, setUnreadOnly] = React.useState(false)
  const [markingId, setMarkingId] = React.useState<string | null>(null)
  const [isMarkingAllRead, setIsMarkingAllRead] = React.useState(false)
  const { data: notifications = [] } = useQuery({ queryKey: ["notifications"], queryFn: listNotifications, refetchInterval: 30_000, refetchOnWindowFocus: true })

  const filtered = unreadOnly ? notifications.filter((n) => !n.isRead) : notifications
  const unreadCount = notifications.filter((n) => !n.isRead).length

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
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        description="System alerts and updates relevant to your role."
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" disabled={isMarkingAllRead} onClick={handleMarkAllRead}>
              {isMarkingAllRead ? <Loader2 className="animate-spin" /> : <CheckCheck />}
              Mark all as read
            </Button>
          ) : undefined
        }
      />
      <div className="flex items-center gap-2">
        <Switch id="unread-only" checked={unreadOnly} onCheckedChange={setUnreadOnly} />
        <Label htmlFor="unread-only">Show unread only</Label>
      </div>
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {filtered.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up." className="border-none" />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openNotification(n)}
                  disabled={markingId === n.id}
                  className={cn("flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-60", !n.isRead && "bg-primary/5")}
                >
                  <span className="flex items-center gap-2">
                    {markingId === n.id ? (
                      <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
                    ) : (
                      !n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                    <span className="text-sm font-medium text-foreground">{n.title}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">{n.message}</span>
                  <span className="text-xs text-muted-foreground/70">{formatDateTime(n.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
