import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { differenceInCalendarDays, parseISO } from "date-fns"
import { AlertTriangle, ArrowLeft, Banknote, Download, RotateCcw } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllLoans } from "@/services/loans.service"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"

interface Filters {
  office: string
}

const EMPTY_FILTERS: Filters = { office: "" }

interface OverdueRow {
  id: string
  applicationNumber: string
  memberName: string
  officeName: string
  outstandingBalance: number
  firstDueDate: string
  daysOverdue: number
}

interface OfficeCount {
  office: string
  count: number
}

function daysOverdue(firstDueDate: string): number {
  try {
    return Math.max(0, differenceInCalendarDays(new Date(), parseISO(firstDueDate)))
  } catch {
    return 0
  }
}

export default function OverdueLoansReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const rows = React.useMemo<OverdueRow[]>(() => {
    if (!applied) return []
    return getAllLoans()
      .filter((l) => l.status === "Overdue")
      .filter((l) => !applied.office || l.officeName === applied.office)
      .map((l) => ({
        id: l.id,
        applicationNumber: l.applicationNumber,
        memberName: l.memberName,
        officeName: l.officeName,
        outstandingBalance: l.outstandingBalance,
        firstDueDate: l.firstDueDate,
        daysOverdue: daysOverdue(l.firstDueDate),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
  }, [applied])

  const officeChartData = React.useMemo<OfficeCount[]>(() => {
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.officeName, (map.get(r.officeName) ?? 0) + 1)
    return Array.from(map.entries())
      .map(([office, count]) => ({ office, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [rows])

  const summary = React.useMemo(() => {
    const totalOutstanding = rows.reduce((sum, r) => sum + r.outstandingBalance, 0)
    const totalDays = rows.reduce((sum, r) => sum + r.daysOverdue, 0)
    return {
      count: rows.length,
      totalOutstanding,
      averageDaysOverdue: rows.length > 0 ? totalDays / rows.length : 0,
    }
  }, [rows])

  function handleGenerate() {
    setApplied(draft)
  }

  function handleReset() {
    setDraft(EMPTY_FILTERS)
    setApplied(null)
  }

  function handleExportCsv() {
    downloadCsv(
      "overdue-loans-report.csv",
      ["Application #", "Member", "Office", "Outstanding Balance", "First Due Date", "Days Overdue"],
      rows.map((r) => [r.applicationNumber, r.memberName, r.officeName, r.outstandingBalance.toFixed(2), r.firstDueDate, r.daysOverdue])
    )
    toast.success("Overdue loans report exported to CSV.")
  }

  const columns: ColumnDef<OverdueRow, unknown>[] = [
    {
      accessorKey: "applicationNumber",
      header: "Application #",
      cell: ({ row }) => (
        <Link to={`/loans/${row.original.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
          {row.original.applicationNumber}
        </Link>
      ),
    },
    { accessorKey: "memberName", header: "Member" },
    { accessorKey: "officeName", header: "Office" },
    { accessorKey: "outstandingBalance", header: "Outstanding Balance", cell: ({ row }) => formatCurrency(row.original.outstandingBalance) },
    { accessorKey: "firstDueDate", header: "First Due Date", cell: ({ row }) => formatDateShort(row.original.firstDueDate) },
    { accessorKey: "daysOverdue", header: "Days Overdue" },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Overdue Loans" description="Identify loans that have passed their due date without full payment." />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Office</Label>
            <OfficeSelect value={draft.office} onValueChange={(v) => setDraft((f) => ({ ...f, office: v }))} placeholder="All Offices" activeOnly={false} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={handleGenerate}>Generate</Button>
          <Button size="sm" variant="outline" onClick={handleReset}><RotateCcw /> Reset Filters</Button>
          <PermissionButton permission="loans.export" size="sm" variant="outline" disabled={!applied} onClick={handleExportCsv}>
            <Download /> Export CSV
          </PermissionButton>
        </div>
      </div>

      {!applied ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to build the overdue loans report.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Overdue Loans" value={String(summary.count)} icon={AlertTriangle} tone="danger" />
            <StatCard label="Total Outstanding" value={formatCurrency(summary.totalOutstanding)} icon={Banknote} tone="warning" />
            <StatCard label="Average Days Overdue" value={summary.averageDaysOverdue.toFixed(0)} icon={AlertTriangle} tone="gold" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Overdue Loans Per Office</h3>
            {officeChartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No overdue loans match your filters.</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={officeChartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis type="category" dataKey="office" width={120} tick={{ fill: "var(--color-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [value, "Overdue"]} cursor={{ fill: "var(--color-muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Bar dataKey="count" fill="var(--color-destructive)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No overdue loans"
              emptyDescription="No loans are currently overdue for this scope."
            />
          </div>
        </>
      )}
    </div>
  )
}
