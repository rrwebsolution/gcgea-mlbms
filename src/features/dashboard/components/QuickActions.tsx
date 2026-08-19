import { Link } from "react-router-dom"
import {
  FileBarChart,
  UserPlus,
  Wallet,
  Landmark,
  CreditCard,
  HeartHandshake,
  RotateCw,
  ArrowUpRight,
} from "lucide-react"
import { PermissionGuard } from "@/components/shared/PermissionGuard"
import { cn } from "@/lib/utils"

const ACTIONS = [
  {
    label: "Add Member",
    path: "/members/new",
    icon: UserPlus,
    permission: "members.create" as const,
    tone: {
      bg: "bg-blue-500/10 dark:bg-blue-500/15",
      text: "text-blue-600 dark:text-blue-400",
      hoverBg: "group-hover:bg-blue-600",
      border: "group-hover:border-blue-500/30",
    },
  },
  {
    label: "New Loan App",
    path: "/loans/new",
    icon: Landmark,
    permission: "loans.create" as const,
    tone: {
      bg: "bg-amber-500/10 dark:bg-amber-500/15",
      text: "text-amber-600 dark:text-amber-400",
      hoverBg: "group-hover:bg-amber-600",
      border: "group-hover:border-amber-500/30",
    },
  },
  {
    label: "Reloan",
    path: "/loans/active",
    icon: RotateCw,
    permission: "loans.reloan" as const,
    tone: {
      bg: "bg-cyan-500/10 dark:bg-cyan-500/15",
      text: "text-cyan-600 dark:text-cyan-400",
      hoverBg: "group-hover:bg-cyan-600",
      border: "group-hover:border-cyan-500/30",
    },
  },
  {
    label: "Record Payment",
    path: "/loan-payments/new",
    icon: CreditCard,
    permission: "loan_payments.create" as const,
    tone: {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      text: "text-emerald-600 dark:text-emerald-400",
      hoverBg: "group-hover:bg-emerald-600",
      border: "group-hover:border-emerald-500/30",
    },
  },
  {
    label: "Record Contribution",
    path: "/contributions/new",
    icon: Wallet,
    permission: "contributions.create" as const,
    tone: {
      bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
      text: "text-indigo-600 dark:text-indigo-400",
      hoverBg: "group-hover:bg-indigo-600",
      border: "group-hover:border-indigo-500/30",
    },
  },
  {
    label: "New Benefit App",
    path: "/benefits/new",
    icon: HeartHandshake,
    permission: "benefits.create" as const,
    tone: {
      bg: "bg-rose-500/10 dark:bg-rose-500/15",
      text: "text-rose-600 dark:text-rose-400",
      hoverBg: "group-hover:bg-rose-600",
      border: "group-hover:border-rose-500/30",
    },
  },
  {
    label: "Generate Report",
    path: "/reports",
    icon: FileBarChart,
    permission: "reports.view" as const,
    tone: {
      bg: "bg-purple-500/10 dark:bg-purple-500/15",
      text: "text-purple-600 dark:text-purple-400",
      hoverBg: "group-hover:bg-purple-600",
      border: "group-hover:border-purple-500/30",
    },
  },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {ACTIONS.map((action) => (
        <PermissionGuard key={action.path} permission={action.permission}>
          <Link
            to={action.path}
            className={cn(
              "group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl",
              "border border-border/60 bg-card/80 p-4 text-center backdrop-blur-xs shadow-2xs",
              "transition-all duration-300 hover:-translate-y-1 hover:bg-card hover:shadow-md active:scale-[0.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              action.tone.border
            )}
          >
            {/* Hover Micro Corner Arrow */}
            <div className="absolute right-2.5 top-2.5 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 -translate-x-1 translate-y-1">
              <ArrowUpRight className={cn("size-3.5", action.tone.text)} />
            </div>

            {/* Ambient Hover Glow */}
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-b from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            {/* Icon Pod Container */}
            <div
              className={cn(
                "relative flex size-11 items-center justify-center rounded-xl transition-all duration-300",
                "shadow-2xs group-hover:scale-110 group-hover:shadow-xs group-hover:text-white",
                action.tone.bg,
                action.tone.text,
                action.tone.hoverBg
              )}
            >
              <action.icon
                className="size-5 transition-transform duration-300 group-hover:rotate-6"
                strokeWidth={2.2}
              />
            </div>

            {/* Label */}
            <span className="font-heading text-xs font-semibold tracking-tight text-foreground/85 transition-colors duration-200 group-hover:text-foreground">
              {action.label}
            </span>
          </Link>
        </PermissionGuard>
      ))}
    </div>
  )
}