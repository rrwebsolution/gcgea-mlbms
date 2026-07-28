import { Link } from "react-router-dom"
import { FileBarChart, UserPlus, Wallet, Landmark, CreditCard, HeartHandshake } from "lucide-react"
import { PermissionGuard } from "@/components/shared/PermissionGuard"

const ACTIONS = [
  { label: "Add Member", path: "/members/new", icon: UserPlus, permission: "members.create" as const },
  { label: "Create Loan Application", path: "/loans/new", icon: Landmark, permission: "loans.create" as const },
  { label: "Record Payment", path: "/loan-payments/new", icon: CreditCard, permission: "loan_payments.create" as const },
  { label: "Record Contribution", path: "/contributions/new", icon: Wallet, permission: "contributions.create" as const },
  { label: "Create Benefit Application", path: "/benefits/new", icon: HeartHandshake, permission: "benefits.create" as const },
  { label: "Generate Report", path: "/reports", icon: FileBarChart, permission: "reports.view" as const },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {ACTIONS.map((action) => (
        <PermissionGuard key={action.path} permission={action.permission}>
          <Link
            to={action.path}
            className="group relative flex flex-col items-center justify-center gap-3.5 rounded-xl border border-border/60 bg-card px-4 py-5 text-center text-xs font-semibold text-foreground/80 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/[0.01] hover:text-foreground hover:shadow-md hover:shadow-primary/5 active:translate-y-0"
          >
            {/* Soft backdrop radial glow for hover state */}
            <span className="absolute inset-0 rounded-xl bg-radial from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            {/* Premium Icon Container */}
            <span className="relative flex size-11 items-center justify-center rounded-xl bg-primary/[0.08] text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground shadow-2xs">
              <action.icon className="size-5 transition-transform duration-300 group-hover:rotate-3" />
            </span>

            {/* Label */}
            <span className="relative text-center leading-normal tracking-tight transition-colors duration-200 group-hover:text-primary">
              {action.label}
            </span>
          </Link>
        </PermissionGuard>
      ))}
    </div>
  )
}