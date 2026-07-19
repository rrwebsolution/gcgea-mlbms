import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
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
import { getMemberBenefits } from "@/services/benefits.service"
import { BENEFIT_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"
import type { BenefitApplication } from "@/types"

export default function MemberBenefitHistoryReportPage() {
  const [draftMemberId, setDraftMemberId] = React.useState<string>("")
  const [appliedMemberId, setAppliedMemberId] = React.useState<string | null>(null)

  const rows = React.useMemo<BenefitApplication[]>(() => {
    if (!appliedMemberId) return []
    return getMemberBenefits(appliedMemberId).sort((a, b) => a.applicationDate.localeCompare(b.applicationDate))
  }, [appliedMemberId])

  const memberName = rows[0]?.memberName ?? ""
  const memberOffice = rows[0]?.officeName ?? ""

  const chartData = React.useMemo(
    () => rows.map((b) => ({ date: b.applicationDate, requested: b.requestedAmount, approved: b.approvedAmount ?? 0 })),
    [rows]
  )

  const summary = React.useMemo(() => {
    const approvedRows = rows.filter((b) => b.approvedAmount != null)
    const totalApproved = approvedRows.reduce((sum, b) => sum + (b.approvedAmount ?? 0), 0)
    return {
      totalApplications: rows.length,
      totalApproved,
      average: approvedRows.length > 0 ? totalApproved / approvedRows.length : 0,
      lastApplicationDate: rows.length > 0 ? rows[rows.length - 1].applicationDate : null,
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
      `member-benefit-history-${memberName || "report"}.csv`,
      ["Application #", "Benefit Type", "Requested", "Approved", "Status", "Application Date"],
      rows.map((b) => [b.applicationNumber, b.benefitTypeName, b.requestedAmount.toFixed(2), (b.approvedAmount ?? 0).toFixed(2), b.status, b.applicationDate])
    )
    toast.success("Member benefit history exported to CSV.")
  }

  const columns: ColumnDef<BenefitApplication, unknown>[] = [
    {
      accessorKey: "applicationNumber",
      header: "Application #",
      cell: ({ row }) => (
        <Link to={`/benefits/${row.original.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
          {row.original.applicationNumber}
        </Link>
      ),
    },
    { accessorKey: "benefitTypeName", header: "Benefit Type" },
    { accessorKey: "requestedAmount", header: "Requested", cell: ({ row }) => formatCurrency(row.original.requestedAmount) },
    { accessorKey: "approvedAmount", header: "Approved", cell: ({ row }) => (row.original.approvedAmount != null ? formatCurrency(row.original.approvedAmount) : "—") },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={BENEFIT_STATUS_TONE[row.original.status]} /> },
    { accessorKey: "applicationDate", header: "Application Date", cell: ({ row }) => formatDateShort(row.original.applicationDate) },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Member Benefit History" description="Review a member's full benefit application record over time." />

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
          <PermissionButton permission="benefits.export" size="sm" variant="outline" disabled={!appliedMemberId} onClick={handleExportCsv}>
            <Download /> Export CSV
          </PermissionButton>
        </div>
      </div>

      {!appliedMemberId ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">Search for a member and click <strong className="text-foreground">Generate</strong> to view their benefit history.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="font-heading text-base font-semibold text-foreground">{memberName}</h2>
            <p className="text-sm text-muted-foreground">{memberOffice}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Applications" value={String(summary.totalApplications)} icon={Hash} tone="primary" />
            <StatCard label="Total Approved" value={formatCurrency(summary.totalApproved)} icon={Banknote} tone="success" />
            <StatCard label="Average Approved" value={formatCurrency(summary.average)} icon={TrendingUp} tone="gold" />
            <StatCard label="Last Application" value={summary.lastApplicationDate ? formatDateShort(summary.lastApplicationDate) : "—"} icon={Calendar} tone="info" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Benefit Amounts Over Time</h3>
            {chartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No benefit applications for this member.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="date" tickFormatter={(v) => formatDateShort(v as string)} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`)} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name === "requested" ? "Requested" : "Approved"]} labelFormatter={(label) => formatDateShort(label as string)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="requested" name="requested" stroke="var(--color-info)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="approved" name="approved" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No benefit records"
              emptyDescription="This member has no benefit application history yet."
            />
          </div>
        </>
      )}
    </div>
  )
}
