import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowLeft, Banknote, Building2, Download, RotateCcw, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllContributions, getContributionPeriods } from "@/services/contributions.service"
import { formatCurrency } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"

const PIE_COLORS = ["var(--color-primary)", "var(--color-success)", "var(--color-gold)", "var(--color-info)", "var(--color-warning)", "var(--color-destructive)"]

interface Filters {
  dateFrom: string
  dateTo: string
  period: string
}

const EMPTY_FILTERS: Filters = { dateFrom: "", dateTo: "", period: "" }

interface OfficeRow {
  office: string
  memberNames: string
  amount: number
  count: number
  members: number
  share: number
}

export default function ContributionsByOfficeReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const periods = React.useMemo(() => getContributionPeriods(), [])

  const rows = React.useMemo<OfficeRow[]>(() => {
    if (!applied) return []
    const filtered = getAllContributions().filter((c) => {
      if (c.status !== "Posted") return false
      if (applied.dateFrom && c.paymentDate < applied.dateFrom) return false
      if (applied.dateTo && c.paymentDate > applied.dateTo) return false
      if (applied.period && c.contributionPeriod !== applied.period) return false
      return true
    })
    const totalCollected = filtered.reduce((sum, c) => sum + c.amount, 0)
    const map = new Map<string, { amount: number; count: number; members: Set<string>; memberNames: Set<string> }>()
    for (const c of filtered) {
      const entry = map.get(c.officeName) ?? { amount: 0, count: 0, members: new Set<string>(), memberNames: new Set<string>() }
      entry.amount += c.amount
      entry.count += 1
      entry.members.add(c.memberId)
      entry.memberNames.add(c.memberName)
      map.set(c.officeName, entry)
    }
    return Array.from(map.entries())
      .map(([office, v]) => ({ office, memberNames: Array.from(v.memberNames).sort().map((name) => `* ${name}`).join("\n"), amount: v.amount, count: v.count, members: v.members.size, share: totalCollected > 0 ? (v.amount / totalCollected) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount)
  }, [applied])

  const summary = React.useMemo(() => {
    const totalCollected = rows.reduce((sum, r) => sum + r.amount, 0)
    return {
      offices: rows.length,
      totalCollected,
      topOffice: rows[0]?.office ?? "—",
      topOfficeAmount: rows[0]?.amount ?? 0,
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
      "contributions-by-office-report.csv",
      ["Office", "Total Collected", "Contributions", "Contributing Members", "Share %"],
      rows.map((r) => [r.office, r.amount.toFixed(2), r.count, r.members, r.share.toFixed(1)])
    )
    toast.success("Contributions by office report exported to CSV.")
  }

  const columns: ColumnDef<OfficeRow, unknown>[] = [
    { accessorKey: "office", header: "Office" },
    { accessorKey: "memberNames", header: "Member Name(s)", cell: ({ row }) => <span className="whitespace-pre-line">{row.original.memberNames}</span> },
    { accessorKey: "members", header: "Contributing Members" },
    { accessorKey: "amount", header: "Total Collected", cell: ({ row }) => formatCurrency(row.original.amount) },
    { accessorKey: "share", header: "Share", cell: ({ row }) => `${row.original.share.toFixed(1)}%` },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Contributions by Office" description="Compare contribution collections across member offices." />

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
            <Label>Contribution Period</Label>
            <CommandSelect
              className="w-full"
              value={draft.period || "__all__"}
              onValueChange={(v) => setDraft((f) => ({ ...f, period: v === "__all__" ? "" : v }))}
              options={[{ value: "__all__", label: "All Periods" }, ...periods.map((p) => ({ value: p, label: p }))]}
              placeholder="All Periods"
            />
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
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to build the contributions by office report.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Offices Reporting" value={String(summary.offices)} icon={Building2} tone="primary" />
            <StatCard label="Total Collected" value={formatCurrency(summary.totalCollected)} icon={Banknote} tone="success" />
            <StatCard label="Top Office" value={summary.topOffice} icon={Users} tone="gold" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Collections Per Office</h3>
              {rows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No posted contributions in range.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={rows.slice(0, 6)} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="office" width={120} tick={{ fill: "var(--color-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Collected"]} cursor={{ fill: "var(--color-muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                    <Bar dataKey="amount" fill="var(--color-primary)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Share of Total Collections</h3>
              {rows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No posted contributions in range.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={rows.slice(0, 6)} dataKey="amount" nameKey="office" cx="50%" cy="50%" outerRadius={90} label={(props: { name?: string; percent?: number }) => `${props.name} (${((props.percent ?? 0) * 100).toFixed(0)}%)`}>
                      {rows.slice(0, 6).map((entry, idx) => <Cell key={entry.office} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Collected"]} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No contributions match your filters"
              emptyDescription="Try widening the date range or clearing the period filter."
            />
          </div>
        </>
      )}
    </div>
  )
}
