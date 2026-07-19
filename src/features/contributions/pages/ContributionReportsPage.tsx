import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format, parseISO } from "date-fns"
import { Banknote, Download, FileText, Printer, RotateCcw, TrendingUp, Users, UserX, Wallet } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { MemberSearchSelect } from "@/components/shared/MemberSearchSelect"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllContributions, getContributionPeriods } from "@/services/contributions.service"
import { getAllActiveMembers } from "@/services/members.service"
import { CONTRIBUTION_STATUS_TONE } from "@/constants/status"
import { formatCurrency } from "@/utils/format"
import { paginate } from "@/utils/paginate"
import { downloadCsv } from "@/utils/csv"
import type { Contribution, PaymentMethod } from "@/types"

const PAYMENT_METHODS: PaymentMethod[] = ["Payroll Deduction", "Cash", "Bank Transfer", "Check"]
const PIE_COLORS = ["var(--color-primary)", "var(--color-success)", "var(--color-gold)", "var(--color-info)"]

function MonthTick(value: string) {
  try {
    return format(parseISO(`${value}-01`), "MMM yyyy")
  } catch {
    return value
  }
}

interface Filters {
  dateFrom: string
  dateTo: string
  period: string
  office: string
  memberId: string
  status: string
  paymentMethod: string
}

const EMPTY_FILTERS: Filters = { dateFrom: "", dateTo: "", period: "", office: "", memberId: "", status: "", paymentMethod: "" }

export default function ContributionReportsPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)

  const periods = React.useMemo(() => getContributionPeriods(), [])

  const filtered = React.useMemo<Contribution[]>(() => {
    if (!applied) return []
    return getAllContributions().filter((c) => {
      if (applied.dateFrom && c.paymentDate < applied.dateFrom) return false
      if (applied.dateTo && c.paymentDate > applied.dateTo) return false
      if (applied.period && c.contributionPeriod !== applied.period) return false
      if (applied.office && c.officeName !== applied.office) return false
      if (applied.memberId && c.memberId !== applied.memberId) return false
      if (applied.status && c.status !== applied.status) return false
      if (applied.paymentMethod && c.paymentMethod !== applied.paymentMethod) return false
      return true
    })
  }, [applied])

  const posted = filtered.filter((c) => c.status === "Posted")

  const summary = React.useMemo(() => {
    const activeMembers = getAllActiveMembers()
    const paidMemberIds = new Set(posted.map((c) => c.memberId))
    const paidMembers = applied?.office ? activeMembers.filter((m) => m.officeName === applied.office && paidMemberIds.has(m.id)).length : paidMemberIds.size
    const totalPoolSize = applied?.office ? activeMembers.filter((m) => m.officeName === applied.office).length : activeMembers.length
    const totalCollected = posted.reduce((sum, c) => sum + c.amount, 0)
    const highest = posted.reduce((max, c) => Math.max(max, c.amount), 0)
    return {
      totalContributions: filtered.length,
      totalCollected,
      paidMembers,
      unpaidMembers: Math.max(0, totalPoolSize - paidMembers),
      average: posted.length > 0 ? totalCollected / posted.length : 0,
      highest,
    }
  }, [filtered, posted, applied])

  const monthlyData = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const c of posted) map.set(c.contributionPeriod, (map.get(c.contributionPeriod) ?? 0) + c.amount)
    return Array.from(map.entries()).map(([period, amount]) => ({ period, amount })).sort((a, b) => a.period.localeCompare(b.period))
  }, [posted])

  const officeData = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const c of posted) map.set(c.officeName, (map.get(c.officeName) ?? 0) + c.amount)
    return Array.from(map.entries()).map(([office, amount]) => ({ office, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6)
  }, [posted])

  const methodData = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const c of posted) map.set(c.paymentMethod, (map.get(c.paymentMethod) ?? 0) + 1)
    return Array.from(map.entries()).map(([method, count]) => ({ method, count }))
  }, [posted])

  const pagedRows = paginate(filtered, page, perPage)

  function handleGenerate() {
    setApplied(draft)
    setPage(1)
  }

  function handleReset() {
    setDraft(EMPTY_FILTERS)
    setApplied(null)
    setPage(1)
  }

  function handleExportCsv() {
    downloadCsv(
      "contribution-report.csv",
      ["Reference #", "Member", "Office", "Period", "Amount", "Method", "Status"],
      filtered.map((c) => [c.referenceNumber, c.memberName, c.officeName, c.contributionPeriod, c.amount.toFixed(2), c.paymentMethod, c.status])
    )
    toast.success("Contribution report exported to CSV.")
  }

  const columns: ColumnDef<Contribution, unknown>[] = [
    { accessorKey: "referenceNumber", header: "Reference", cell: ({ row }) => <Link to={`/contributions/${row.original.id}`} className="font-medium text-foreground hover:text-primary hover:underline">{row.original.referenceNumber}</Link> },
    { accessorKey: "memberName", header: "Member" },
    { accessorKey: "officeName", header: "Office" },
    { accessorKey: "contributionPeriod", header: "Period" },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => formatCurrency(row.original.amount) },
    { accessorKey: "paymentMethod", header: "Method" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={CONTRIBUTION_STATUS_TONE[row.original.status]} /> },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Contribution Reports" description="Generate contribution collection reports across offices and periods." />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <Select value={draft.period || "__all__"} onValueChange={(v) => setDraft((f) => ({ ...f, period: v === "__all__" ? "" : (v ?? "") }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="All Periods">{(v: string) => (v === "__all__" ? "All Periods" : v)}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Periods</SelectItem>
                {periods.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Office</Label>
            <OfficeSelect value={draft.office} onValueChange={(v) => setDraft((f) => ({ ...f, office: v }))} placeholder="All Offices" activeOnly={false} />
          </div>
          <div className="space-y-1.5">
            <Label>Member</Label>
            <MemberSearchSelect value={draft.memberId || undefined} onSelect={(v) => setDraft((f) => ({ ...f, memberId: v }))} placeholder="All Members" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={draft.status || "__all__"} onValueChange={(v) => setDraft((f) => ({ ...f, status: v === "__all__" ? "" : (v ?? "") }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="All Statuses">{(v: string) => (v === "__all__" ? "All Statuses" : v)}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Statuses</SelectItem>
                <SelectItem value="Posted">Posted</SelectItem>
                <SelectItem value="Voided">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={draft.paymentMethod || "__all__"} onValueChange={(v) => setDraft((f) => ({ ...f, paymentMethod: v === "__all__" ? "" : (v ?? "") }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="All Methods">{(v: string) => (v === "__all__" ? "All Methods" : v)}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Methods</SelectItem>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={handleGenerate}>Generate</Button>
          <Button size="sm" variant="outline" onClick={handleReset}><RotateCcw /> Reset Filters</Button>
          <PermissionButton permission="contributions.print" size="sm" variant="outline" disabled={!applied} onClick={() => window.print()}>
            <Printer /> Print
          </PermissionButton>
          <PermissionButton permission="contributions.export" size="sm" variant="outline" disabled={!applied} onClick={handleExportCsv}>
            <Download /> Export CSV
          </PermissionButton>
          <PermissionButton permission="contributions.export" size="sm" variant="outline" disabled={!applied} onClick={() => toast.success("Exporting report to Excel…")}>
            <FileText /> Export Excel
          </PermissionButton>
          <PermissionButton permission="contributions.export" size="sm" variant="outline" disabled={!applied} onClick={() => toast.info("Preparing PDF preview…")}>
            <FileText /> Export PDF Preview
          </PermissionButton>
        </div>
      </div>

      {!applied ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to build the contribution report.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total Contributions" value={String(summary.totalContributions)} icon={Wallet} tone="primary" />
            <StatCard label="Total Collected" value={formatCurrency(summary.totalCollected)} icon={Banknote} tone="success" />
            <StatCard label="Paid Members" value={String(summary.paidMembers)} icon={Users} tone="info" />
            <StatCard label="Unpaid Members" value={String(summary.unpaidMembers)} icon={UserX} tone="warning" />
            <StatCard label="Average Contribution" value={formatCurrency(summary.average)} icon={TrendingUp} tone="gold" />
            <StatCard label="Highest Collection" value={formatCurrency(summary.highest)} icon={Banknote} tone="primary" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Monthly Collections</h3>
              {monthlyData.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No posted contributions in range.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="period" tickFormatter={MonthTick} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                    <YAxis tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} width={52} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Collected"]} labelFormatter={(label) => MonthTick(label as string)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                    <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Collections Per Office</h3>
              {officeData.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No posted contributions in range.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={officeData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="office" width={110} tick={{ fill: "var(--color-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Collected"]} cursor={{ fill: "var(--color-muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                    <Bar dataKey="amount" fill="var(--color-success)" radius={[0, 4, 4, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Payment Method Distribution</h3>
              {methodData.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No posted contributions in range.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={methodData} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius={80} label={(entry: { method?: string; count?: number }) => `${entry.method} (${entry.count})`}>
                      {methodData.map((entry, idx) => <Cell key={entry.method} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-muted-foreground)" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={pagedRows.data}
              emptyTitle="No contributions match your filters"
              emptyDescription="Try widening the date range or clearing some filters."
            />
            <Pagination meta={pagedRows.meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />
          </div>
        </>
      )}
    </div>
  )
}
