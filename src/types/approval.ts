import type { StageType } from "./approval-workflow"

export type ApprovalSubjectType = "members" | "loans" | "benefits"

export type MyApprovalTab = "pending" | "approved" | "rejected" | "returned" | "released"

export type ApprovalAction = "review" | "approve" | "reject" | "return" | "release"

export interface MyApprovalItem {
  id: string
  subjectType: ApprovalSubjectType
  subjectId: string
  reference?: string
  title: string
  memberName?: string
  module?: string
  currentStageLabel?: string
  currentStageType?: StageType
  submittedAt?: string
  actedAt?: string
  status: string
}

export interface ActOnApprovalInput {
  action: ApprovalAction
  remarks?: string
  extra?: Record<string, unknown>
}
