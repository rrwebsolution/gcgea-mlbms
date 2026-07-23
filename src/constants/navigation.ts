import type { PermissionCode } from "@/types"
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UploadCloud,
  UserX,
  Wallet,
  PlusCircle,
  ListChecks,
  Landmark,
  FilePlus2,
  BadgeCheck,
  CreditCard,
  AlertTriangle,
  Settings2,
  HeartHandshake,
  FileClock,
  Gift,
  BarChart3,
  Building2,
  ShieldCheck,
  KeyRound,
  History,
  SlidersHorizontal,
  ClipboardCheck,
  ReceiptText,
  Workflow,
  Banknote,
  SquarePen,
  Rows3,
  Upload,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  label: string
  path: string
  icon?: LucideIcon
  permission?: PermissionCode
  /** Visible if the user holds ANY of these codes — for items multiple approver-type roles should see. */
  anyOf?: PermissionCode[]
  children?: NavItem[]
  /** When collapsed, show each child as its own icon instead of a single group icon (used for Administration, which has no single landing page). */
  flattenWhenCollapsed?: boolean
}

export const APPROVAL_NAV_PERMISSIONS: PermissionCode[] = [
  "loans.review", "loans.approve", "loans.release",
  "benefits.review", "benefits.approve", "benefits.release",
  "members.approve",
]

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard.view",
  },
  // {
  //   label: "Draft Center",
  //   path: "/drafts",
  //   icon: FileClock,
  // },
  {
    label: "Member Management",
    path: "/members",
    icon: Users,
    permission: "members.view",
    children: [
      { label: "All Members", path: "/members", icon: Users, permission: "members.view" },
      { label: "Add Member", path: "/members/new", icon: UserPlus, permission: "members.create" },
      { label: "Import Members", path: "/members/import", icon: UploadCloud, permission: "member_import.create" },
      { label: "Import History", path: "/members/import-history", icon: History, permission: "member_import.view" },
      { label: "Incomplete Profiles", path: "/members/incomplete", icon: AlertTriangle, permission: "members.view" },
      { label: "Member Drafts", path: "/members/drafts", icon: FileClock, permission: "members.view" },
      { label: "Archived Members", path: "/members/archived", icon: UserX, permission: "members.view" },
    ],
  },
  {
    label: "Contributions",
    path: "/contributions",
    icon: Wallet,
    permission: "contributions.view",
    children: [
      { label: "Contribution Records", path: "/contributions", icon: Wallet, permission: "contributions.view" },
      { label: "Record Contribution", path: "/contributions/new", icon: PlusCircle, permission: "contributions.create" },
      { label: "Bulk Contributions", path: "/contributions/bulk", icon: ListChecks, permission: "contributions.create" },
    ],
  },
  {
    label: "Loan Management",
    path: "/loans",
    icon: Landmark,
    permission: "loans.view",
    children: [
      { label: "Loan Applications", path: "/loans", icon: Landmark, permission: "loans.view" },
      { label: "Create Loan", path: "/loans/new", icon: FilePlus2, permission: "loans.create" },
      { label: "Draft Applications", path: "/loans/drafts", icon: FileClock, permission: "loans.view" },
      { label: "Active Loans", path: "/loans/active", icon: BadgeCheck, permission: "loans.view" },
      { label: "Loan Payments", path: "/loan-payments", icon: CreditCard, permission: "loan_payments.view" },
      { label: "Overdue Loans", path: "/loans/overdue", icon: AlertTriangle, permission: "loans.view" },
      { label: "Loan Types", path: "/loans/types", icon: Settings2, permission: "loans.view" },
    ],
  },
  {
    label: "Payroll Deductions",
    path: "/payroll-deductions/manual-entry",
    icon: Banknote,
    children: [
      { label: "Manual Entry", path: "/payroll-deductions/manual-entry", icon: SquarePen, permission: "payroll.manual.view" },
      { label: "Bulk Entry", path: "/payroll-deductions/bulk-entry", icon: Rows3, permission: "payroll.bulk.view" },
      { label: "Payroll Import", path: "/payroll-deductions/import", icon: Upload, permission: "payroll.import.view" },
      { label: "Deduction Records", path: "/payroll-deductions/records", icon: ReceiptText, permission: "deductions.view" },
      { label: "Payroll History", path: "/payroll-deductions/history", icon: History, permission: "payroll.history.view" },
    ],
  },
  {
    label: "Benefits",
    path: "/benefits",
    icon: HeartHandshake,
    permission: "benefits.view",
    children: [
      { label: "Benefit Applications", path: "/benefits", icon: HeartHandshake, permission: "benefits.view" },
      { label: "Create Application", path: "/benefits/new", icon: FilePlus2, permission: "benefits.create" },
      { label: "Draft Applications", path: "/benefits/drafts", icon: FileClock, permission: "benefits.view" },
      { label: "Released Benefits", path: "/benefits/released", icon: FileClock, permission: "benefits.view" },
      { label: "Benefit Types", path: "/benefits/types", icon: Gift, permission: "benefits.view" },
    ],
  },
  {
    label: "My Approvals",
    path: "/my-approvals",
    icon: ClipboardCheck,
    anyOf: APPROVAL_NAV_PERMISSIONS,
  },
  {
    label: "Reports",
    path: "/reports",
    icon: BarChart3,
    permission: "reports.view",
  },
  {
    label: "Administration",
    path: "/admin",
    icon: SlidersHorizontal,
    flattenWhenCollapsed: true,
    children: [
      { label: "Offices", path: "/admin/offices", icon: Building2, permission: "offices.view" },
      { label: "Users", path: "/admin/users", icon: ShieldCheck, permission: "users.view" },
      { label: "Roles & Permissions", path: "/admin/roles", icon: KeyRound, permission: "roles.view" },
      { label: "Approval Workflow", path: "/admin/approval-workflow", icon: Workflow, permission: "approval_workflow.view" },
      { label: "Deduction Types", path: "/payroll/deduction-types", icon: ReceiptText, permission: "deduction_types.view" },
      { label: "Audit Logs", path: "/admin/audit-logs", icon: History, permission: "audit_logs.view" },
      { label: "System Settings", path: "/admin/settings", icon: Settings2, permission: "settings.view" },
    ],
  },
]
