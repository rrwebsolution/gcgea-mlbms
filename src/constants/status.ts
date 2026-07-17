export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info" | "gold"

export const LOAN_STATUS_TONE: Record<string, StatusTone> = {
  Draft: "neutral",
  Submitted: "info",
  "Under Review": "info",
  "For Approval": "warning",
  Approved: "success",
  Rejected: "danger",
  Released: "success",
  Active: "info",
  "Fully Paid": "success",
  Cancelled: "neutral",
  Overdue: "danger",
  Restructured: "gold",
}

export const BENEFIT_STATUS_TONE: Record<string, StatusTone> = {
  Draft: "neutral",
  Submitted: "info",
  "Under Review": "info",
  "For Approval": "warning",
  Approved: "success",
  Rejected: "danger",
  Released: "success",
  Completed: "success",
  Cancelled: "neutral",
}

export const MEMBERSHIP_STATUS_TONE: Record<string, StatusTone> = {
  Active: "success",
  Inactive: "neutral",
  Suspended: "warning",
  Terminated: "danger",
  Deceased: "neutral",
}

export const CONTRIBUTION_STATUS_TONE: Record<string, StatusTone> = {
  Posted: "success",
  Voided: "danger",
}

export const PAYMENT_STATUS_TONE: Record<string, StatusTone> = {
  Posted: "success",
  Voided: "danger",
}

export const AMORTIZATION_STATUS_TONE: Record<string, StatusTone> = {
  Upcoming: "neutral",
  "Partially Paid": "warning",
  Paid: "success",
  Overdue: "danger",
  Waived: "gold",
}

export const USER_STATUS_TONE: Record<string, StatusTone> = {
  Active: "success",
  Inactive: "neutral",
  Disabled: "danger",
}

export const OFFICE_STATUS_TONE: Record<string, StatusTone> = {
  Active: "success",
  Inactive: "neutral",
}
