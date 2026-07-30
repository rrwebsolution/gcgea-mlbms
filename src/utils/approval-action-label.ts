/** Humanizes a raw approval-workflow action verb (as stored on ApprovalAction/ApprovalInstance
 *  rows on the backend) into the past-tense label a user should actually read — e.g. "review"
 *  performed by a Loan Officer already happened, so it should read "Reviewed", not "Review". */
const APPROVAL_ACTION_LABELS: Record<string, string> = {
  review: "Reviewed",
  approve: "Approved",
  reject: "Rejected",
  return: "Returned for Revision",
  release: "Released",
  submitted: "Submitted",
  resubmitted: "Resubmitted",
  auto_approved: "Auto-Approved",
  draft_created: "Draft Created",
  draft_updated: "Draft Updated",
  pending: "Pending",
}

export function approvalActionLabel(action: string): string {
  return APPROVAL_ACTION_LABELS[action] ?? action
}
