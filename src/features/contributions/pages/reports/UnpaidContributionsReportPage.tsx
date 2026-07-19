import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AlertTriangle, ArrowLeft, Building2, Download, RotateCcw, Users, UserX } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllContributions, getContributionPeriods } from "@/services/contributions.service"
import { getAllActiveMembers } from "@/services/members.service"
import { downloadCsv } from "@/utils/csv"

interface Filters {
  period: string
  office: string
}

interface UnpaidRow {
  memberId: string
  memberNumber: string
  fullName: string
  officeName: string
  position: string
}

interface OfficeUnpaidRow {
  office: string
  unpaid: number
}

export default function UnpaidContributionsReportPage() {
  const periods = React.useMemo(() => getContributionPeriods(), [])
  const defaultFilters: Filters = { period: periods[0] ?? "", office: "" }

  const [draft, setDraft] = React.useState<Filters>(defaultFilters)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const rows = React.useMemo<UnpaidRow[]>(() => {
    if (!applied || !applied.period) return []
    const paidMemberIds = new Set(
      getAllContributions()
        .filter((c) => c.status === "Posted" && c.contributionPeriod === applied.period)
        .map((c) => c.memberId)
    )
    return getAllActiveMembers()
      .filter((m) => (!applied.office || m.officeName === applied.office) && !paidMemberIds.has(m.id))
      .map((m) => ({ memberId: m.id, memberNumber: m.memberNumber, fullName: m.fullName, officeName: m.officeName, position: m.position }))
      .sort((a, b) => a.officeName.localeCompare(b.officeName) || a.fullName.localeCompare(b.fullName))
  }, [applied])

  const officeChartData = React.useMemo<OfficeUnpaidRow[]>(() => {
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.officeName, (map.get(r.officeName) ?? 0) + 1)
    return Array.from(map.entries()).map(([office, unpaid]) => ({ office, unpaid })).sort((a, b) => b.unpaid - a.unpaid).slice(0, 10)
  }, [rows])

  const summary = React.useMemo(() => {
    if (!applied || !applied.period) return { activeMembers: 0, paid: 0, unpaid: 0, rate: 0 }
    const pool = getAllActiveMembers().filter((m) => !applied.office || m.officeName === applied.office)
    const unpaid = rows.length
    const paid = pool.length - unpaid
    return { activeMembers: pool.length, paid, unpaid, rate: pool.length > 0 ? (unpaid / pool.length) * 100 : 0 }
  }, [applied, rows])

  function handleGenerate() {
    setApplied(draft)
  }

  function handleReset() {
    setDraft(defaultFilters)
    setApplied(null)
  }

  function handleExportCsv() {
    downloadCsv(
      "unpaid-contributions-report.csv",
      ["Member #", "Name", "Office", "Position"],
      rows.map((r) => [r.memberNumber, r.fullName, r.officeName, r.position])
    )
    toast.success("Unpaid contributions report exported to CSV.")
  }

  const columns: ColumnDef<UnpaidRow, unknown>[] = [
    { accessorKey: "memberNumber", header: "Member #", cell: ({ row }) => <Link to={`/members/${row.original.memberId}`} className="font-medium text-foreground hover:text-primary hover:underline">{row.original.memberNumber}</Link> },
    { accessorKey: "fullName", header: "Name" },
    { accessorKey: "officeName", header: "Office" },
    { accessorKey: "position", header: "Position" },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Unpaid Contributions" description="Identify active members who have not yet paid their contribution for a period." />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Contribution Period</Label>
            <Select value={draft.period || "__none__"} onValueChange={(v) => setDraft((f) => ({ ...f, period: v === "__none__" ? "" : (v ?? "") }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a period" /></SelectTrigger>
              <SelectContent>
                {periods.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Office</Label>
            <OfficeSelect value={draft.office} onValueChange={(v) => setDraft((f) => ({ ...f, office: v }))} placeholder="All Offices" activeOnly={false} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={handleGenerate} disabled={!draft.period}>Generate</Button>
          <Button size="sm" variant="outline" onClick={handleReset}><RotateCcw /> Reset Filters</Button>
          <PermissionButton permission="contributions.export" size="sm" variant="outline" disabled={!applied} onClick={handleExportCsv}>
            <Download /> Export CSV
          </PermissionButton>
        </div>
      </div>

      {!applied ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">Choose a contribution period and click <strong className="text-foreground">Generate</strong> to see who hasn't paid.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Active Members" value={String(summary.activeMembers)} icon={Users} tone="primary" />
            <StatCard label="Paid" value={String(summary.paid)} icon={Users} tone="success" />
            <StatCard label="Unpaid" value={String(summary.unpaid)} icon={UserX} tone="danger" />
            <StatCard label="Unpaid Rate" value={`${summary.rate.toFixed(1)}%`} icon={AlertTriangle} tone="warning" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Building2 className="size-4" /> Unpaid Members Per Office</h3>
            {officeChartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">All active members have paid for this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={officeChartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis type="category" dataKey="office" width={120} tick={{ fill: "var(--color-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [value, "Unpaid"]} cursor={{ fill: "var(--color-muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Bar dataKey="unpaid" fill="var(--color-destructive)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No unpaid members"
              emptyDescription="Everyone in this scope has paid for the selected period."
            />
          </div>
        </>
      )}
    </div>
  )
}
