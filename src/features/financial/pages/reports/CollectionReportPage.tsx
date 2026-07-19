import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format, parseISO } from "date-fns"
import { ArrowLeft, Banknote, Download, Hash, RotateCcw, Wallet } from "lucide-react"
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
import { formatCurrency } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"

export type CollectionGranularity = "day" | "month" | "year"

interface Filters {
  dateFrom: string
  dateTo: string
}

interface CollectionRow {
  period: string
  contributionsAmount: number
  loanPaymentsAmount: number
  total: number
  count: number
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function toDateString(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function defaultFilters(granularity: CollectionGranularity): Filters {
  const today = new Date()
  if (granularity === "day") {
    const t = toDateString(today)
    return { dateFrom: t, dateTo: t }
  }
  if (granularity === "month") {
    return { dateFrom: `${today.getFullYear()}-01-01`, dateTo: `${today.getFullYear()}-12-31` }
  }
  const fromYear = today.getFullYear() - 4
  return { dateFrom: `${fromYear}-01-01`, dateTo: `${today.getFullYear()}-12-31` }
}

function bucketKey(date: string, granularity: CollectionGranularity): string {
  if (granularity === "day") return date.slice(0, 10)
  if (granularity === "month") return date.slice(0, 7)
  return date.slice(0, 4)
}

function periodLabel(period: string, granularity: CollectionGranularity): string {
  try {
    if (granularity === "day") return format(parseISO(period), "MMM d, yyyy")
    if (granularity === "month") return format(parseISO(`${period}-01`), "MMM yyyy")
    return period
  } catch {
    return period
  }
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

interface CollectionReportPageProps {
  granularity: CollectionGranularity
  title: string
  description: string
}

export function CollectionReportPage({ granularity, title, description }: CollectionReportPageProps) {
  const initialFilters = React.useMemo(() => defaultFilters(granularity), [granularity])
  const [draft, setDraft] = React.useState<Filters>(initialFilters)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const rows = React.useMemo<CollectionRow[]>(() => {
    if (!applied) return []
    const contributions = getAllContributions().filter((c) => {
      if (c.status !== "Posted") return false
      if (applied.dateFrom && c.paymentDate < applied.dateFrom) return false
      if (applied.dateTo && c.paymentDate > applied.dateTo) return false
      return true
    })
    const loanPayments = getAllLoanPayments().filter((p) => {
      if (p.status !== "Posted") return false
      if (applied.dateFrom && p.paymentDate < applied.dateFrom) return false
      if (applied.dateTo && p.paymentDate > applied.dateTo) return false
      return true
    })

    const map = new Map<string, { contributionsAmount: number; loanPaymentsAmount: number; count: number }>()
    for (const c of contributions) {
      const key = bucketKey(c.paymentDate, granularity)
      const entry = map.get(key) ?? { contributionsAmount: 0, loanPaymentsAmount: 0, count: 0 }
      entry.contributionsAmount += c.amount
      entry.count += 1
      map.set(key, entry)
    }
    for (const p of loanPayments) {
      const key = bucketKey(p.paymentDate, granularity)
      const entry = map.get(key) ?? { contributionsAmount: 0, loanPaymentsAmount: 0, count: 0 }
      entry.loanPaymentsAmount += p.amountPaid
      entry.count += 1
      map.set(key, entry)
    }

    return Array.from(map.entries())
      .map(([period, v]) => ({
        period,
        contributionsAmount: v.contributionsAmount,
        loanPaymentsAmount: v.loanPaymentsAmount,
        total: v.contributionsAmount + v.loanPaymentsAmount,
        count: v.count,
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }, [applied, granularity])

  const summary = React.useMemo(() => {
    const contributionsTotal = rows.reduce((sum, r) => sum + r.contributionsAmount, 0)
    const loanPaymentsTotal = rows.reduce((sum, r) => sum + r.loanPaymentsAmount, 0)
    const transactionCount = rows.reduce((sum, r) => sum + r.count, 0)
    return {
      totalCollected: contributionsTotal + loanPaymentsTotal,
      contributionsTotal,
      loanPaymentsTotal,
      transactionCount,
    }
  }, [rows])

  function handleGenerate() {
    setApplied(draft)
  }

  function handleReset() {
    setDraft(initialFilters)
    setApplied(null)
  }

  function handleExportCsv() {
    downloadCsv(
      `${slugify(title)}.csv`,
      ["Period", "Contributions Amount", "Loan Payments Amount", "Total", "Transaction Count"],
      rows.map((r) => [periodLabel(r.period, granularity), r.contributionsAmount.toFixed(2), r.loanPaymentsAmount.toFixed(2), r.total.toFixed(2), r.count])
    )
    toast.success(`${title} exported to CSV.`)
  }

  const columns: ColumnDef<CollectionRow, unknown>[] = [
    { accessorKey: "period", header: "Period", cell: ({ row }) => periodLabel(row.original.period, granularity) },
    { accessorKey: "contributionsAmount", header: "Contributions Amount", cell: ({ row }) => formatCurrency(row.original.contributionsAmount) },
    { accessorKey: "loanPaymentsAmount", header: "Loan Payments Amount", cell: ({ row }) => formatCurrency(row.original.loanPaymentsAmount) },
    { accessorKey: "total", header: "Total", cell: ({ row }) => formatCurrency(row.original.total) },
    { accessorKey: "count", header: "Transaction Count" },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title={title} description={description} />

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
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to build the {title.toLowerCase()}.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Collected" value={formatCurrency(summary.totalCollected)} icon={Banknote} tone="success" />
            <StatCard label="Contributions" value={formatCurrency(summary.contributionsTotal)} icon={Wallet} tone="primary" />
            <StatCard label="Loan Payments" value={formatCurrency(summary.loanPaymentsTotal)} icon={Banknote} tone="info" />
            <StatCard label="Transactions" value={String(summary.transactionCount)} icon={Hash} tone="gold" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Collections Per {granularity === "day" ? "Day" : granularity === "month" ? "Month" : "Year"}</h3>
            {rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No posted collections in range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="period" tickFormatter={(v) => periodLabel(v, granularity)} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`)} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name]} labelFormatter={(label) => periodLabel(label as string, granularity)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="contributionsAmount" name="Contributions" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={44} />
                  <Bar dataKey="loanPaymentsAmount" name="Loan Payments" fill="var(--color-info)" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No collections match your filters"
              emptyDescription="Try widening the date range."
            />
          </div>
        </>
      )}
    </div>
  )
}
