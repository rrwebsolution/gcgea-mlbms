export type MemberApproverAssignmentType = "user" | "role" | "workflow"

export interface MembershipApprovalSetting {
  id: string
  manualRegistrationRequiresApproval: boolean
  importedMembersRequireApproval: boolean
  approverAssignmentType: MemberApproverAssignmentType
  defaultApproverUserId?: string | null
  defaultApproverRoleId?: string | null
  approvalWorkflowId?: string | null
  preventSelfApproval: boolean
  autoApproveRequiresPermission: boolean
}
