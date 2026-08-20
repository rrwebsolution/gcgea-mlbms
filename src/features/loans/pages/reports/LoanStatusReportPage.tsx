import * as React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowLeft, Banknote, Download, Eye, Hash, RotateCcw, Wallet } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { ReportDataTable } from "@/features/reports/components/ReportDataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CommandSelect } from "@/components/shared/CommandSelect"
import type { ColumnDef } from "@tanstack/react-table"
import { listAllLoans, listLoanTypes } from "@/services/loans.service"
import { LOAN_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"
import type { LoanApplication, LoanStatus } from "@/types"
import { ReportGenerateButton } from "@/features/reports/components/ReportGenerateButton"

const ALL_STATUSES: LoanStatus[] = [
  "Draft",
  "Submitted",
  "Under Review",
  "For Approval",
  "Approved",
  "Rejected",
  "Released",
  "Active",
  "Fully Paid",
  "Cancelled",
  "Overdue",
  "Restructured",
]

interface Filters {
  office: string
  loanTypeId: string
  status: string
  dateFrom: string
  dateTo: string
}

const EMPTY_FILTERS: Filters = { office: "", loanTypeId: "", status: "", dateFrom: "", dateTo: "" }

interface OfficeCount {
  office: string
  count: number
}

interface LoanStatusReportPageProps {
  status?: LoanStatus
  statuses?: LoanStatus[]
  title: string
  description: string
  /** Adds a "View Statement" row action linking to the printable Statement of Loan — only meaningful once a loan has release data. */
  showStatementAction?: boolean
}

export default function LoanStatusReportPage({ status, statuses, title, description, showStatementAction }: LoanStatusReportPageProps) {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(EMPTY_FILTERS)

  const { data: allLoans = [], isLoading, isError } = useQuery({
    queryKey: ["loans", "all"],
    queryFn: listAllLoans,
  })
  const { data: loanTypes = [] } = useQuery({
    queryKey: ["loan-types"],
    queryFn: listLoanTypes,
  })
  const hasFixedStatuses = Boolean(status || statuses?.length)

  const rows = React.useMemo<LoanApplication[]>(() => {
    if (!applied) return []
    return allLoans
      .filter((l) => {
        if (statuses) {
          if (!statuses.includes(l.status)) return false
        } else if (status) {
          // Approved and Released are workflow milestones. Loans retain those
          // milestones after their current status advances to Active/Overdue/
          // Fully Paid, so use their persisted approval/release fields too.
          if (status === "Approved") {
            if (!(l.status === "Approved" || (l.approvedAmount ?? 0) > 0)) return false
          } else if (status === "Released") {
            if (!(l.status === "Released" || Boolean(l.releaseDate))) return false
          } else if (l.status !== status) return false
        } else if (applied.status && l.status !== applied.status) {
          return false
        }
        if (applied.office && l.officeName !== applied.office) return false
        if (applied.loanTypeId && l.loanTypeId !== applied.loanTypeId) return false
        if (applied.dateFrom && l.applicationDate < applied.dateFrom) return false
        if (applied.dateTo && l.applicationDate > applied.dateTo) return false
        return true
      })
      .sort((a, b) => b.applicationDate.localeCompare(a.applicationDate))
  }, [allLoans, applied, status, statuses])

  const officeChartData = React.useMemo<OfficeCount[]>(() => {
    const map = new Map<string, number>()
    for (const l of rows) map.set(l.officeName, (map.get(l.officeName) ?? 0) + 1)
    return Array.from(map.entries())
      .map(([office, count]) => ({ office, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [rows])

  const summary = React.useMemo(() => {
    const totalRequested = rows.reduce((sum, l) => sum + l.requestedAmount, 0)
    const totalOutstanding = rows.reduce((sum, l) => sum + l.outstandingBalance, 0)
    return { count: rows.length, totalRequested, totalOutstanding }
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
      `${title.toLowerCase().replace(/\s+/g, "-")}-report.csv`,
      ["Application #", "Member", "Office", "Loan Type", "Requested", "Outstanding", "Status", "Application Date"],
      rows.map((l) => [
        l.applicationNumber,
        l.memberName,
        l.officeName,
        l.loanTypeName,
        l.requestedAmount.toFixed(2),
        l.outstandingBalance.toFixed(2),
        l.status,
        l.applicationDate,
      ])
    )
    toast.success(`${title} report exported to CSV.`)
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
    {
      accessorKey: "applicationType",
      header: "Application Type",
      cell: ({ row }) => row.original.applicationType === "reloan" ? "Reloan" : "New Loan",
    },
    { accessorKey: "requestedAmount", header: "Requested", cell: ({ row }) => formatCurrency(row.original.requestedAmount) },
    { accessorKey: "outstandingBalance", header: "Outstanding", cell: ({ row }) => formatCurrency(row.original.outstandingBalance) },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={LOAN_STATUS_TONE[row.original.status]} /> },
    { accessorKey: "applicationDate", header: "Application Date", cell: ({ row }) => formatDateShort(row.original.applicationDate) },
    ...(showStatementAction
      ? [{
          id: "actions",
          header: "Actions",
          cell: ({ row }: { row: { original: LoanApplication } }) => (
            <Button variant="ghost" size="sm" render={<Link to={`/loans/${row.original.id}/statement`} />}>
              <Eye /> View Statement
            </Button>
          ),
        } satisfies ColumnDef<LoanApplication, unknown>]
      : []),
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title={title} description={description} />

      <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xs backdrop-blur-xs">
        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${hasFixedStatuses ? "lg:grid-cols-4" : "lg:grid-cols-5"}`}>
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
          {!hasFixedStatuses && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <CommandSelect
                className="w-full"
                value={draft.status || "__all__"}
                onValueChange={(v) => setDraft((f) => ({ ...f, status: v === "__all__" ? "" : v }))}
                options={[{ value: "__all__", label: "All Statuses" }, ...ALL_STATUSES.map((s) => ({ value: s, label: s }))]}
                placeholder="All Statuses"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Application Date From</Label>
            <Input type="date" value={draft.dateFrom} onChange={(e) => setDraft((f) => ({ ...f, dateFrom: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Application Date To</Label>
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
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to build the {title.toLowerCase()} report.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Loans" value={String(summary.count)} icon={Hash} tone="primary" />
            <StatCard label="Total Requested" value={formatCurrency(summary.totalRequested)} icon={Wallet} tone="gold" />
            <StatCard label="Total Outstanding" value={formatCurrency(summary.totalOutstanding)} icon={Banknote} tone="info" />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xs backdrop-blur-xs">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Loans Per Office</h3>
            {officeChartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No loans match your filters.</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={officeChartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis type="category" dataKey="office" width={120} tick={{ fill: "var(--color-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [value, "Loans"]} cursor={{ fill: "var(--color-muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
            <ReportDataTable
              columns={columns}
              data={rows}
              isLoading={isLoading}
              isError={isError}
              emptyTitle="No loans match your filters"
              emptyDescription="Try widening the date range or clearing some filters."
            />
          </div>
        </>
      )}
    </div>
  )
}
