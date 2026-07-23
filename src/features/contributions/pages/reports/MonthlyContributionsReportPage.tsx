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
import { getAllDeductions } from "@/services/deductions.service"
import { getAllActiveMembers } from "@/services/members.service"
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

interface MonthlySummaryRow {
  period: string
  amount: number
  count: number
  average: number
}

interface MonthlyContributionRow {
  id: string
  sequence: number
  period: string
  memberName: string
  officeName: string
  recordSource: "Contribution" | "Deduction"
  recordType: string
  memberRecordCount: number
  amount: number
  paymentDate: string
  paymentMethod: string
  referenceNumber: string
}

export default function MonthlyContributionsReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const filteredContributions = React.useMemo(() => {
    if (!applied) return []
    return getAllContributions().filter((c) => {
      if (c.status !== "Posted") return false
      if (applied.dateFrom && c.paymentDate < applied.dateFrom) return false
      if (applied.dateTo && c.paymentDate > applied.dateTo) return false
      if (applied.office && c.officeName !== applied.office) return false
      return true
    })
  }, [applied])

  const rows = React.useMemo<MonthlyContributionRow[]>(() => {
    if (!applied) return []
    const membersById = new Map(getAllActiveMembers().map((member) => [member.id, member]))
    const contributionRecords = filteredContributions.map((contribution) => ({
        id: contribution.id,
        memberId: contribution.memberId,
        period: contribution.contributionPeriod,
        memberName: contribution.memberName,
        officeName: contribution.officeName,
        recordSource: "Contribution" as const,
        recordType: contribution.contributionType,
        amount: contribution.amount,
        paymentDate: contribution.paymentDate,
        paymentMethod: contribution.paymentMethod,
        referenceNumber: contribution.referenceNumber,
    }))
    const deductionRecords = getAllDeductions()
      .filter((deduction) => {
        if (deduction.status !== "Posted") return false
        if (applied.dateFrom && deduction.paymentDate < applied.dateFrom) return false
        if (applied.dateTo && deduction.paymentDate > applied.dateTo) return false
        const officeName = membersById.get(deduction.memberId)?.officeName ?? ""
        if (applied.office && officeName !== applied.office) return false
        return true
      })
      .map((deduction) => ({
        id: `deduction-${deduction.id}`,
        memberId: deduction.memberId,
        period: deduction.period,
        memberName: deduction.memberName ?? membersById.get(deduction.memberId)?.fullName ?? "Unknown Member",
        officeName: membersById.get(deduction.memberId)?.officeName ?? "",
        recordSource: "Deduction" as const,
        recordType: deduction.deductionTypeName ?? deduction.deductionTypeCode ?? "Deduction",
        amount: deduction.amount,
        paymentDate: deduction.paymentDate,
        paymentMethod: "Payroll Deduction",
        referenceNumber: deduction.referenceNumber,
      }))
    const combined = [...contributionRecords, ...deductionRecords]
    const counts = new Map<string, number>()
    for (const record of combined) {
      const key = `${record.memberId}:${record.recordSource}:${record.recordType}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    return combined
      .sort((a, b) => b.period.localeCompare(a.period) || a.memberName.localeCompare(b.memberName))
      .map((record, index) => ({
        ...record,
        sequence: index + 1,
        memberRecordCount: counts.get(`${record.memberId}:${record.recordSource}:${record.recordType}`) ?? 0,
      }))
  }, [applied, filteredContributions])

  const monthlySummary = React.useMemo<MonthlySummaryRow[]>(() => {
    const map = new Map<string, { amount: number; count: number }>()
    for (const c of rows) {
      const entry = map.get(c.period) ?? { amount: 0, count: 0 }
      entry.amount += c.amount
      entry.count += 1
      map.set(c.period, entry)
    }
    return Array.from(map.entries())
      .map(([period, v]) => ({ period, amount: v.amount, count: v.count, average: v.amount / v.count }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }, [rows])

  const summary = React.useMemo(() => {
    const totalCollected = rows.reduce((sum, r) => sum + r.amount, 0)
    const highest = monthlySummary.reduce((max, r) => Math.max(max, r.amount), 0)
    return {
      months: monthlySummary.length,
      contributions: rows.length,
      totalCollected,
      average: monthlySummary.length > 0 ? totalCollected / monthlySummary.length : 0,
      highest,
    }
  }, [rows, monthlySummary])

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
      ["No.", "Period", "Member Name", "Office", "Record Source", "Contribution / Deduction Type", "Record Count", "Amount", "Payment Date", "Payment Method", "Reference Number"],
      rows.map((r) => [r.sequence, r.period, r.memberName, r.officeName, r.recordSource, r.recordType, r.memberRecordCount, r.amount.toFixed(2), r.paymentDate, r.paymentMethod, r.referenceNumber])
    )
    toast.success("Monthly contributions report exported to CSV.")
  }

  const columns: ColumnDef<MonthlyContributionRow, unknown>[] = [
    { accessorKey: "sequence", header: "No." },
    { accessorKey: "period", header: "Period", cell: ({ row }) => monthTick(row.original.period) },
    { accessorKey: "memberName", header: "Member Name" },
    { accessorKey: "officeName", header: "Office" },
    { accessorKey: "recordSource", header: "Record Source" },
    { accessorKey: "recordType", header: "Contribution / Deduction Type" },
    { accessorKey: "memberRecordCount", header: "Record Count" },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => formatCurrency(row.original.amount) },
    { accessorKey: "paymentDate", header: "Payment Date" },
    { accessorKey: "paymentMethod", header: "Payment Method" },
    { accessorKey: "referenceNumber", header: "Reference No." },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Monthly Contributions" description="Review member contributions together with Cash Pabaon and other posted deductions." />

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
            <StatCard label="Contribution & Deduction Records" value={String(summary.contributions)} icon={Wallet} tone="primary" />
            <StatCard label="Total Collected" value={formatCurrency(summary.totalCollected)} icon={Banknote} tone="success" />
            <StatCard label="Monthly Average" value={formatCurrency(summary.average)} icon={TrendingUp} tone="gold" />
            <StatCard label="Highest Month" value={formatCurrency(summary.highest)} icon={Banknote} tone="info" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Contributions and Deductions Per Month</h3>
            {rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No posted contributions in range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlySummary} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
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
              getRowId={(row) => row.id}
              emptyTitle="No contributions match your filters"
              emptyDescription="Try widening the date range or clearing the office filter."
            />
          </div>
        </>
      )}
    </div>
  )
}
