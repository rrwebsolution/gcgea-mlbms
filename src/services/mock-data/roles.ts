import type { Role } from "@/types"
import { permissionsForRole } from "@/constants/permissions"

function buildRole(
  id: string,
  name: Role["name"],
  code: string,
  description: string,
  isSystemRole: boolean,
  userCount: number,
  permissions?: Role["permissions"],
  createdAt = "2024-01-15",
  updatedAt = "2025-11-02"
): Role {
  return {
    id,
    name,
    code,
    description,
    isSystemRole,
    status: "Active",
    permissions: permissions ?? permissionsForRole(name),
    userCount,
    createdAt,
    updatedAt,
  }
}

export const MOCK_ROLES: Role[] = [
  buildRole("role-01", "Super Administrator", "super_administrator", "Full, unrestricted access to all modules and settings.", true, 2),
  buildRole("role-02", "Membership Officer", "membership_officer", "Manages member registration, profiles, and beneficiaries.", true, 3),
  buildRole("role-03", "Loan Officer", "loan_officer", "Encodes and processes loan applications and releases.", true, 3),
  buildRole("role-04", "Treasurer", "treasurer", "Handles contributions, collections, and payment posting.", true, 2),
  buildRole("role-05", "Benefits Officer", "benefits_officer", "Processes benefit applications and releases.", true, 2),
  buildRole("role-06", "Approving Officer", "approving_officer", "Reviews and approves loans and benefit applications.", true, 2),
  buildRole("role-07", "Auditor / Viewer", "auditor_viewer", "Read-only access for audit and oversight purposes.", true, 1),

  // Custom roles (not protected — may be edited/deleted)
  buildRole(
    "role-08",
    "Senior Loan Officer",
    "senior_loan_officer",
    "Loan Officer duties plus the ability to recommend applications for approval.",
    false,
    1,
    Array.from(new Set([...permissionsForRole("Loan Officer"), "loans.review", "loans.recommend"])),
    "2025-03-10",
    "2026-05-20"
  ),
  buildRole(
    "role-09",
    "Regional Auditor",
    "regional_auditor",
    "Extended read-only access including sensitive audit log changes, for external/regional audit engagements.",
    false,
    1,
    Array.from(new Set([...permissionsForRole("Auditor / Viewer"), "audit_logs.view_sensitive_changes", "reports.audit"])),
    "2025-06-02",
    "2026-04-11"
  ),
  buildRole(
    "role-10",
    "Branch Coordinator",
    "branch_coordinator",
    "Front-desk coordinator role for satellite offices — light member and reporting access without financial actions.",
    false,
    1,
    [
      "dashboard.view",
      "members.view", "members.create", "members.update", "members.print",
      "beneficiaries.view", "beneficiaries.create",
      "offices.view",
      "reports.view", "reports.member",
    ],
    "2025-09-18",
    "2025-09-18"
  ),
]
