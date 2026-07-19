import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format, parseISO } from "date-fns"
import { ArrowLeft, Banknote, Download, Hash, RotateCcw, Wallet } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { MemberSearchSelect } from "@/components/shared/MemberSearchSelect"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { ColumnDef } from "@tanstack/react-table"
import { getMemberLoans } from "@/services/loans.service"
import { getAllLoanPayments } from "@/services/loan-payments.service"
import { LOAN_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"
import type { LoanApplication } from "@/types"

function monthTick(value: string) {
  try {
    return format(parseISO(`${value}-01`), "MMM yyyy")
  } catch {
    return value
  }
}

interface PaymentTrendPoint {
  period: string
  amount: number
}

const ACTIVE_STATUSES = new Set(["Active", "Released", "Overdue", "Restructured"])

export default function MemberLoanLedgerReportPage() {
  const [draftMemberId, setDraftMemberId] = React.useState<string>("")
  const [appliedMemberId, setAppliedMemberId] = React.useState<string | null>(null)

  const rows = React.useMemo<LoanApplication[]>(() => {
    if (!appliedMemberId) return []
    return getMemberLoans(appliedMemberId).slice().sort((a, b) => b.applicationDate.localeCompare(a.applicationDate))
  }, [appliedMemberId])

  const memberName = rows[0]?.memberName ?? ""
  const memberOffice = rows[0]?.officeName ?? ""

  const payments = React.useMemo(() => {
    if (!appliedMemberId) return []
    return getAllLoanPayments()
      .filter((p) => p.memberId === appliedMemberId && p.status === "Posted")
      .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
  }, [appliedMemberId])

  const chartData = React.useMemo<PaymentTrendPoint[]>(() => {
    const map = new Map<string, number>()
    for (const p of payments) {
      const period = p.paymentDate.slice(0, 7)
      map.set(period, (map.get(period) ?? 0) + p.amountPaid)
    }
    return Array.from(map.entries())
      .map(([period, amount]) => ({ period, amount }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }, [payments])

  const summary = React.useMemo(() => {
    const totalBorrowed = rows.reduce((sum, l) => sum + (l.approvedAmount ?? l.requestedAmount), 0)
    const totalOutstanding = rows.reduce((sum, l) => sum + l.outstandingBalance, 0)
    const activeLoans = rows.filter((l) => ACTIVE_STATUSES.has(l.status)).length
    return {
      totalLoans: rows.length,
      totalBorrowed,
      totalOutstanding,
      activeLoans,
    }
  }, [rows])

  function handleGenerate() {
    if (!draftMemberId) return
    setAppliedMemberId(draftMemberId)
  }

  function handleReset() {
    setDraftMemberId("")
    setAppliedMemberId(null)
  }

  function handleExportCsv() {
    downloadCsv(
      `member-loan-ledger-${memberName || "report"}.csv`,
      ["Application #", "Loan Type", "Requested", "Outstanding", "Status", "Application Date"],
      rows.map((l) => [l.applicationNumber, l.loanTypeName, l.requestedAmount.toFixed(2), l.outstandingBalance.toFixed(2), l.status, l.applicationDate])
    )
    toast.success("Member loan ledger exported to CSV.")
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
    { accessorKey: "loanTypeName", header: "Loan Type" },
    { accessorKey: "requestedAmount", header: "Requested", cell: ({ row }) => formatCurrency(row.original.requestedAmount) },
    { accessorKey: "outstandingBalance", header: "Outstanding", cell: ({ row }) => formatCurrency(row.original.outstandingBalance) },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={LOAN_STATUS_TONE[row.original.status]} /> },
    { accessorKey: "applicationDate", header: "Application Date", cell: ({ row }) => formatDateShort(row.original.applicationDate) },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Member Loan Ledger" description="Review a member's full loan application record and payment history." />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Member</Label>
            <MemberSearchSelect value={draftMemberId || undefined} onSelect={setDraftMemberId} placeholder="Search by name or member number…" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={handleGenerate} disabled={!draftMemberId}>Generate</Button>
          <Button size="sm" variant="outline" onClick={handleReset}><RotateCcw /> Reset</Button>
          <PermissionButton permission="loans.export" size="sm" variant="outline" disabled={!appliedMemberId} onClick={handleExportCsv}>
            <Download /> Export CSV
          </PermissionButton>
        </div>
      </div>

      {!appliedMemberId ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">Search for a member and click <strong className="text-foreground">Generate</strong> to view their loan ledger.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="font-heading text-base font-semibold text-foreground">{memberName}</h2>
            <p className="text-sm text-muted-foreground">{memberOffice}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Loans" value={String(summary.totalLoans)} icon={Hash} tone="primary" />
            <StatCard label="Total Borrowed" value={formatCurrency(summary.totalBorrowed)} icon={Wallet} tone="gold" />
            <StatCard label="Total Outstanding" value={formatCurrency(summary.totalOutstanding)} icon={Banknote} tone="danger" />
            <StatCard label="Active Loans" value={String(summary.activeLoans)} icon={Banknote} tone="info" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Loan Payments Over Time</h3>
            {chartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No posted loan payments for this member.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="period" tickFormatter={monthTick} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`)} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Paid"]} labelFormatter={(label) => monthTick(label as string)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No loan records"
              emptyDescription="This member has no loan application history yet."
            />
          </div>
        </>
      )}
    </div>
  )
}
