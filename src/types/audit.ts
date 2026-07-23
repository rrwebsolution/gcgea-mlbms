export interface AuditLog {
  id: string
  dateTime: string
  userName: string
  roleName: string
  module: string
  action: string
  recordReference: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  ipAddress: string
  device: string
  status: "Success" | "Failed"
}

export type NotificationType =
  | "approval_pending"
  | "loan_submitted"
  | "loan_for_approval"
  | "loan_approved"
  | "loan_rejected"
  | "loan_released"
  | "payment_due"
  | "payment_overdue"
  | "benefit_for_approval"
  | "benefit_approved"
  | "benefit_rejected"
  | "benefit_released"
  | "import_failed"
  | "incomplete_profile"
  | "user_account_change"

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  createdAt: string
  link?: string
  subjectType?: string
  subjectId?: string
}
