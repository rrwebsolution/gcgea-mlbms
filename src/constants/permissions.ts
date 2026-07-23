import type { Permission, PermissionCode, PermissionPreset } from "@/types"

export interface PermissionGroupDef {
  group: string
  label: string
  permissions: Permission[]
}

function p(code: PermissionCode, label: string, group: string, description: string): Permission {
  return { code, label, group, description }
}

export const PERMISSION_GROUPS: PermissionGroupDef[] = [
  {
    group: "dashboard",
    label: "Dashboard",
    permissions: [p("dashboard.view", "View Dashboard", "dashboard", "View dashboard summaries and charts")],
  },
  {
    group: "members",
    label: "Members",
    permissions: [
      p("members.view", "View Members", "members", "View member records"),
      p("members.create", "Create Members", "members", "Register new members"),
      p("members.update", "Update Members", "members", "Edit member records"),
      p("members.archive", "Archive Members", "members", "Archive member records"),
      p("members.restore", "Restore Members", "members", "Restore archived members"),
      p("members.export", "Export Members", "members", "Export member records"),
      p("members.print", "Print Members", "members", "Print member list/profile"),
      p("members.review", "Review Members", "members", "Review submitted member registrations"),
      p("members.approve", "Approve Members", "members", "Approve member registrations"),
      p("members.reject", "Reject Members", "members", "Reject member registrations"),
      p("members.auto_approve", "Auto Approve Members", "members", "Automatically approve new and imported members"),
    ],
  },
  {
    group: "beneficiaries",
    label: "Beneficiaries",
    permissions: [
      p("beneficiaries.view", "View Beneficiaries", "beneficiaries", "View beneficiary records"),
      p("beneficiaries.create", "Add Beneficiaries", "beneficiaries", "Add beneficiaries"),
      p("beneficiaries.update", "Update Beneficiaries", "beneficiaries", "Edit beneficiaries"),
      p("beneficiaries.delete", "Delete Beneficiaries", "beneficiaries", "Remove beneficiaries"),
    ],
  },
  {
    group: "offices",
    label: "Offices",
    permissions: [
      p("offices.view", "View Offices", "offices", "View office records"),
      p("offices.create", "Create Offices", "offices", "Add offices"),
      p("offices.update", "Update Offices", "offices", "Edit offices"),
      p("offices.activate", "Activate Offices", "offices", "Reactivate an inactive office"),
      p("offices.deactivate", "Deactivate Offices", "offices", "Deactivate an office"),
    ],
  },
  {
    group: "contributions",
    label: "Contributions",
    permissions: [
      p("contributions.view", "View Contributions", "contributions", "View contribution records"),
      p("contributions.create", "Record Contributions", "contributions", "Record contributions"),
      p("contributions.update", "Update Contributions", "contributions", "Edit contributions"),
      p("contributions.void", "Void Contributions", "contributions", "Void posted contributions"),
      p("contributions.bulk_create", "Bulk Contribution Entry", "contributions", "Record contributions for multiple members at once"),
      p("contributions.import", "Import Contributions", "contributions", "Import payroll deductions"),
      p("contributions.replace_duplicate", "Replace Duplicate Contributions", "contributions", "Overwrite existing contribution records flagged as duplicates during import"),
      p("contributions.export", "Export Contributions", "contributions", "Export contribution reports"),
      p("contributions.print", "Print Contributions", "contributions", "Print receipts"),
    ],
  },
  {
    group: "loans",
    label: "Loans",
    permissions: [
      p("loans.view", "View Loans", "loans", "View loan applications"),
      p("loans.create", "Create Loans", "loans", "Encode loan applications"),
      p("loans.update", "Update Loans", "loans", "Edit loan applications"),
      p("loans.submit", "Submit Loans", "loans", "Submit loan applications for review"),
      p("loans.review", "Review Loans", "loans", "Review submitted loan applications"),
      p("loans.recommend", "Recommend Loans", "loans", "Recommend a loan application for approval"),
      p("loans.approve", "Approve Loans", "loans", "Approve loan applications"),
      p("loans.reject", "Reject Loans", "loans", "Reject loan applications"),
      p("loans.release", "Release Loans", "loans", "Release approved loans"),
      p("loans.reloan", "Initiate Reloan", "loans", "Create a reloan application from an existing, eligible loan"),
      p("loans.cancel", "Cancel Loans", "loans", "Cancel loan applications"),
      p("loans.restructure", "Restructure Loans", "loans", "Restructure an existing loan"),
      p("loans.override_eligibility", "Override Loan Eligibility", "loans", "Override failed eligibility checks with a documented reason"),
      p("loans.print", "Print Loans", "loans", "Print loan documents"),
      p("loans.export", "Export Loans", "loans", "Export loan reports"),
    ],
  },
  {
    group: "loan_payments",
    label: "Loan Payments",
    permissions: [
      p("loan_payments.view", "View Loan Payments", "loan_payments", "View loan payments"),
      p("loan_payments.create", "Record Loan Payments", "loan_payments", "Record loan payments"),
      p("loan_payments.update", "Update Loan Payments", "loan_payments", "Edit loan payments"),
      p("loan_payments.void", "Void Loan Payments", "loan_payments", "Void posted payments"),
      p("loan_payments.import", "Import Loan Payments", "loan_payments", "Bulk import loan payments"),
      p("loan_payments.print_receipt", "Print Receipts", "loan_payments", "Print payment receipts"),
      p("loan_payments.export", "Export Loan Payments", "loan_payments", "Export payment records"),
    ],
  },
  {
    group: "benefits",
    label: "Benefits",
    permissions: [
      p("benefits.view", "View Benefits", "benefits", "View benefit applications"),
      p("benefits.create", "Create Benefits", "benefits", "Encode benefit applications"),
      p("benefits.update", "Update Benefits", "benefits", "Edit benefit applications"),
      p("benefits.submit", "Submit Benefits", "benefits", "Submit benefit applications"),
      p("benefits.review", "Review Benefits", "benefits", "Review submitted benefit applications"),
      p("benefits.approve", "Approve Benefits", "benefits", "Approve benefit applications"),
      p("benefits.reject", "Reject Benefits", "benefits", "Reject benefit applications"),
      p("benefits.release", "Release Benefits", "benefits", "Release approved benefits"),
      p("benefits.cancel", "Cancel Benefits", "benefits", "Cancel benefit applications"),
      p("benefits.override_eligibility", "Override Benefit Eligibility", "benefits", "Override failed eligibility checks with a documented reason"),
      p("benefits.print", "Print Benefits", "benefits", "Print benefit documents"),
      p("benefits.export", "Export Benefits", "benefits", "Export benefit reports"),
    ],
  },
  {
    group: "reports",
    label: "Reports",
    permissions: [
      p("reports.view", "View Reports", "reports", "View the report center"),
      p("reports.export", "Export Reports", "reports", "Export reports"),
      p("reports.print", "Print Reports", "reports", "Print reports"),
      p("reports.financial", "Financial Reports", "reports", "Access financial/collection reports"),
      p("reports.audit", "Audit Reports", "reports", "Access audit-related reports"),
      p("reports.member", "Member Reports", "reports", "Access member reports"),
      p("reports.loan", "Loan Reports", "reports", "Access loan reports"),
      p("reports.benefit", "Benefit Reports", "reports", "Access benefit reports"),
      p("reports.contribution", "Contribution Reports", "reports", "Access contribution reports"),
    ],
  },
  {
    group: "users",
    label: "Users",
    permissions: [
      p("users.view", "View Users", "users", "View system users"),
      p("users.create", "Create Users", "users", "Create user accounts"),
      p("users.update", "Update Users", "users", "Edit user accounts"),
      p("users.activate", "Activate Users", "users", "Reactivate a user account"),
      p("users.deactivate", "Deactivate Users", "users", "Deactivate a user account"),
      p("users.reset_password", "Reset Passwords", "users", "Reset user passwords"),
      p("users.assign_role", "Assign Roles", "users", "Assign primary/additional roles to a user"),
      p("users.assign_permissions", "Assign User Permissions", "users", "Manage a user's direct allow/deny permissions"),
      p("users.view_login_history", "View Login History", "users", "View a user's login history"),
    ],
  },
  {
    group: "roles",
    label: "Roles & Permissions",
    permissions: [
      p("roles.view", "View Roles", "roles", "View roles and permissions"),
      p("roles.create", "Create Roles", "roles", "Create roles"),
      p("roles.update", "Update Roles", "roles", "Edit roles"),
      p("roles.duplicate", "Duplicate Roles", "roles", "Duplicate an existing role"),
      p("roles.delete", "Delete Roles", "roles", "Delete custom roles"),
      p("roles.assign_permissions", "Assign Role Permissions", "roles", "Manage a role's permission matrix"),
      p("roles.view_users", "View Assigned Users", "roles", "View users assigned to a role"),
    ],
  },
  {
    group: "audit_logs",
    label: "Audit Logs",
    permissions: [
      p("audit_logs.view", "View Audit Logs", "audit_logs", "View system audit logs"),
      p("audit_logs.export", "Export Audit Logs", "audit_logs", "Export audit log records"),
      p("audit_logs.view_sensitive_changes", "View Sensitive Changes", "audit_logs", "View before/after values of sensitive fields"),
    ],
  },
  {
    group: "approval_workflow",
    label: "Approval Workflow",
    permissions: [
      p("approval_workflow.view", "View Approval Workflow", "approval_workflow", "View workflow stage configuration"),
      p("approval_workflow.configure", "Configure Approval Workflow", "approval_workflow", "Create/edit workflow stage assignments"),
    ],
  },
  {
    group: "drafts",
    label: "Drafts",
    permissions: [
      p("drafts.view_own", "View Own Drafts", "drafts", "View drafts you created"),
      p("drafts.view_all", "View All Drafts", "drafts", "View every draft in the system"),
      p("drafts.create", "Create Drafts", "drafts", "Save new drafts"),
      p("drafts.update_own", "Update Own Drafts", "drafts", "Edit and resave your own drafts"),
      p("drafts.update_all", "Update All Drafts", "drafts", "Edit and resave any user's draft"),
      p("drafts.delete_own", "Delete Own Drafts", "drafts", "Delete your own drafts"),
      p("drafts.delete_all", "Delete All Drafts", "drafts", "Delete any user's draft"),
      p("drafts.duplicate", "Duplicate Drafts", "drafts", "Duplicate an existing draft"),
      p("drafts.transfer", "Transfer Draft Ownership", "drafts", "Transfer a draft to another user"),
      p("drafts.submit", "Submit Drafts", "drafts", "Finalize a draft into a real record"),
    ],
  },
  {
    group: "member_import",
    label: "Member Import",
    permissions: [
      p("member_import.view", "View Member Imports", "member_import", "View member import history, batch detail, and error/audit reports"),
      p("member_import.create", "Run Member Import", "member_import", "Upload a workbook, select a worksheet, map columns, preview/validate, and commit a member import batch"),
      p("member_import.resolve_duplicates", "Resolve Member Duplicates", "member_import", "Act on possible/probable/exact duplicate-member matches during import, including merge decisions"),
      p("member_import.manage_offices", "Manage Import Office Mapping", "member_import", "Create a new office or save an office alias while resolving unmapped office names during import"),
    ],
  },
  {
    group: "payroll_manual",
    label: "Manual Payroll Entry",
    permissions: [
      p("payroll.manual.view", "View Manual Payroll", "payroll_manual", "View manual payroll deduction entries"),
      p("payroll.manual.create", "Create Manual Payroll", "payroll_manual", "Create and save payroll deduction drafts"),
      p("payroll.manual.edit", "Edit Manual Payroll", "payroll_manual", "Edit draft payroll deductions"),
      p("payroll.manual.post", "Post Manual Payroll", "payroll_manual", "Post payroll deductions to financial ledgers"),
      p("payroll.manual.delete", "Delete Manual Payroll", "payroll_manual", "Delete draft payroll deductions"),
      p("payroll.manual.print", "Print Manual Payroll", "payroll_manual", "Print payroll deduction records"),
      p("payroll.manual.override", "Override Payroll Amounts", "payroll_manual", "Override configured dues and Pabaon amounts"),
    ],
  },
  {
    group: "payroll_bulk",
    label: "Bulk Payroll Entry",
    permissions: [
      p("payroll.bulk.view", "View Bulk Payroll", "payroll_bulk", "View bulk payroll deduction entries"),
      p("payroll.bulk.create", "Create Bulk Payroll", "payroll_bulk", "Load members and save bulk payroll deduction drafts"),
      p("payroll.bulk.edit", "Edit Bulk Payroll", "payroll_bulk", "Edit draft bulk payroll deductions"),
      p("payroll.bulk.post", "Post Bulk Payroll", "payroll_bulk", "Post bulk payroll deductions to financial ledgers"),
      p("payroll.bulk.delete", "Delete Bulk Payroll", "payroll_bulk", "Delete draft bulk payroll deductions"),
      p("payroll.bulk.print", "Print Bulk Payroll", "payroll_bulk", "Print bulk payroll deduction records"),
      p("payroll.bulk.override", "Override Bulk Payroll Amounts", "payroll_bulk", "Override configured dues and Pabaon amounts in bulk entry"),
    ],
  },
  {
    group: "payroll_import",
    label: "Payroll Import",
    permissions: [
      p("payroll.import.view", "View Payroll Import", "payroll_import", "Access the Payroll Import screen and run imports"),
      p("payroll.import.rollback", "Rollback Payroll Imports", "payroll_import", "Reverse a committed payroll import batch"),
    ],
  },
  {
    group: "payroll_history",
    label: "Payroll History",
    permissions: [
      p("payroll.history.view", "View Payroll History", "payroll_history", "View unified payroll deduction history — manual, bulk, and imported"),
    ],
  },
  {
    group: "deduction_types",
    label: "Deduction Types",
    permissions: [
      p("deduction_types.view", "View Deduction Types", "deduction_types", "View configured deduction types"),
      p("deduction_types.create", "Create Deduction Types", "deduction_types", "Add deduction types"),
      p("deduction_types.update", "Update Deduction Types", "deduction_types", "Edit deduction types"),
      p("deduction_types.deactivate", "Deactivate Deduction Types", "deduction_types", "Enable/disable a deduction type"),
    ],
  },
  {
    group: "deductions",
    label: "Deductions",
    permissions: [
      p("deductions.view", "View Deductions", "deductions", "View deduction records"),
      p("deductions.void", "Void Deductions", "deductions", "Void posted deduction records"),
    ],
  },
  {
    group: "settings",
    label: "Settings",
    permissions: [
      p("settings.view", "View Settings", "settings", "View system settings"),
      p("settings.update", "Update Settings", "settings", "Update system settings"),
      p("settings.general", "General Settings", "settings", "Manage general system settings"),
      p("settings.organization", "Organization Profile", "settings", "Manage the organization profile"),
      p("settings.numbering", "Numbering Formats", "settings", "Manage document numbering formats"),
      p("settings.loan", "Loan Settings", "settings", "Manage default loan settings"),
      p("settings.contribution", "Contribution Settings", "settings", "Manage default contribution settings"),
      p("settings.benefit", "Benefit Settings", "settings", "Manage default benefit settings"),
      p("settings.notification", "Notification Settings", "settings", "Manage notification preferences"),
      p("settings.security", "Security Settings", "settings", "Manage password and session security policy"),
      p("settings.backup", "Backup Settings", "settings", "Manage backup and restore settings"),
      p("settings.appearance", "Appearance Settings", "settings", "Manage theme and appearance settings"),
    ],
  },
]

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) => g.permissions)
export const ALL_PERMISSION_CODES: PermissionCode[] = ALL_PERMISSIONS.map((p) => p.code)

export const VIEW_ONLY_PERMISSION_CODES: PermissionCode[] = ALL_PERMISSIONS.filter((perm) =>
  perm.code.endsWith(".view")
).map((perm) => perm.code)

const ENCODER_SUFFIXES = ["view", "create", "update", "submit", "print", "import", "bulk_create", "reloan"]
export const ENCODER_PERMISSION_CODES: PermissionCode[] = ALL_PERMISSIONS.filter((perm) =>
  ENCODER_SUFFIXES.some((suffix) => perm.code.endsWith(`.${suffix}`))
).map((perm) => perm.code)

const APPROVER_SUFFIXES = ["view", "review", "recommend", "approve", "reject", "release", "cancel", "restructure", "override_eligibility", "print", "export"]
export const APPROVER_PERMISSION_CODES: PermissionCode[] = ALL_PERMISSIONS.filter((perm) =>
  APPROVER_SUFFIXES.some((suffix) => perm.code.endsWith(`.${suffix}`)) ||
  perm.code === "dashboard.view" ||
  perm.code === "members.view"
).map((perm) => perm.code)

const FINANCIAL_GROUPS = ["contributions", "loan_payments", "reports", "payroll_bulk", "payroll_import", "payroll_history", "deduction_types", "deductions"]
export const FINANCIAL_PERMISSION_CODES: PermissionCode[] = ALL_PERMISSIONS.filter(
  (perm) => FINANCIAL_GROUPS.includes(perm.group) || perm.code === "dashboard.view" || perm.code === "members.view" || perm.code === "loans.view"
).map((perm) => perm.code)

export const PERMISSION_PRESETS: { value: PermissionPreset; label: string; description: string }[] = [
  { value: "no_access", label: "No Access", description: "Clears all permissions." },
  { value: "view_only", label: "View Only", description: "Grants every *.view permission across all modules." },
  { value: "encoder", label: "Encoder Access", description: "Grants create/update/submit/print/import access for day-to-day encoding work." },
  { value: "approver", label: "Approver Access", description: "Grants review/recommend/approve/reject/release access for loans and benefits." },
  { value: "financial", label: "Financial Access", description: "Grants contributions, loan payments, and reporting access." },
  { value: "full_access", label: "Full Access", description: "Grants every permission in the system." },
  { value: "copy_existing", label: "Copy from Existing Role", description: "Copies the permission set of another role as a starting point." },
]

export function permissionCodesForPreset(preset: PermissionPreset): PermissionCode[] {
  switch (preset) {
    case "no_access":
      return []
    case "view_only":
      return VIEW_ONLY_PERMISSION_CODES
    case "encoder":
      return ENCODER_PERMISSION_CODES
    case "approver":
      return APPROVER_PERMISSION_CODES
    case "financial":
      return FINANCIAL_PERMISSION_CODES
    case "full_access":
      return ALL_PERMISSION_CODES
    default:
      return []
  }
}

export function permissionsForRole(role: string): PermissionCode[] {
  switch (role) {
    case "Super Administrator":
      return ALL_PERMISSION_CODES
    case "Membership Officer":
      return [
        "dashboard.view",
        "members.view", "members.create", "members.update", "members.archive", "members.restore",
        "members.export", "members.print",
        "members.review", "members.approve", "members.reject", "members.auto_approve",
        "beneficiaries.view", "beneficiaries.create", "beneficiaries.update", "beneficiaries.delete",
        "offices.view",
        "reports.view", "reports.export", "reports.print", "reports.member",
        "drafts.view_own", "drafts.create", "drafts.update_own", "drafts.delete_own", "drafts.submit",
        "member_import.view", "member_import.create", "member_import.resolve_duplicates", "member_import.manage_offices",
      ]
    case "Loan Officer":
      return [
        "dashboard.view",
        "members.view",
        "offices.view",
        "loans.view", "loans.create", "loans.update", "loans.submit", "loans.review", "loans.reloan", "loans.print", "loans.export",
        "loan_payments.view", "loan_payments.create", "loan_payments.print_receipt",
        "reports.view", "reports.export", "reports.print", "reports.loan",
        "drafts.view_own", "drafts.create", "drafts.update_own", "drafts.delete_own", "drafts.submit",
      ]
    case "Treasurer":
      return [
        "dashboard.view",
        "members.view",
        "offices.view",
        "contributions.view", "contributions.create", "contributions.update", "contributions.void",
        "contributions.bulk_create", "contributions.import", "contributions.replace_duplicate",
        "contributions.export", "contributions.print",
        "loan_payments.view", "loan_payments.create", "loan_payments.update", "loan_payments.void",
        "loan_payments.import", "loan_payments.print_receipt", "loan_payments.export",
        "loans.view", "loans.release",
        "benefits.view", "benefits.release",
        "reports.view", "reports.export", "reports.print", "reports.financial", "reports.contribution",
        "payroll.manual.view", "payroll.manual.create", "payroll.manual.edit", "payroll.manual.post",
        "payroll.bulk.view", "payroll.bulk.create", "payroll.bulk.edit", "payroll.bulk.post",
        "payroll.import.view", "payroll.import.rollback", "payroll.history.view",
        "deduction_types.view", "deductions.view", "deductions.void",
      ]
    case "Benefits Officer":
      return [
        "dashboard.view",
        "members.view",
        "offices.view",
        "benefits.view", "benefits.create", "benefits.update", "benefits.submit", "benefits.review", "benefits.print", "benefits.export",
        "reports.view", "reports.export", "reports.print", "reports.benefit",
        "drafts.view_own", "drafts.create", "drafts.update_own", "drafts.delete_own", "drafts.submit",
      ]
    case "Approving Officer":
      return [
        "dashboard.view",
        "members.view",
        "offices.view",
        "loans.view", "loans.review", "loans.recommend", "loans.approve", "loans.reject",
        "loans.restructure", "loans.print", "loans.export",
        "benefits.view", "benefits.review", "benefits.approve", "benefits.reject",
        "benefits.print", "benefits.export",
        "reports.view", "reports.export", "reports.print", "reports.loan", "reports.benefit",
      ]
    case "Auditor / Viewer":
      return Array.from(new Set([...VIEW_ONLY_PERMISSION_CODES, "audit_logs.view", "audit_logs.export", "drafts.view_all"]))
    default:
      return ["dashboard.view"]
  }
}
