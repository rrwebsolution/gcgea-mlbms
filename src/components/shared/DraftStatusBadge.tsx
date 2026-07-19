import { StatusBadge } from "@/components/shared/StatusBadge"
import type { StatusTone } from "@/constants/status"

const DRAFT_STATUS_TONE: Record<string, StatusTone> = {
  Draft: "warning",
  Submitted: "info",
  "Under Review": "info",
  "For Approval": "info",
  Approved: "success",
  Rejected: "danger",
  Released: "success",
  Active: "success",
  "Fully Paid": "success",
  Completed: "success",
  Cancelled: "neutral",
}

/** Thin wrapper around StatusBadge specialized for draft/application lifecycle statuses. */
export function DraftStatusBadge({ status, className }: { status: string; className?: string }) {
  return <StatusBadge label={status} tone={DRAFT_STATUS_TONE[status] ?? "neutral"} className={className} />
}
