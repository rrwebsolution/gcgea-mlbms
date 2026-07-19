import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format, parseISO } from "date-fns"
import { ArrowLeft, Banknote, Download, RotateCcw, TrendingUp, Wallet } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllContributions } from "@/services/contributions.service"
import { formatCurrency } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"

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
  office: string
}

const EMPTY_FILTERS: Filters = { dateFrom: "", dateTo: "", office: "" }

interface MonthlyRow {
  period: string
  amount: number
  count: number
  average: number
}

export default function MonthlyContributionsReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const rows = React.useMemo<MonthlyRow[]>(() => {
    if (!applied) return []
    const filtered = getAllContributions().filter((c) => {
      if (c.status !== "Posted") return false
      if (applied.dateFrom && c.paymentDate < applied.dateFrom) return false
      if (applied.dateTo && c.paymentDate > applied.dateTo) return false
      if (applied.office && c.officeName !== applied.office) return false
      return true
    })
    const map = new Map<string, { amount: number; count: number }>()
    for (const c of filtered) {
      const entry = map.get(c.contributionPeriod) ?? { amount: 0, count: 0 }
      entry.amount += c.amount
      entry.count += 1
      map.set(c.contributionPeriod, entry)
    }
    return Array.from(map.entries())
      .map(([period, v]) => ({ period, amount: v.amount, count: v.count, average: v.amount / v.count }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }, [applied])

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
    setApplied(null)
  }

  function handleExportCsv() {
    downloadCsv(
      "monthly-contributions-report.csv",
      ["Period", "Total Collected", "Contributions", "Average"],
      rows.map((r) => [r.period, r.amount.toFixed(2), r.count, r.average.toFixed(2)])
    )
    toast.success("Monthly contributions report exported to CSV.")
  }

  const columns: ColumnDef<MonthlyRow, unknown>[] = [
    { accessorKey: "period", header: "Period", cell: ({ row }) => monthTick(row.original.period) },
    { accessorKey: "count", header: "Contributions" },
    { accessorKey: "amount", header: "Total Collected", cell: ({ row }) => formatCurrency(row.original.amount) },
    { accessorKey: "average", header: "Average", cell: ({ row }) => formatCurrency(row.original.average) },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Monthly Contributions" description="Track total contributions collected per month across the association." />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Date From</Label>
            <Input type="date" value={draft.dateFrom} onChange={(e) => setDraft((f) => ({ ...f, dateFrom: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Date To</Label>
            <Input type="date" value={draft.dateTo} onChange={(e) => setDraft((f) => ({ ...f, dateTo: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Office</Label>
            <OfficeSelect value={draft.office} onValueChange={(v) => setDraft((f) => ({ ...f, office: v }))} placeholder="All Offices" activeOnly={false} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={handleGenerate}>Generate</Button>
          <Button size="sm" variant="outline" onClick={handleReset}><RotateCcw /> Reset Filters</Button>
          <PermissionButton permission="contributions.export" size="sm" variant="outline" disabled={!applied} onClick={handleExportCsv}>
            <Download /> Export CSV
          </PermissionButton>
        </div>
      </div>

      {!applied ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to build the monthly contributions report.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Months Reported" value={String(summary.months)} icon={Wallet} tone="primary" />
            <StatCard label="Total Collected" value={formatCurrency(summary.totalCollected)} icon={Banknote} tone="success" />
            <StatCard label="Monthly Average" value={formatCurrency(summary.average)} icon={TrendingUp} tone="gold" />
            <StatCard label="Highest Month" value={formatCurrency(summary.highest)} icon={Banknote} tone="info" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Collections Per Month</h3>
            {rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No posted contributions in range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="period" tickFormatter={monthTick} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <YAxis tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Collected"]} labelFormatter={(label) => monthTick(label as string)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No contributions match your filters"
              emptyDescription="Try widening the date range or clearing the office filter."
            />
          </div>
        </>
      )}
    </div>
  )
}
