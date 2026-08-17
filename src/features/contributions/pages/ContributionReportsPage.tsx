import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { format, parseISO } from "date-fns"
import {
  Banknote,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Printer,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Users,
  UserX,
  Wallet,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { MemberSearchSelect } from "@/components/shared/MemberSearchSelect"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllContributions, getContributionPeriods } from "@/services/contributions.service"
import { getAllActiveMembers } from "@/services/members.service"
import { CONTRIBUTION_STATUS_TONE } from "@/constants/status"
import { formatCurrency } from "@/utils/format"
import { paginate } from "@/utils/paginate"
import { downloadCsv } from "@/utils/csv"
import type { Contribution, PaymentMethod } from "@/types"
import { ReportGenerateButton } from "@/features/reports/components/ReportGenerateButton"
import { ChartEmptyState } from "@/features/dashboard/components/ChartEmptyState"

const PAYMENT_METHODS: PaymentMethod[] = ["Payroll Deduction", "Cash", "Bank Transfer", "Check"]
const PIE_COLORS = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-gold)",
  "var(--color-info)",
]

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

const EMPTY_FILTERS: Filters = {
  dateFrom: "",
  dateTo: "",
  period: "",
  office: "",
  memberId: "",
  status: "",
  paymentMethod: "",
}

// Custom Glassmorphic Tooltip for Charts
function ChartTooltip({
  active,
  payload,
  label,
  valuePrefix = "",
  formatter,
}: {
  active?: boolean
  payload?: Array<{ value: number; name?: string; color?: string; payload?: Record<string, unknown> }>
  label?: string
  valuePrefix?: string
  formatter?: (val: number) => string
}) {
  if (!active || !payload || !payload.length) return null
  const item = payload[0]

  return (
    <div className="min-w-[130px] rounded-xl border border-border/80 bg-popover/95 p-2.5 shadow-lg backdrop-blur-md">
      {label && <p className="truncate text-xs font-semibold text-foreground mb-1">{label}</p>}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: item.color || "var(--color-primary)" }}
          />
          <span>{item.name || "Amount"}:</span>
        </div>
        <span className="font-mono font-bold text-foreground">
          {formatter ? formatter(item.value) : `${valuePrefix}${item.value.toLocaleString()}`}
        </span>
      </div>
    </div>
  )
}

export default function ContributionReportsPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(EMPTY_FILTERS)
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
    const paidMembers = applied?.office
      ? activeMembers.filter((m) => m.officeName === applied.office && paidMemberIds.has(m.id)).length
      : paidMemberIds.size
    const totalPoolSize = applied?.office
      ? activeMembers.filter((m) => m.officeName === applied.office).length
      : activeMembers.length
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
    for (const c of posted) {
      map.set(c.contributionPeriod, (map.get(c.contributionPeriod) ?? 0) + c.amount)
    }
    return Array.from(map.entries())
      .map(([period, amount]) => ({ period, amount }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }, [posted])

  const officeData = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const c of posted) {
      map.set(c.officeName, (map.get(c.officeName) ?? 0) + c.amount)
    }
    return Array.from(map.entries())
      .map(([office, amount]) => ({ office, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)
  }, [posted])

  const methodData = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const c of posted) {
      map.set(c.paymentMethod, (map.get(c.paymentMethod) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([method, count]) => ({ method, count }))
  }, [posted])

  const pagedRows = paginate(filtered, page, perPage)

  function handleGenerate() {
    setApplied(draft)
    setPage(1)
  }

  function handleReset() {
    setDraft(EMPTY_FILTERS)
    setApplied(EMPTY_FILTERS)
    setPage(1)
  }

  function handleExportCsv() {
    downloadCsv(
      "contribution-report.csv",
      ["Reference #", "Member", "Office", "Period", "Amount", "Method", "Status"],
      filtered.map((c) => [
        c.referenceNumber,
        c.memberName,
        c.officeName,
        c.contributionPeriod,
        c.amount.toFixed(2),
        c.paymentMethod,
        c.status,
      ])
    )
    toast.success("Contribution report exported to CSV.")
  }

  const columns: ColumnDef<Contribution, unknown>[] = [
    {
      accessorKey: "referenceNumber",
      header: "Reference #",
      cell: ({ row }) => (
        <Link
          to={`/contributions/${row.original.id}`}
          className="inline-flex items-center rounded-lg border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-xs font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          {row.original.referenceNumber}
        </Link>
      ),
    },
    {
      accessorKey: "memberName",
      header: "Member Name",
      cell: ({ row }) => (
        <span className="font-heading font-semibold text-foreground tracking-tight">
          {row.original.memberName}
        </span>
      ),
    },
    {
      accessorKey: "officeName",
      header: "Office",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.officeName}</span>
      ),
    },
    {
      accessorKey: "contributionPeriod",
      header: "Period",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-foreground/80">{row.original.contributionPeriod}</span>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(row.original.amount)}
        </span>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.paymentMethod}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          label={row.original.status}
          tone={CONTRIBUTION_STATUS_TONE[row.original.status]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
        title="Contribution Reports"
        description="Generate analytics, breakdown charts, and transaction ledgers across offices and periods."
      />

      {/* Filter Control Studio */}
      <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs sm:p-6">
        <div className="mb-4 flex items-center gap-2 border-b border-border/40 pb-3">
          <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
            <Filter className="size-3.5" strokeWidth={2.2} />
          </div>
          <h2 className="font-heading text-sm font-semibold tracking-tight text-foreground">
            Report Query Filters
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Date From
            </Label>
            <Input
              type="date"
              className="h-9 rounded-xl border-border/70 font-mono text-xs shadow-2xs"
              value={draft.dateFrom}
              onChange={(e) => setDraft((f) => ({ ...f, dateFrom: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Date To
            </Label>
            <Input
              type="date"
              className="h-9 rounded-xl border-border/70 font-mono text-xs shadow-2xs"
              value={draft.dateTo}
              onChange={(e) => setDraft((f) => ({ ...f, dateTo: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Contribution Period
            </Label>
            <CommandSelect
              className="w-full h-9 rounded-xl border-border/70 text-xs shadow-2xs"
              value={draft.period || "__all__"}
              onValueChange={(v) => setDraft((f) => ({ ...f, period: v === "__all__" ? "" : v }))}
              options={[
                { value: "__all__", label: "All Periods" },
                ...periods.map((p) => ({ value: p, label: p })),
              ]}
              placeholder="All Periods"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Office Agency
            </Label>
            <OfficeSelect
              value={draft.office}
              onValueChange={(v) => setDraft((f) => ({ ...f, office: v }))}
              placeholder="All Offices"
              activeOnly={false}
              className="w-full h-9 rounded-xl border-border/70 text-xs shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Member Filter
            </Label>
            <MemberSearchSelect
              value={draft.memberId || undefined}
              onSelect={(v) => setDraft((f) => ({ ...f, memberId: v }))}
              placeholder="All Members"
              className="w-full h-9 rounded-xl border-border/70 text-xs shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Status
            </Label>
            <CommandSelect
              className="w-full h-9 rounded-xl border-border/70 text-xs shadow-2xs"
              value={draft.status || "__all__"}
              onValueChange={(v) => setDraft((f) => ({ ...f, status: v === "__all__" ? "" : v }))}
              options={[
                { value: "__all__", label: "All Statuses" },
                { value: "Posted", label: "Posted" },
                { value: "Voided", label: "Voided" },
              ]}
              placeholder="All Statuses"
              hideSearch
            />
          </div>

          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Payment Method
            </Label>
            <CommandSelect
              className="w-full h-9 rounded-xl border-border/70 text-xs shadow-2xs"
              value={draft.paymentMethod || "__all__"}
              onValueChange={(v) =>
                setDraft((f) => ({ ...f, paymentMethod: v === "__all__" ? "" : v }))
              }
              options={[
                { value: "__all__", label: "All Methods" },
                ...PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
              ]}
              placeholder="All Methods"
              hideSearch
            />
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <ReportGenerateButton onGenerate={handleGenerate} />
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-semibold active:scale-95 transition-all"
            >
              <RotateCcw className="size-3.5" /> Reset
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <PermissionButton
              permission="contributions.print"
              size="sm"
              variant="outline"
              disabled={!applied}
              onClick={() => window.print()}
              className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold active:scale-95 shadow-2xs"
            >
              <Printer className="size-3.5" /> Print
            </PermissionButton>
            <PermissionButton
              permission="contributions.export"
              size="sm"
              variant="outline"
              disabled={!applied}
              onClick={handleExportCsv}
              className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold active:scale-95 shadow-2xs"
            >
              <Download className="size-3.5" /> CSV
            </PermissionButton>
            <PermissionButton
              permission="contributions.export"
              size="sm"
              variant="outline"
              disabled={!applied}
              onClick={() => toast.success("Exporting report to Excel…")}
              className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold active:scale-95 shadow-2xs"
            >
              <FileSpreadsheet className="size-3.5" /> Excel
            </PermissionButton>
            <PermissionButton
              permission="contributions.export"
              size="sm"
              variant="outline"
              disabled={!applied}
              onClick={() => toast.info("Preparing PDF preview…")}
              className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold active:scale-95 shadow-2xs"
            >
              <FileText className="size-3.5" /> PDF
            </PermissionButton>
          </div>
        </div>
      </div>

      {!applied ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/70 bg-gradient-to-b from-muted/20 via-muted/5 to-transparent p-12 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-background text-muted-foreground shadow-2xs">
            <Sparkles className="size-5 text-primary" />
          </div>
          <h3 className="font-heading text-sm font-semibold text-foreground">
            No Report Generated Yet
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Select your desired parameters above and click <strong>Generate</strong> to render the report.
          </p>
        </div>
      ) : (
        <>
          {/* Statistical KPI Overview */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="Total Records"
              value={String(summary.totalContributions)}
              icon={Wallet}
              tone="primary"
            />
            <StatCard
              label="Total Collected"
              value={formatCurrency(summary.totalCollected)}
              icon={Banknote}
              tone="success"
            />
            <StatCard
              label="Paid Members"
              value={String(summary.paidMembers)}
              icon={Users}
              tone="info"
            />
            <StatCard
              label="Unpaid Members"
              value={String(summary.unpaidMembers)}
              icon={UserX}
              tone="warning"
            />
            <StatCard
              label="Average Paid"
              value={formatCurrency(summary.average)}
              icon={TrendingUp}
              tone="gold"
            />
            <StatCard
              label="Peak Single Receipt"
              value={formatCurrency(summary.highest)}
              icon={Banknote}
              tone="primary"
            />
          </div>

          {/* Visual Analytics Grid */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Monthly Trend */}
            <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs">
              <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-2.5">
                <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground">
                  Monthly Collections Trend
                </h3>
                <span className="rounded-full bg-muted/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Periodical
                </span>
              </div>
              {monthlyData.length === 0 ? (
                <ChartEmptyState label="No monthly collections found" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.6} />
                    <XAxis
                      dataKey="period"
                      tickFormatter={MonthTick}
                      tick={{ fill: "currentColor", fontSize: 11 }}
                      className="text-muted-foreground font-medium"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                      tick={{ fill: "currentColor", fontSize: 11 }}
                      className="text-muted-foreground font-medium"
                      tickLine={false}
                      axisLine={false}
                      width={52}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--color-muted)", opacity: 0.3, rx: 6 }}
                      content={<ChartTooltip formatter={formatCurrency} />}
                    />
                    <Bar
                      dataKey="amount"
                      fill="var(--color-primary)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Office Distribution */}
            <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs">
              <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-2.5">
                <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground">
                  Collections per Office (Top 6)
                </h3>
                <span className="rounded-full bg-muted/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  By Agency
                </span>
              </div>
              {officeData.length === 0 ? (
                <ChartEmptyState label="No office data found" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={officeData}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                    barCategoryGap="20%"
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="office"
                      width={120}
                      tick={{ fill: "currentColor", fontSize: 11 }}
                      className="text-foreground font-medium"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--color-muted)", opacity: 0.3, rx: 6 }}
                      content={<ChartTooltip formatter={formatCurrency} />}
                    />
                    <Bar
                      dataKey="amount"
                      fill="var(--color-success)"
                      radius={[0, 6, 6, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Method Breakdown */}
            <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs lg:col-span-2">
              <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-2.5">
                <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground">
                  Payment Method Breakdown
                </h3>
                <span className="rounded-full bg-muted/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Channels
                </span>
              </div>
              {methodData.length === 0 ? (
                <ChartEmptyState label="No payment methods recorded" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={methodData}
                      dataKey="count"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={4}
                      label={({ name, value }) => `${String(name)} (${String(value)})`}
                    >
                      {methodData.map((entry, idx) => (
                        <Cell
                          key={`cell-${entry.method}`}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                          stroke="var(--color-background)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      formatter={(val) => <span className="text-foreground font-medium">{val}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Generated Report Data Table */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
            <DataTable
              columns={columns}
              data={pagedRows.data}
              emptyTitle="No contributions match your query"
              emptyDescription="Try widening your date filters or clearing selected options."
            />
            <div className="border-t border-border/40 bg-muted/10 p-3">
              <Pagination
                meta={pagedRows.meta}
                onPageChange={setPage}
                onPerPageChange={(n) => {
                  setPerPage(n)
                  setPage(1)
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
