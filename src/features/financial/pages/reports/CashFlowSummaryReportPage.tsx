import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format, parseISO } from "date-fns"
import { ArrowDownRight, ArrowLeft, ArrowUpRight, CalendarRange, Download, RotateCcw, Scale } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllContributions } from "@/services/contributions.service"
import { getAllLoanPayments } from "@/services/loan-payments.service"
import { getAllLoans } from "@/services/loans.service"
import { getAllBenefits } from "@/services/benefits.service"
import { formatCurrency } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"
import { cn } from "@/lib/utils"

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

interface CashFlowRow {
  period: string
  inflows: number
  outflows: number
  net: number
}

export default function CashFlowSummaryReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const rows = React.useMemo<CashFlowRow[]>(() => {
    if (!applied) return []
    const inRange = (date: string) => {
      if (applied.dateFrom && date < applied.dateFrom) return false
      if (applied.dateTo && date > applied.dateTo) return false
      return true
    }

    const map = new Map<string, { inflows: number; outflows: number }>()
    const bump = (period: string, key: "inflows" | "outflows", amount: number) => {
      const entry = map.get(period) ?? { inflows: 0, outflows: 0 }
      entry[key] += amount
      map.set(period, entry)
    }

    for (const c of getAllContributions()) {
      if (c.status !== "Posted" || !inRange(c.paymentDate)) continue
      bump(c.paymentDate.slice(0, 7), "inflows", c.amount)
    }
    for (const p of getAllLoanPayments()) {
      if (p.status !== "Posted" || !inRange(p.paymentDate)) continue
      bump(p.paymentDate.slice(0, 7), "inflows", p.amountPaid)
    }
    for (const l of getAllLoans()) {
      if (!l.releaseDate || !inRange(l.releaseDate)) continue
      bump(l.releaseDate.slice(0, 7), "outflows", l.actualReleasedAmount ?? l.approvedAmount ?? l.requestedAmount)
    }
    for (const b of getAllBenefits()) {
      if (!b.releaseDate || !inRange(b.releaseDate)) continue
      bump(b.releaseDate.slice(0, 7), "outflows", b.approvedAmount ?? b.requestedAmount)
    }

    return Array.from(map.entries())
      .map(([period, v]) => ({ period, inflows: v.inflows, outflows: v.outflows, net: v.inflows - v.outflows }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }, [applied])

  const chartData = React.useMemo(
    () => rows.map((r) => ({ period: r.period, inflows: r.inflows, outflows: -r.outflows })),
    [rows]
  )

  const summary = React.useMemo(() => {
    const totalInflows = rows.reduce((sum, r) => sum + r.inflows, 0)
    const totalOutflows = rows.reduce((sum, r) => sum + r.outflows, 0)
    return {
      totalInflows,
      totalOutflows,
      net: totalInflows - totalOutflows,
      monthsCovered: rows.length,
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
      "cash-flow-summary-report.csv",
      ["Month", "Inflows", "Outflows", "Net"],
      rows.map((r) => [monthTick(r.period), r.inflows.toFixed(2), r.outflows.toFixed(2), r.net.toFixed(2)])
    )
    toast.success("Cash flow summary exported to CSV.")
  }

  const columns: ColumnDef<CashFlowRow, unknown>[] = [
    { accessorKey: "period", header: "Month", cell: ({ row }) => monthTick(row.original.period) },
    { accessorKey: "inflows", header: "Inflows", cell: ({ row }) => formatCurrency(row.original.inflows) },
    { accessorKey: "outflows", header: "Outflows", cell: ({ row }) => formatCurrency(row.original.outflows) },
    {
      accessorKey: "net",
      header: "Net",
      cell: ({ row }) => (
        <span className={cn("font-medium", row.original.net >= 0 ? "text-success" : "text-destructive")}>
          {formatCurrency(row.original.net)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Cash Flow Summary" description="Compare total inflows and outflows — contributions, loan payments, loan releases, and benefit releases — over time." />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
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
          <Button size="sm" onClick={handleGenerate}>Generate</Button>
          <Button size="sm" variant="outline" onClick={handleReset}><RotateCcw /> Reset Filters</Button>
          <PermissionButton permission="reports.export" size="sm" variant="outline" disabled={!applied} onClick={handleExportCsv}>
            <Download /> Export CSV
          </PermissionButton>
        </div>
      </div>

      {!applied ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to build the cash flow summary.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Inflows" value={formatCurrency(summary.totalInflows)} icon={ArrowUpRight} tone="success" />
            <StatCard label="Total Outflows" value={formatCurrency(summary.totalOutflows)} icon={ArrowDownRight} tone="danger" />
            <StatCard label="Net Cash Flow" value={formatCurrency(summary.net)} icon={Scale} tone={summary.net >= 0 ? "primary" : "warning"} />
            <StatCard label="Months Covered" value={String(summary.monthsCovered)} icon={CalendarRange} tone="info" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Inflows vs Outflows Per Month</h3>
            {chartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No cash flow activity in range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="period" tickFormatter={monthTick} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <YAxis tickFormatter={(v) => (Math.abs(v) >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`)} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} width={56} />
                  <Tooltip formatter={(value, name) => [formatCurrency(Math.abs(Number(value))), name]} labelFormatter={(label) => monthTick(label as string)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="inflows" name="Inflows" fill="var(--color-success)" radius={[4, 4, 0, 0]} maxBarSize={44} />
                  <Bar dataKey="outflows" name="Outflows" fill="var(--color-destructive)" radius={[0, 0, 4, 4]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No cash flow data"
              emptyDescription="Try widening the date range."
            />
          </div>
        </>
      )}
    </div>
  )
}
