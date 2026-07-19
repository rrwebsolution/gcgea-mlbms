import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format, parseISO } from "date-fns"
import { ArrowLeft, Banknote, Calendar, Download, Hash, RotateCcw, TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { MemberSearchSelect } from "@/components/shared/MemberSearchSelect"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllContributions } from "@/services/contributions.service"
import { CONTRIBUTION_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"
import type { Contribution } from "@/types"

function monthTick(value: string) {
  try {
    return format(parseISO(`${value}-01`), "MMM yyyy")
  } catch {
    return value
  }
}

export default function MemberContributionHistoryReportPage() {
  const [draftMemberId, setDraftMemberId] = React.useState<string>("")
  const [appliedMemberId, setAppliedMemberId] = React.useState<string | null>(null)

  const rows = React.useMemo<Contribution[]>(() => {
    if (!appliedMemberId) return []
    return getAllContributions()
      .filter((c) => c.memberId === appliedMemberId)
      .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
  }, [appliedMemberId])

  const posted = rows.filter((c) => c.status === "Posted")
  const memberName = rows[0]?.memberName ?? ""
  const memberOffice = rows[0]?.officeName ?? ""

  const chartData = React.useMemo(() => posted.map((c) => ({ period: c.contributionPeriod, amount: c.amount })), [posted])

  const summary = React.useMemo(() => {
    const totalPaid = posted.reduce((sum, c) => sum + c.amount, 0)
    return {
      totalPaid,
      payments: posted.length,
      average: posted.length > 0 ? totalPaid / posted.length : 0,
      lastPaymentDate: posted.length > 0 ? posted[posted.length - 1].paymentDate : null,
    }
  }, [posted])

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
      `member-contribution-history-${memberName || "report"}.csv`,
      ["Reference #", "Period", "Amount", "Payment Date", "Method", "Status"],
      rows.map((c) => [c.referenceNumber, c.contributionPeriod, c.amount.toFixed(2), c.paymentDate, c.paymentMethod, c.status])
    )
    toast.success("Member contribution history exported to CSV.")
  }

  const columns: ColumnDef<Contribution, unknown>[] = [
    { accessorKey: "referenceNumber", header: "Reference", cell: ({ row }) => <Link to={`/contributions/${row.original.id}`} className="font-medium text-foreground hover:text-primary hover:underline">{row.original.referenceNumber}</Link> },
    { accessorKey: "contributionPeriod", header: "Period" },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => formatCurrency(row.original.amount) },
    { accessorKey: "paymentDate", header: "Payment Date", cell: ({ row }) => formatDateShort(row.original.paymentDate) },
    { accessorKey: "paymentMethod", header: "Method" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={CONTRIBUTION_STATUS_TONE[row.original.status]} /> },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Member Contribution History" description="Review a member's full contribution payment record over time." />

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
          <PermissionButton permission="contributions.export" size="sm" variant="outline" disabled={!appliedMemberId} onClick={handleExportCsv}>
            <Download /> Export CSV
          </PermissionButton>
        </div>
      </div>

      {!appliedMemberId ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">Search for a member and click <strong className="text-foreground">Generate</strong> to view their contribution history.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="font-heading text-base font-semibold text-foreground">{memberName}</h2>
            <p className="text-sm text-muted-foreground">{memberOffice}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Paid" value={formatCurrency(summary.totalPaid)} icon={Banknote} tone="success" />
            <StatCard label="Payments Made" value={String(summary.payments)} icon={Hash} tone="primary" />
            <StatCard label="Average Payment" value={formatCurrency(summary.average)} icon={TrendingUp} tone="gold" />
            <StatCard label="Last Payment" value={summary.lastPaymentDate ? formatDateShort(summary.lastPaymentDate) : "—"} icon={Calendar} tone="info" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Contribution Trend</h3>
            {chartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No posted contributions for this member.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="period" tickFormatter={monthTick} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`)} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Amount"]} labelFormatter={(label) => monthTick(label as string)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="amount" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No contribution records"
              emptyDescription="This member has no contribution history yet."
            />
          </div>
        </>
      )}
    </div>
  )
}
