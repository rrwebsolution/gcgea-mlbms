import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowLeft, Banknote, Download, Hash, RotateCcw, Wallet } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllContributions, getContributionPeriods } from "@/services/contributions.service"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"
import type { Contribution } from "@/types"

interface Filters {
  period: string
  office: string
  dateFrom: string
  dateTo: string
}

const EMPTY_FILTERS: Filters = { period: "", office: "", dateFrom: "", dateTo: "" }

interface OfficeTotal {
  office: string
  amount: number
}

export default function PayrollDeductionSummaryReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const periods = React.useMemo(() => getContributionPeriods(), [])

  const rows = React.useMemo<Contribution[]>(() => {
    if (!applied) return []
    return getAllContributions()
      .filter((c) => c.status === "Posted" && c.paymentMethod === "Payroll Deduction")
      .filter((c) => {
        if (applied.period && c.contributionPeriod !== applied.period) return false
        if (applied.office && c.officeName !== applied.office) return false
        if (applied.dateFrom && c.paymentDate < applied.dateFrom) return false
        if (applied.dateTo && c.paymentDate > applied.dateTo) return false
        return true
      })
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
  }, [applied])

  const officeData = React.useMemo<OfficeTotal[]>(() => {
    const map = new Map<string, number>()
    for (const c of rows) map.set(c.officeName, (map.get(c.officeName) ?? 0) + c.amount)
    return Array.from(map.entries()).map(([office, amount]) => ({ office, amount })).sort((a, b) => b.amount - a.amount).slice(0, 10)
  }, [rows])

  const summary = React.useMemo(() => {
    const totalDeducted = rows.reduce((sum, c) => sum + c.amount, 0)
    const memberCount = new Set(rows.map((c) => c.memberId)).size
    const payrollRefs = new Set(rows.map((c) => c.payrollReference).filter(Boolean)).size
    return {
      totalDeducted,
      memberCount,
      payrollRefs,
      average: rows.length > 0 ? totalDeducted / rows.length : 0,
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
      "payroll-deduction-summary-report.csv",
      ["Payroll Reference", "Member", "Office", "Period", "Amount", "Payment Date"],
      rows.map((c) => [c.payrollReference ?? "", c.memberName, c.officeName, c.contributionPeriod, c.amount.toFixed(2), c.paymentDate])
    )
    toast.success("Payroll deduction summary exported to CSV.")
  }

  const columns: ColumnDef<Contribution, unknown>[] = [
    { accessorKey: "payrollReference", header: "Payroll Reference", cell: ({ row }) => row.original.payrollReference || "—" },
    { accessorKey: "memberName", header: "Member" },
    { accessorKey: "officeName", header: "Office" },
    { accessorKey: "contributionPeriod", header: "Period" },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => formatCurrency(row.original.amount) },
    { accessorKey: "paymentDate", header: "Payment Date", cell: ({ row }) => formatDateShort(row.original.paymentDate) },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Payroll Deduction Summary" description="Summarize contributions collected through payroll deduction." />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="space-y-1.5">
            <Label>Office</Label>
            <OfficeSelect value={draft.office} onValueChange={(v) => setDraft((f) => ({ ...f, office: v }))} placeholder="All Offices" activeOnly={false} />
          </div>
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
          <PermissionButton permission="contributions.export" size="sm" variant="outline" disabled={!applied} onClick={handleExportCsv}>
            <Download /> Export CSV
          </PermissionButton>
        </div>
      </div>

      {!applied ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to build the payroll deduction summary.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Deducted" value={formatCurrency(summary.totalDeducted)} icon={Banknote} tone="success" />
            <StatCard label="Members" value={String(summary.memberCount)} icon={Wallet} tone="primary" />
            <StatCard label="Payroll References" value={String(summary.payrollRefs)} icon={Hash} tone="info" />
            <StatCard label="Average Deduction" value={formatCurrency(summary.average)} icon={Banknote} tone="gold" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Payroll Deductions Per Office</h3>
            {officeData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No payroll deductions match your filters.</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={officeData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="office" width={120} tick={{ fill: "var(--color-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Deducted"]} cursor={{ fill: "var(--color-muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Bar dataKey="amount" fill="var(--color-primary)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No payroll deductions found"
              emptyDescription="Try widening the date range or clearing some filters."
            />
          </div>
        </>
      )}
    </div>
  )
}
