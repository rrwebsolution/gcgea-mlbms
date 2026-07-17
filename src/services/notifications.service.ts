import type { AppNotification } from "@/types"
import { simulateDelay } from "./http"
import { MOCK_NOTIFICATIONS } from "./mock-data/notifications"

let notifications: AppNotification[] = [...MOCK_NOTIFICATIONS]

export async function listNotifications(): Promise<AppNotification[]> {
  return simulateDelay(notifications, 200)
}

export async function markNotificationRead(id: string): Promise<void> {
  notifications = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
  await simulateDelay(null, 150)
}

export async function markAllNotificationsRead(): Promise<void> {
  notifications = notifications.map((n) => ({ ...n, isRead: true }))
  await simulateDelay(null, 200)
}
