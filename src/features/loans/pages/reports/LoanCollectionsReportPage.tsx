import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format, parseISO } from "date-fns"
import { ArrowLeft, Banknote, Download, RotateCcw, TrendingUp, Wallet } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { ReportDataTable } from "@/features/reports/components/ReportDataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllLoanPayments } from "@/services/loan-payments.service"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"
import { ReportGenerateButton } from "@/features/reports/components/ReportGenerateButton"
import type { LoanPayment } from "@/types"

function monthTick(value: string) {
  try {
    return format(parseISO(`${value}-01`), "MMM yyyy")
  } catch {
    return value
  }
}

interface Filters {
  dateFrom: string
  dateTo: string
}

const EMPTY_FILTERS: Filters = { dateFrom: "", dateTo: "" }

interface MonthlyRow {
  period: string
  amount: number
  count: number
  average: number
}

export default function LoanCollectionsReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(EMPTY_FILTERS)

  const payments = React.useMemo<LoanPayment[]>(() => {
    if (!applied) return []
    return getAllLoanPayments().filter((p) => {
      if (p.status !== "Posted") return false
      if (applied.dateFrom && p.paymentDate < applied.dateFrom) return false
      if (applied.dateTo && p.paymentDate > applied.dateTo) return false
      return true
    }).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
  }, [applied])

  const rows = React.useMemo<MonthlyRow[]>(() => {
    const map = new Map<string, { amount: number; count: number }>()
    for (const p of payments) {
      const period = p.paymentDate.slice(0, 7)
      const entry = map.get(period) ?? { amount: 0, count: 0 }
      entry.amount += p.amountPaid
      entry.count += 1
      map.set(period, entry)
    }
    return Array.from(map.entries())
      .map(([period, v]) => ({ period, amount: v.amount, count: v.count, average: v.amount / v.count }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }, [payments])

  const summary = React.useMemo(() => {
    const totalCollected = rows.reduce((sum, r) => sum + r.amount, 0)
    const highest = rows.reduce((max, r) => Math.max(max, r.amount), 0)
    return {
      months: rows.length,
      totalCollected,
      average: rows.length > 0 ? totalCollected / rows.length : 0,
      highest,
    }
  }, [rows])

  function handleGenerate() {
    setApplied(draft)
  }

  function handleReset() {
    setDraft(EMPTY_FILTERS)
    setApplied(EMPTY_FILTERS)
  }

  function handleExportCsv() {
    downloadCsv(
      "loan-collections-report.csv",
      ["Payment Reference", "Member", "Loan Application", "Payment Date", "Amount Paid", "Method"],
      payments.map((p) => [p.paymentReferenceNumber, p.memberName, p.loanApplicationNumber, p.paymentDate, p.amountPaid.toFixed(2), p.paymentMethod])
    )
    toast.success("Loan collections report exported to CSV.")
  }

  const columns: ColumnDef<LoanPayment, unknown>[] = [
    { accessorKey: "paymentReferenceNumber", header: "Payment Reference" },
    { accessorKey: "memberName", header: "Member" },
    {
      accessorKey: "loanApplicationNumber",
      header: "Loan Application",
      cell: ({ row }) => (
        <Link to={`/loans/${row.original.loanApplicationId}`} className="font-medium text-foreground hover:text-primary hover:underline">
          {row.original.loanApplicationNumber}
        </Link>
      ),
    },
    { accessorKey: "paymentDate", header: "Payment Date", cell: ({ row }) => formatDateShort(row.original.paymentDate) },
    { accessorKey: "amountPaid", header: "Amount Paid", cell: ({ row }) => formatCurrency(row.original.amountPaid) },
    { accessorKey: "paymentMethod", header: "Method" },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Loan Collections" description="Track total loan payments collected per month across the association." />

      <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xs backdrop-blur-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Date From</Label>
            <Input type="date" value={draft.dateFrom} onChange={(e) => setDraft((f) => ({ ...f, dateFrom: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Date To</Label>
            <Input type="date" value={draft.dateTo} onChange={(e) => setDraft((f) => ({ ...f, dateTo: e.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ReportGenerateButton onGenerate={handleGenerate} />
          <Button size="sm" variant="outline" onClick={handleReset}><RotateCcw /> Reset Filters</Button>
          <PermissionButton permission="loans.export" size="sm" variant="outline" disabled={!applied} onClick={handleExportCsv}>
            <Download /> Export CSV
          </PermissionButton>
        </div>
      </div>

      {!applied ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-10 text-center backdrop-blur-xs">
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to build the loan collections report.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Months Reported" value={String(summary.months)} icon={Wallet} tone="primary" />
            <StatCard label="Total Collected" value={formatCurrency(summary.totalCollected)} icon={Banknote} tone="success" />
            <StatCard label="Monthly Average" value={formatCurrency(summary.average)} icon={TrendingUp} tone="gold" />
            <StatCard label="Highest Month" value={formatCurrency(summary.highest)} icon={Banknote} tone="info" />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xs backdrop-blur-xs">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Collections Per Month</h3>
            {rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No posted loan payments in range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="period" tickFormatter={monthTick} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`)} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Collected"]} labelFormatter={(label) => monthTick(label as string)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
            <ReportDataTable
              columns={columns}
              data={payments}
              emptyTitle="No loan payments match your filters"
              emptyDescription="Try widening the date range."
            />
          </div>
        </>
      )}
    </div>
  )
}
