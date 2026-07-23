import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowLeft, Banknote, Download, Hash, RotateCcw, TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CommandSelect } from "@/components/shared/CommandSelect"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllLoans, getLoanTypesSync } from "@/services/loans.service"
import { LOAN_STATUS_TONE } from "@/constants/status"
import { formatCurrency } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"
import type { LoanApplication } from "@/types"

interface Filters {
  office: string
  loanTypeId: string
}

const EMPTY_FILTERS: Filters = { office: "", loanTypeId: "" }

interface OfficeOutstanding {
  office: string
  outstanding: number
}

export default function OutstandingBalancesReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const loanTypes = React.useMemo(() => getLoanTypesSync(), [])

  const rows = React.useMemo<LoanApplication[]>(() => {
    if (!applied) return []
    return getAllLoans()
      .filter((l) => l.outstandingBalance > 0)
      .filter((l) => {
        if (applied.office && l.officeName !== applied.office) return false
        if (applied.loanTypeId && l.loanTypeId !== applied.loanTypeId) return false
        return true
      })
      .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
  }, [applied])

  const officeChartData = React.useMemo<OfficeOutstanding[]>(() => {
    const map = new Map<string, number>()
    for (const l of rows) map.set(l.officeName, (map.get(l.officeName) ?? 0) + l.outstandingBalance)
    return Array.from(map.entries())
      .map(([office, outstanding]) => ({ office, outstanding }))
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 6)
  }, [rows])

  const summary = React.useMemo(() => {
    const totalOutstanding = rows.reduce((sum, l) => sum + l.outstandingBalance, 0)
    return {
      totalOutstanding,
      count: rows.length,
      average: rows.length > 0 ? totalOutstanding / rows.length : 0,
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
      "outstanding-balances-report.csv",
      ["Application #", "Member", "Office", "Loan Type", "Outstanding Balance", "Status"],
      rows.map((l) => [l.applicationNumber, l.memberName, l.officeName, l.loanTypeName, l.outstandingBalance.toFixed(2), l.status])
    )
    toast.success("Outstanding balances report exported to CSV.")
  }

  const columns: ColumnDef<LoanApplication, unknown>[] = [
    {
      accessorKey: "applicationNumber",
      header: "Application #",
      cell: ({ row }) => (
        <Link to={`/loans/${row.original.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
          {row.original.applicationNumber}
        </Link>
      ),
    },
    { accessorKey: "memberName", header: "Member" },
    { accessorKey: "officeName", header: "Office" },
    { accessorKey: "loanTypeName", header: "Loan Type" },
    { accessorKey: "outstandingBalance", header: "Outstanding Balance", cell: ({ row }) => formatCurrency(row.original.outstandingBalance) },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={LOAN_STATUS_TONE[row.original.status]} /> },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Outstanding Balances" description="Track loans with a remaining outstanding balance across the association." />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Office</Label>
            <OfficeSelect value={draft.office} onValueChange={(v) => setDraft((f) => ({ ...f, office: v }))} placeholder="All Offices" activeOnly={false} />
          </div>
          <div className="space-y-1.5">
            <Label>Loan Type</Label>
            <CommandSelect
              className="w-full"
              value={draft.loanTypeId || "__all__"}
              onValueChange={(v) => setDraft((f) => ({ ...f, loanTypeId: v === "__all__" ? "" : v }))}
              options={[{ value: "__all__", label: "All Loan Types" }, ...loanTypes.map((t) => ({ value: t.id, label: t.name }))]}
              placeholder="All Loan Types"
            />
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
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to build the outstanding balances report.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Total Outstanding" value={formatCurrency(summary.totalOutstanding)} icon={Banknote} tone="danger" />
            <StatCard label="Loans With Balance" value={String(summary.count)} icon={Hash} tone="primary" />
            <StatCard label="Average Balance" value={formatCurrency(summary.average)} icon={TrendingUp} tone="gold" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Outstanding Balance Per Office</h3>
            {officeChartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No outstanding balances match your filters.</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={officeChartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="office" width={120} tick={{ fill: "var(--color-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Outstanding"]} cursor={{ fill: "var(--color-muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Bar dataKey="outstanding" fill="var(--color-destructive)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No outstanding balances"
              emptyDescription="No loans with an outstanding balance match your filters."
            />
          </div>
        </>
      )}
    </div>
  )
}
