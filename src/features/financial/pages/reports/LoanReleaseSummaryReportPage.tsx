import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format, parseISO } from "date-fns"
import { ArrowLeft, Banknote, Download, Hash, RotateCcw, TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllLoans } from "@/services/loans.service"
import { formatCurrency, formatDateShort } from "@/utils/format"
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

interface LoanReleaseRow {
  id: string
  applicationNumber: string
  memberName: string
  officeName: string
  releaseDate: string
  releasedAmount: number
}

interface MonthlyRow {
  period: string
  amount: number
}

export default function LoanReleaseSummaryReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const rows = React.useMemo<LoanReleaseRow[]>(() => {
    if (!applied) return []
    return getAllLoans()
      .filter((l) => !!l.releaseDate)
      .filter((l) => {
        if (applied.dateFrom && l.releaseDate! < applied.dateFrom) return false
        if (applied.dateTo && l.releaseDate! > applied.dateTo) return false
        if (applied.office && l.officeName !== applied.office) return false
        return true
      })
      .map((l) => ({
        id: l.id,
        applicationNumber: l.applicationNumber,
        memberName: l.memberName,
        officeName: l.officeName,
        releaseDate: l.releaseDate!,
        releasedAmount: l.actualReleasedAmount ?? l.approvedAmount ?? l.requestedAmount,
      }))
      .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
  }, [applied])

  const monthlyData = React.useMemo<MonthlyRow[]>(() => {
    const map = new Map<string, number>()
    for (const r of rows) {
      const key = r.releaseDate.slice(0, 7)
      map.set(key, (map.get(key) ?? 0) + r.releasedAmount)
    }
    return Array.from(map.entries())
      .map(([period, amount]) => ({ period, amount }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }, [rows])

  const summary = React.useMemo(() => {
    const totalReleased = rows.reduce((sum, r) => sum + r.releasedAmount, 0)
    return {
      totalReleased,
      count: rows.length,
      average: rows.length > 0 ? totalReleased / rows.length : 0,
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
      "loan-release-summary-report.csv",
      ["Application #", "Member", "Office", "Release Date", "Released Amount"],
      rows.map((r) => [r.applicationNumber, r.memberName, r.officeName, r.releaseDate, r.releasedAmount.toFixed(2)])
    )
    toast.success("Loan release summary exported to CSV.")
  }

  const columns: ColumnDef<LoanReleaseRow, unknown>[] = [
    { accessorKey: "applicationNumber", header: "Application #", cell: ({ row }) => <Link to={`/loans/${row.original.id}`} className="font-medium text-foreground hover:text-primary hover:underline">{row.original.applicationNumber}</Link> },
    { accessorKey: "memberName", header: "Member" },
    { accessorKey: "officeName", header: "Office" },
    { accessorKey: "releaseDate", header: "Release Date", cell: ({ row }) => formatDateShort(row.original.releaseDate) },
    { accessorKey: "releasedAmount", header: "Released Amount", cell: ({ row }) => formatCurrency(row.original.releasedAmount) },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Loan Release Summary" description="Review loans that have been released, by amount, office, and date." />

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
          <PermissionButton permission="reports.export" size="sm" variant="outline" disabled={!applied} onClick={handleExportCsv}>
            <Download /> Export CSV
          </PermissionButton>
        </div>
      </div>

      {!applied ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to build the loan release summary.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Total Released" value={formatCurrency(summary.totalReleased)} icon={Banknote} tone="success" />
            <StatCard label="Loans Released" value={String(summary.count)} icon={Hash} tone="primary" />
            <StatCard label="Average Release" value={formatCurrency(summary.average)} icon={TrendingUp} tone="gold" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Released Amount Per Month</h3>
            {monthlyData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No released loans in range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="period" tickFormatter={monthTick} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`)} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Released"]} labelFormatter={(label) => monthTick(label as string)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No released loans match your filters"
              emptyDescription="Try widening the date range or clearing the office filter."
            />
          </div>
        </>
      )}
    </div>
  )
}
