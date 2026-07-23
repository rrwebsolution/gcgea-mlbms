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

export type WorkflowModuleKey = "member_registration" | "loan_application" | "benefit_application"

export interface WorkflowDefinition {
  id: string
  moduleKey: WorkflowModuleKey
  label: string
  isEnabled: boolean
  stages: WorkflowStage[]
}
