import * as React from "react"
import { BarChart3, CreditCard, HeartHandshake, Landmark, LineChart, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { ReportPreviewDialog, type ReportCategory } from "@/features/reports/components/ReportPreviewDialog"

const CATEGORIES: { title: ReportCategory; icon: typeof Users; reports: string[] }[] = [
  {
    title: "Member Reports",
    icon: Users,
    reports: ["Master List of Members", "Active Members", "Retired Members", "Members by Office", "Members by Sex", "New Members", "Incomplete Member Profiles"],
  },
  {
    title: "Contribution Reports",
    icon: CreditCard,
    reports: ["Monthly Contributions", "Contributions by Office", "Unpaid Contributions", "Member Contribution History", "Payroll Deduction Summary"],
  },
  {
    title: "Loan Reports",
    icon: Landmark,
    reports: ["Loan Applications", "Approved Loans", "Rejected Loans", "Released Loans", "Active Loans", "Fully Paid Loans", "Outstanding Balances", "Overdue Loans", "Loan Collections", "Loan Aging Report", "Member Loan Ledger"],
  },
  {
    title: "Benefit Reports",
    icon: HeartHandshake,
    reports: ["Benefit Applications", "Approved Benefits", "Released Benefits", "Benefits by Type", "Benefits by Office", "Member Benefit History"],
  },
  {
    title: "Financial Reports",
    icon: LineChart,
    reports: ["Daily Collection Report", "Monthly Collection Report", "Annual Collection Report", "Loan Release Summary", "Benefits Release Summary", "Cash Flow Summary"],
  },
]

export default function ReportsPage() {
  const [selected, setSelected] = React.useState<{ category: ReportCategory; reportName: string } | null>(null)

  return (
    <div className="space-y-5">
      <PageHeader title="Report Center" description="Generate, print, and export reports across all GCGEA MLBMS modules." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CATEGORIES.map((category) => (
          <div key={category.title} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <category.icon className="size-4" />
              </span>
              <h2 className="font-heading text-sm font-semibold text-foreground">{category.title}</h2>
            </div>
            <ul className="space-y-1.5">
              {category.reports.map((report) => (
                <li key={report}>
                  <button
                    type="button"
                    onClick={() => setSelected({ category: category.title, reportName: report })}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <BarChart3 className="size-3.5 shrink-0" />
                    {report}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <ReportPreviewDialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        category={selected?.category ?? null}
        reportName={selected?.reportName ?? null}
      />
    </div>
  )
}
