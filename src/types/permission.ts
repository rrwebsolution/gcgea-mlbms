export type PermissionCode =
  | "dashboard.view"
  | "members.view"
  | "members.create"
  | "members.update"
  | "members.archive"
  | "members.restore"
  | "members.import"
  | "members.export"
  | "members.print"
  | "beneficiaries.view"
  | "beneficiaries.create"
  | "beneficiaries.update"
  | "beneficiaries.delete"
  | "offices.view"
  | "offices.create"
  | "offices.update"
  | "offices.activate"
  | "offices.deactivate"
  | "contributions.view"
  | "contributions.create"
  | "contributions.update"
  | "contributions.void"
  | "contributions.bulk_create"
  | "contributions.import"
  | "contributions.replace_duplicate"
  | "contributions.export"
  | "contributions.print"
  | "loans.view"
  | "loans.create"
  | "loans.update"
  | "loans.submit"
  | "loans.review"
  | "loans.recommend"
  | "loans.approve"
  | "loans.reject"
  | "loans.release"
  | "loans.cancel"
  | "loans.restructure"
  | "loans.override_eligibility"
  | "loans.print"
  | "loans.export"
  | "loan_payments.view"
  | "loan_payments.create"
  | "loan_payments.update"
  | "loan_payments.void"
  | "loan_payments.import"
  | "loan_payments.print_receipt"
  | "loan_payments.export"
  | "benefits.view"
  | "benefits.create"
  | "benefits.update"
  | "benefits.submit"
  | "benefits.review"
  | "benefits.approve"
  | "benefits.reject"
  | "benefits.release"
  | "benefits.cancel"
  | "benefits.override_eligibility"
  | "benefits.print"
  | "benefits.export"
  | "reports.view"
  | "reports.export"
  | "reports.print"
  | "reports.financial"
  | "reports.audit"
  | "reports.member"
  | "reports.loan"
  | "reports.benefit"
  | "reports.contribution"
  | "users.view"
  | "users.create"
  | "users.update"
  | "users.activate"
  | "users.deactivate"
  | "users.reset_password"
  | "users.assign_role"
  | "users.assign_permissions"
  | "users.view_login_history"
  | "roles.view"
  | "roles.create"
  | "roles.update"
  | "roles.duplicate"
  | "roles.delete"
  | "roles.assign_permissions"
  | "roles.view_users"
  | "audit_logs.view"
  | "audit_logs.export"
  | "audit_logs.view_sensitive_changes"
  | "settings.view"
  | "settings.update"
  | "settings.general"
  | "settings.organization"
  | "settings.numbering"
  | "settings.loan"
  | "settings.contribution"
  | "settings.benefit"
  | "settings.notification"
  | "settings.security"
  | "settings.backup"
  | "settings.appearance"

export interface Permission {
  code: PermissionCode
  label: string
  group: string
  description: string
}

export type RoleName =
  | "Super Administrator"
  | "Membership Officer"
  | "Loan Officer"
  | "Treasurer"
  | "Benefits Officer"
  | "Approving Officer"
  | "Auditor / Viewer"

export type RoleType = "System" | "Custom"

export interface Role {
  id: string
  name: RoleName | string
  code: string
  description: string
  isSystemRole: boolean
  status: "Active" | "Inactive"
  permissions: PermissionCode[]
  userCount: number
  createdAt: string
  updatedAt: string
}

export type PermissionPreset =
  | "no_access"
  | "view_only"
  | "encoder"
  | "approver"
  | "financial"
  | "full_access"
  | "copy_existing"
  | "custom"

export type PermissionSource = "primary_role" | "additional_role" | "direct_allow" | "direct_deny" | "none"

export interface EffectivePermissionEntry {
  code: PermissionCode
  label: string
  group: string
  description: string
  sources: Exclude<PermissionSource, "none" | "direct_deny">[]
  directSetting: "allow" | "deny" | null
  effective: boolean
}
