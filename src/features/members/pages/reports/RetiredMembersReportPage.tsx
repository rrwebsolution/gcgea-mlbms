import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowLeft, Building2, Download, RotateCcw, UserRoundCheck } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllActiveMembers } from "@/services/members.service"
import { calculateDurationLabel, formatDateShort } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"
import type { Member } from "@/types"

interface Filters {
  office: string
}

const EMPTY_FILTERS: Filters = { office: "" }

export default function RetiredMembersReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const rows = React.useMemo<Member[]>(() => {
    if (!applied) return []
    return getAllActiveMembers()
      .filter((m) => m.retireeStatus === "Retired" && (!applied.office || m.officeName === applied.office))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [applied])

  const officeData = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const m of rows) map.set(m.officeName, (map.get(m.officeName) ?? 0) + 1)
    return Array.from(map.entries()).map(([office, count]) => ({ office, count })).sort((a, b) => b.count - a.count).slice(0, 6)
  }, [rows])

  const summary = React.useMemo(() => {
    const offices = new Set(rows.map((m) => m.officeName)).size
    return { total: rows.length, offices }
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
      "retired-members-report.csv",
      ["Member #", "Name", "Office", "Membership Date", "Years of Service"],
      rows.map((m) => [m.memberNumber, m.fullName, m.officeName, m.membershipDate, calculateDurationLabel(m.membershipDate)])
    )
    toast.success("Retired members report exported to CSV.")
  }

  const columns: ColumnDef<Member, unknown>[] = [
    { accessorKey: "memberNumber", header: "Member #", cell: ({ row }) => <Link to={`/members/${row.original.id}`} className="font-medium text-foreground hover:text-primary hover:underline">{row.original.memberNumber}</Link> },
    { accessorKey: "fullName", header: "Name" },
    { accessorKey: "officeName", header: "Office" },
    { accessorKey: "membershipDate", header: "Membership Date", cell: ({ row }) => formatDateShort(row.original.membershipDate) },
    { id: "yearsOfService", header: "Years of Service", cell: ({ row }) => calculateDurationLabel(row.original.membershipDate) },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Retired Members" description="Members who have transitioned into retiree status." />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Office</Label>
            <OfficeSelect value={draft.office} onValueChange={(v) => setDraft((f) => ({ ...f, office: v }))} placeholder="All Offices" activeOnly={false} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={handleGenerate}>Generate</Button>
          <Button size="sm" variant="outline" onClick={handleReset}><RotateCcw /> Reset Filters</Button>
          <PermissionButton permission="members.export" size="sm" variant="outline" disabled={!applied} onClick={handleExportCsv}>
            <Download /> Export CSV
          </PermissionButton>
        </div>
      </div>

      {!applied ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to list retired members.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <StatCard label="Retired Members" value={String(summary.total)} icon={UserRoundCheck} tone="gold" />
            <StatCard label="Offices Represented" value={String(summary.offices)} icon={Building2} tone="info" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Retired Members Per Office</h3>
            {officeData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No retired members match your filters.</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={officeData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis type="category" dataKey="office" width={120} tick={{ fill: "var(--color-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [value, "Retired"]} cursor={{ fill: "var(--color-muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Bar dataKey="count" fill="var(--color-gold)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No retired members match your filters"
              emptyDescription="Try clearing the office filter."
            />
          </div>
        </>
      )}
    </div>
  )
}
