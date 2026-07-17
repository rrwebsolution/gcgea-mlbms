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
  FileSpreadsheet,
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
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  label: string
  path: string
  icon?: LucideIcon
  permission?: PermissionCode
  children?: NavItem[]
  /** When collapsed, show each child as its own icon instead of a single group icon (used for Administration, which has no single landing page). */
  flattenWhenCollapsed?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard.view",
  },
  {
    label: "Member Management",
    path: "/members",
    icon: Users,
    permission: "members.view",
    children: [
      { label: "All Members", path: "/members", icon: Users, permission: "members.view" },
      { label: "Add Member", path: "/members/new", icon: UserPlus, permission: "members.create" },
      { label: "Import Members", path: "/members/import", icon: UploadCloud, permission: "members.import" },
      { label: "Incomplete Profiles", path: "/members/incomplete", icon: AlertTriangle, permission: "members.view" },
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
      { label: "Payroll Import", path: "/contributions/import", icon: FileSpreadsheet, permission: "contributions.import" },
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
      { label: "Active Loans", path: "/loans/active", icon: BadgeCheck, permission: "loans.view" },
      { label: "Loan Payments", path: "/loan-payments", icon: CreditCard, permission: "loan_payments.view" },
      { label: "Overdue Loans", path: "/loans/overdue", icon: AlertTriangle, permission: "loans.view" },
      { label: "Loan Types", path: "/loans/types", icon: Settings2, permission: "loans.view" },
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
      { label: "Released Benefits", path: "/benefits/released", icon: FileClock, permission: "benefits.view" },
      { label: "Benefit Types", path: "/benefits/types", icon: Gift, permission: "benefits.view" },
    ],
  },
  {
    label: "Reports",
    path: "/reports",
    icon: BarChart3,
    permission: "reports.view",
    children: [
      { label: "Member Reports", path: "/reports/members", icon: Users, permission: "reports.view" },
      { label: "Contribution Reports", path: "/reports/contributions", icon: Wallet, permission: "reports.view" },
      { label: "Loan Reports", path: "/reports/loans", icon: Landmark, permission: "reports.view" },
      { label: "Benefit Reports", path: "/reports/benefits", icon: HeartHandshake, permission: "reports.view" },
      { label: "Financial Reports", path: "/reports/financial", icon: BarChart3, permission: "reports.view" },
    ],
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
      { label: "Audit Logs", path: "/admin/audit-logs", icon: History, permission: "audit_logs.view" },
      { label: "System Settings", path: "/admin/settings", icon: Settings2, permission: "settings.view" },
    ],
  },
]
