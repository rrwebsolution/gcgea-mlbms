import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowLeft, Banknote, Download, FileStack, RotateCcw, Wallet } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CommandSelect } from "@/components/shared/CommandSelect"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllBenefits, getBenefitTypesSync } from "@/services/benefits.service"
import { BENEFIT_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"
import type { BenefitApplication, BenefitStatus } from "@/types"

interface Filters {
  dateFrom: string
  dateTo: string
  office: string
  benefitTypeId: string
}

const EMPTY_FILTERS: Filters = { dateFrom: "", dateTo: "", office: "", benefitTypeId: "" }

interface OfficeTotal {
  office: string
  amount: number
  count: number
}

interface BenefitStatusReportPageProps {
  status?: BenefitStatus
  title: string
  description: string
}

export default function BenefitStatusReportPage({ status, title, description }: BenefitStatusReportPageProps) {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const benefitTypes = React.useMemo(() => getBenefitTypesSync(), [])

  const rows = React.useMemo<BenefitApplication[]>(() => {
    if (!applied) return []
    return getAllBenefits()
      .filter((b) => {
        if (status && b.status !== status) return false
        if (applied.dateFrom && b.applicationDate < applied.dateFrom) return false
        if (applied.dateTo && b.applicationDate > applied.dateTo) return false
        if (applied.office && b.officeName !== applied.office) return false
        if (applied.benefitTypeId && b.benefitTypeId !== applied.benefitTypeId) return false
        return true
      })
      .sort((a, b) => b.applicationDate.localeCompare(a.applicationDate))
  }, [applied, status])

  const officeData = React.useMemo<OfficeTotal[]>(() => {
    const map = new Map<string, { amount: number; count: number }>()
    for (const b of rows) {
      const entry = map.get(b.officeName) ?? { amount: 0, count: 0 }
      entry.amount += b.approvedAmount ?? b.requestedAmount
      entry.count += 1
      map.set(b.officeName, entry)
    }
    return Array.from(map.entries())
      .map(([office, v]) => ({ office, amount: v.amount, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [rows])

  const summary = React.useMemo(() => {
    const totalRequested = rows.reduce((sum, b) => sum + b.requestedAmount, 0)
    const totalApproved = rows.reduce((sum, b) => sum + (b.approvedAmount ?? 0), 0)
    return { count: rows.length, totalRequested, totalApproved }
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
      `${title.toLowerCase().replace(/\s+/g, "-")}-report.csv`,
      ["Application #", "Member", "Office", "Benefit Type", "Requested", "Approved", "Status", "Application Date"],
      rows.map((b) => [
        b.applicationNumber,
        b.memberName,
        b.officeName,
        b.benefitTypeName,
        b.requestedAmount.toFixed(2),
        (b.approvedAmount ?? 0).toFixed(2),
        b.status,
        b.applicationDate,
      ])
    )
    toast.success(`${title} report exported to CSV.`)
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
    { accessorKey: "memberName", header: "Member" },
    { accessorKey: "officeName", header: "Office" },
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

      <PageHeader title={title} description={description} />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Application Date From</Label>
            <Input type="date" value={draft.dateFrom} onChange={(e) => setDraft((f) => ({ ...f, dateFrom: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Application Date To</Label>
            <Input type="date" value={draft.dateTo} onChange={(e) => setDraft((f) => ({ ...f, dateTo: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Office</Label>
            <OfficeSelect value={draft.office} onValueChange={(v) => setDraft((f) => ({ ...f, office: v }))} placeholder="All Offices" activeOnly={false} />
          </div>
          <div className="space-y-1.5">
            <Label>Benefit Type</Label>
            <CommandSelect
              className="w-full"
              value={draft.benefitTypeId || "__all__"}
              onValueChange={(v) => setDraft((f) => ({ ...f, benefitTypeId: v === "__all__" ? "" : v }))}
              options={[{ value: "__all__", label: "All Types" }, ...benefitTypes.map((t) => ({ value: t.id, label: t.name }))]}
              placeholder="All Types"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={handleGenerate}>Generate</Button>
          <Button size="sm" variant="outline" onClick={handleReset}><RotateCcw /> Reset Filters</Button>
          <PermissionButton permission="benefits.export" size="sm" variant="outline" disabled={!applied} onClick={handleExportCsv}>
            <Download /> Export CSV
          </PermissionButton>
        </div>
      </div>

      {!applied ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to build the {title.toLowerCase()} report.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Applications" value={String(summary.count)} icon={FileStack} tone="primary" />
            <StatCard label="Total Requested" value={formatCurrency(summary.totalRequested)} icon={Wallet} tone="gold" />
            <StatCard label="Total Approved" value={formatCurrency(summary.totalApproved)} icon={Banknote} tone="success" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Applications Per Office</h3>
            {officeData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No benefit applications match your filters.</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={officeData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis type="category" dataKey="office" width={120} tick={{ fill: "var(--color-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [value, "Applications"]} cursor={{ fill: "var(--color-muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No benefit applications match your filters"
              emptyDescription="Try widening the date range or clearing some filters."
            />
          </div>
        </>
      )}
    </div>
  )
}
