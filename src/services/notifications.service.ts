import type { AppNotification } from "@/types"
import { api } from "@/lib/api"
import { getSettings } from "@/services/settings.service"

interface NotificationApiRecord {
  id: string
  type: AppNotification["type"]
  title: string | null
  message: string | null
  link: string | null
  subjectType: string | null
  subjectId: string | null
  readAt: string | null
  createdAt: string | null
}

export async function listNotifications(): Promise<AppNotification[]> {
  const { data } = await api.get<{ data: NotificationApiRecord[] }>("/notifications", { params: { perPage: 100 } })
  const settings = getSettings().notification
  if (!settings.inAppNotifications) return []

  return data.data
    .map((record) => ({
      id: record.id,
      type: record.type,
      title: record.title ?? "System notification",
      message: record.message ?? "",
      isRead: Boolean(record.readAt),
      createdAt: record.createdAt ?? new Date().toISOString(),
      link: record.link ?? undefined,
      subjectType: record.subjectType ?? undefined,
      subjectId: record.subjectId ?? undefined,
    }))
    .filter((notification) => {
      if (notification.type === "approval_pending") {
        if (["loans", "loan_application"].includes(notification.subjectType ?? "")) return settings.loanApprovalAlerts
        if (["benefits", "benefit_application"].includes(notification.subjectType ?? "")) return settings.benefitApprovalAlerts
        return settings.userAccountAlerts
      }
      if (["loan_submitted", "loan_for_approval", "loan_approved", "loan_rejected", "loan_released"].includes(notification.type)) return settings.loanApprovalAlerts
      if (notification.type === "payment_due") return settings.loanDueDateAlerts
      if (notification.type === "payment_overdue") return settings.overdueLoanAlerts
      if (["benefit_for_approval", "benefit_approved", "benefit_rejected", "benefit_released"].includes(notification.type)) return settings.benefitApprovalAlerts
      if (notification.type === "import_failed") return settings.contributionImportAlerts
      if (notification.type === "incomplete_profile") return settings.incompleteProfileAlerts
      if (notification.type === "user_account_change") return settings.userAccountAlerts
      return true
    })
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/notifications/read-all")
}
