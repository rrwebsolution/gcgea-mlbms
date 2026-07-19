import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowLeft, Banknote, Building2, Download, RotateCcw } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllBenefits } from "@/services/benefits.service"
import { formatCurrency } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"

const PIE_COLORS = ["var(--color-primary)", "var(--color-success)", "var(--color-gold)", "var(--color-info)", "var(--color-warning)", "var(--color-destructive)"]

interface Filters {
  dateFrom: string
  dateTo: string
}

const EMPTY_FILTERS: Filters = { dateFrom: "", dateTo: "" }

interface OfficeRow {
  office: string
  count: number
  totalRequested: number
  totalApproved: number
  share: number
}

export default function BenefitsByOfficeReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const rows = React.useMemo<OfficeRow[]>(() => {
    if (!applied) return []
    const filtered = getAllBenefits().filter((b) => {
      if (applied.dateFrom && b.applicationDate < applied.dateFrom) return false
      if (applied.dateTo && b.applicationDate > applied.dateTo) return false
      return true
    })
    const totalRequested = filtered.reduce((sum, b) => sum + b.requestedAmount, 0)
    const map = new Map<string, { count: number; totalRequested: number; totalApproved: number }>()
    for (const b of filtered) {
      const entry = map.get(b.officeName) ?? { count: 0, totalRequested: 0, totalApproved: 0 }
      entry.count += 1
      entry.totalRequested += b.requestedAmount
      entry.totalApproved += b.approvedAmount ?? 0
      map.set(b.officeName, entry)
    }
    return Array.from(map.entries())
      .map(([office, v]) => ({
        office,
        count: v.count,
        totalRequested: v.totalRequested,
        totalApproved: v.totalApproved,
        share: totalRequested > 0 ? (v.totalRequested / totalRequested) * 100 : 0,
      }))
      .sort((a, b) => b.totalRequested - a.totalRequested)
  }, [applied])

  const summary = React.useMemo(() => {
    const totalRequested = rows.reduce((sum, r) => sum + r.totalRequested, 0)
    return {
      offices: rows.length,
      totalRequested,
      topOffice: rows[0]?.office ?? "—",
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
      "benefits-by-office-report.csv",
      ["Office", "Applications", "Total Requested", "Total Approved", "Share %"],
      rows.map((r) => [r.office, r.count, r.totalRequested.toFixed(2), r.totalApproved.toFixed(2), r.share.toFixed(1)])
    )
    toast.success("Benefits by office report exported to CSV.")
  }

  const columns: ColumnDef<OfficeRow, unknown>[] = [
    { accessorKey: "office", header: "Office" },
    { accessorKey: "count", header: "Applications" },
    { accessorKey: "totalRequested", header: "Total Requested", cell: ({ row }) => formatCurrency(row.original.totalRequested) },
    { accessorKey: "totalApproved", header: "Total Approved", cell: ({ row }) => formatCurrency(row.original.totalApproved) },
    { accessorKey: "share", header: "Share", cell: ({ row }) => `${row.original.share.toFixed(1)}%` },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Benefits by Office" description="Compare benefit applications and amounts across member offices." />

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
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={handleGenerate}>Generate</Button>
          <Button size="sm" variant="outline" onClick={handleReset}><RotateCcw /> Reset Filters</Button>
          <PermissionButton permission="benefits.export" size="sm" variant="outline" disabled={!applied} onClick={handleExportCsv}>
            <Download /> Export CSV
          </PermissionButton>
        </div>
      </div>

      {!applied ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to build the benefits by office report.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Offices Reporting" value={String(summary.offices)} icon={Building2} tone="primary" />
            <StatCard label="Total Requested" value={formatCurrency(summary.totalRequested)} icon={Banknote} tone="success" />
            <StatCard label="Top Office" value={summary.topOffice} icon={Building2} tone="gold" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Requested Amount Per Office</h3>
              {rows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No benefit applications in range.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={rows.slice(0, 6)} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="office" width={120} tick={{ fill: "var(--color-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Requested"]} cursor={{ fill: "var(--color-muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                    <Bar dataKey="totalRequested" fill="var(--color-primary)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Share of Total Requested</h3>
              {rows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No benefit applications in range.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={rows.slice(0, 6)} dataKey="totalRequested" nameKey="office" cx="50%" cy="50%" outerRadius={90} label={(props: { name?: string; percent?: number }) => `${props.name} (${((props.percent ?? 0) * 100).toFixed(0)}%)`}>
                      {rows.slice(0, 6).map((entry, idx) => <Cell key={entry.office} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Requested"]} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No benefit applications match your filters"
              emptyDescription="Try widening the date range."
            />
          </div>
        </>
      )}
    </div>
  )
}
