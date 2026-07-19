import * as React from "react"
import { Link } from "react-router-dom"
import { BarChart3, ChevronRight, CreditCard, HeartHandshake, Landmark, LineChart, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { ReportPreviewDialog, type ReportCategory } from "@/features/reports/components/ReportPreviewDialog"
import { REPORT_ROUTES } from "@/constants/reports"

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
    <div className="space-y-6 pb-12">
      <PageHeader title="Report Center" description="Generate, print, and export reports across all GCGEA MLBMS modules." />
      
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {CATEGORIES.map((category) => (
          <div 
            key={category.title} 
            className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/95 p-5 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-200"
          >
            {/* Header: Icon + Category title */}
            <div className="mb-4 flex items-center gap-3 border-b border-border/30 pb-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm/5">
                <category.icon className="size-4.5" />
              </span>
              <h2 className="font-heading text-sm font-bold tracking-tight text-foreground">{category.title}</h2>
            </div>

            {/* Reports interactive row list */}
            <ul className="space-y-1">
              {category.reports.map((report) => {
                const route = REPORT_ROUTES[category.title]?.[report]
                const itemClassName = "group/item flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-muted-foreground/80 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                
                const itemContent = (
                  <>
                    <span className="flex items-center gap-2.5 min-w-0">
                      <BarChart3 className="size-3.5 shrink-0 text-muted-foreground/60 group-hover/item:text-primary transition-colors" />
                      <span className="truncate text-[13px] font-medium leading-none mt-0.5">{report}</span>
                    </span>
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/30 opacity-0 -translate-x-1.5 transition-all duration-200 group-hover/item:opacity-100 group-hover/item:translate-x-0" />
                  </>
                )

                return (
                  <li key={report}>
                    {route ? (
                      <Link to={route} className={itemClassName}>
                        {itemContent}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelected({ category: category.title, reportName: report })}
                        className={itemClassName}
                      >
                        {itemContent}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Report Preview overlay modal */}
      <ReportPreviewDialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        category={selected?.category ?? null}
        reportName={selected?.reportName ?? null}
      />
    </div>
  )
}