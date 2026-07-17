import type { AppNotification } from "@/types"

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: "ntf-01", type: "loan_for_approval", title: "Loan awaiting approval", message: "Loan application GCGEA-LN-2026-000005 for Ronaldo B. Flores is awaiting your approval.", isRead: false, createdAt: "2026-07-17T07:45:00", link: "/loans/loan-05" },
  { id: "ntf-02", type: "benefit_for_approval", title: "Benefit awaiting approval", message: "Benefit application GCGEA-BEN-2026-000006 for Nenita V. Estabillo is awaiting your approval.", isRead: false, createdAt: "2026-07-17T07:30:00", link: "/benefits/ben-06" },
  { id: "ntf-03", type: "payment_overdue", title: "Overdue loan account", message: "Loan GCGEA-LN-2023-000007 for Domingo S. Ibarra is now overdue.", isRead: false, createdAt: "2026-07-16T16:00:00", link: "/loans/loan-07" },
  { id: "ntf-04", type: "loan_submitted", title: "New loan submitted", message: "Michael S. Dagooc submitted a new Emergency Loan application.", isRead: false, createdAt: "2026-07-16T10:20:00", link: "/loans/loan-03" },
  { id: "ntf-05", type: "incomplete_profile", title: "Incomplete member record", message: "Member profile for Katherine S. Rasonabe is missing required contact details.", isRead: true, createdAt: "2026-07-15T09:00:00", link: "/members/mem-18" },
  { id: "ntf-06", type: "loan_released", title: "Loan released", message: "Loan GCGEA-LN-2026-000006 for Purificacion L. Gimena has been released.", isRead: true, createdAt: "2026-07-14T14:12:00", link: "/loans/loan-06" },
  { id: "ntf-07", type: "benefit_released", title: "Benefit released", message: "Benefit application GCGEA-BEN-2026-000011 for Leah A. Tabada has been released.", isRead: true, createdAt: "2026-07-13T11:05:00", link: "/benefits/ben-11" },
  { id: "ntf-08", type: "payment_due", title: "Upcoming payment due", message: "5 loan accounts have amortizations due within the next 7 days.", isRead: true, createdAt: "2026-07-12T08:00:00", link: "/loans" },
  { id: "ntf-09", type: "loan_approved", title: "Loan approved", message: "Loan application GCGEA-LN-2025-000004 for Nenita V. Estabillo has been approved.", isRead: true, createdAt: "2026-07-10T15:30:00", link: "/loans/loan-04" },
  { id: "ntf-10", type: "user_account_change", title: "User account updated", message: "Role assignment for Michael Angelo R. Densing was changed to Inactive.", isRead: true, createdAt: "2026-07-08T13:40:00", link: "/admin/users" },
]
