import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { differenceInCalendarDays, parseISO } from "date-fns"
import { AlertTriangle, ArrowLeft, Banknote, Download, Hash, RotateCcw } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllLoans } from "@/services/loans.service"
import { formatCurrency } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"

const BUCKET_LABELS = ["Current", "1-30 Days", "31-60 Days", "61-90 Days", "90+ Days"] as const
type BucketLabel = (typeof BUCKET_LABELS)[number]

interface Filters {
  office: string
}

const EMPTY_FILTERS: Filters = { office: "" }

interface AgingRow {
  bucket: BucketLabel
  loans: number
  outstanding: number
}

function daysPastDue(firstDueDate: string): number {
  try {
    return differenceInCalendarDays(new Date(), parseISO(firstDueDate))
  } catch {
    return 0
  }
}

function bucketFor(days: number): BucketLabel {
  if (days <= 0) return "Current"
  if (days <= 30) return "1-30 Days"
  if (days <= 60) return "31-60 Days"
  if (days <= 90) return "61-90 Days"
  return "90+ Days"
}

export default function LoanAgingReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const rows = React.useMemo<AgingRow[]>(() => {
    if (!applied) return []
    const overdueLoans = getAllLoans()
      .filter((l) => l.status === "Overdue")
      .filter((l) => !applied.office || l.officeName === applied.office)

    const buckets = new Map<BucketLabel, { loans: number; outstanding: number }>(
      BUCKET_LABELS.map((b) => [b, { loans: 0, outstanding: 0 }])
    )
    for (const l of overdueLoans) {
      const bucket = bucketFor(daysPastDue(l.firstDueDate))
      const entry = buckets.get(bucket)!
      entry.loans += 1
      entry.outstanding += l.outstandingBalance
    }
    return BUCKET_LABELS.map((bucket) => ({ bucket, ...buckets.get(bucket)! }))
  }, [applied])

  const summary = React.useMemo(() => {
    const totalOutstanding = rows.reduce((sum, r) => sum + r.outstanding, 0)
    const totalLoans = rows.reduce((sum, r) => sum + r.loans, 0)
    const over90 = rows.find((r) => r.bucket === "90+ Days")
    return {
      totalOutstanding,
      totalLoans,
      over90Outstanding: over90?.outstanding ?? 0,
      over90Loans: over90?.loans ?? 0,
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
      "loan-aging-report.csv",
      ["Aging Bucket", "Loan Count", "Total Outstanding"],
      rows.map((r) => [r.bucket, r.loans, r.outstanding.toFixed(2)])
    )
    toast.success("Loan aging report exported to CSV.")
  }

  const columns: ColumnDef<AgingRow, unknown>[] = [
    { accessorKey: "bucket", header: "Aging Bucket" },
    { accessorKey: "loans", header: "Loan Count" },
    { accessorKey: "outstanding", header: "Total Outstanding", cell: ({ row }) => formatCurrency(row.original.outstanding) },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Loan Aging Report" description="See how far past due overdue loan balances are, grouped into aging buckets." />

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
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to build the loan aging report.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Overdue Loans" value={String(summary.totalLoans)} icon={Hash} tone="primary" />
            <StatCard label="Total Overdue Outstanding" value={formatCurrency(summary.totalOutstanding)} icon={Banknote} tone="warning" />
            <StatCard label="90+ Days Loans" value={String(summary.over90Loans)} icon={AlertTriangle} tone="danger" />
            <StatCard label="90+ Days Outstanding" value={formatCurrency(summary.over90Outstanding)} icon={Banknote} tone="danger" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Outstanding Balance Per Aging Bucket</h3>
            {summary.totalLoans === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No overdue loans match your filters.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="bucket" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`)} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Outstanding"]} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Bar dataKey="outstanding" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No aging data"
              emptyDescription="No overdue loans match your filters."
            />
          </div>
        </>
      )}
    </div>
  )
}
