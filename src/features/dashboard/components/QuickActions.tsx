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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {ACTIONS.map((action) => (
        <PermissionGuard key={action.path} permission={action.permission}>
          <Link
            to={action.path}
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-3 py-4 text-center text-xs font-medium text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <action.icon className="size-4.5" />
            </span>
            {action.label}
          </Link>
        </PermissionGuard>
      ))}
    </div>
  )
}
