import type { PermissionCode } from "./permission"

export type ApproverType = "role" | "user" | "office"

export type StageType = "review" | "approve" | "release"

export interface WorkflowStage {
  id: string
  sequence: number
  code: string
  label: string
  stageType: StageType
  approverType: ApproverType
  approverRoleId?: string
  approverRoleName?: string
  approverUserId?: string
  approverUserName?: string
  approverOfficeId?: string
  approverOfficeName?: string
  requiredPermissionCode?: PermissionCode
  isFinal: boolean
}

export type WorkflowModuleKey = "member_registration" | "loan_application" | "benefit_application" | "annual_budget" | "disbursement"

/** The implicit "step 0" every workflow starts with — the creator submitting the record.
 *  Not a row in workflow_stages (it isn't an approver step and isn't configurable), so it's
 *  read-only display data, never sent back through the stages update endpoint. */
export interface WorkflowSubmissionStage {
  sequence: number
  code: string
  label: string
  description: string
}

export interface WorkflowDefinition {
  id: string
  moduleKey: WorkflowModuleKey
  label: string
  isEnabled: boolean
  submissionStage: WorkflowSubmissionStage
  stages: WorkflowStage[]
}
