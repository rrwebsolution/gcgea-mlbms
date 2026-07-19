import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { ArrowLeft, Building2, Download, RotateCcw, UserCheck, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllActiveMembers } from "@/services/members.service"
import { formatDateShort } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"
import type { Member } from "@/types"

const PIE_COLORS = ["var(--color-primary)", "var(--color-gold)"]

interface Filters {
  office: string
}

const EMPTY_FILTERS: Filters = { office: "" }

export default function ActiveMembersReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const rows = React.useMemo<Member[]>(() => {
    if (!applied) return []
    return getAllActiveMembers()
      .filter((m) => m.membershipStatus === "Active" && (!applied.office || m.officeName === applied.office))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [applied])

  const sexData = React.useMemo(() => {
    const male = rows.filter((m) => m.sex === "Male").length
    const female = rows.filter((m) => m.sex === "Female").length
    return [
      { name: "Male", value: male },
      { name: "Female", value: female },
    ].filter((d) => d.value > 0)
  }, [rows])

  const summary = React.useMemo(() => {
    const offices = new Set(rows.map((m) => m.officeName)).size
    const male = rows.filter((m) => m.sex === "Male").length
    return { total: rows.length, male, female: rows.length - male, offices }
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
      "active-members-report.csv",
      ["Member #", "Name", "Office", "Position", "Sex", "Membership Date"],
      rows.map((m) => [m.memberNumber, m.fullName, m.officeName, m.position, m.sex, m.membershipDate])
    )
    toast.success("Active members report exported to CSV.")
  }

  const columns: ColumnDef<Member, unknown>[] = [
    { accessorKey: "memberNumber", header: "Member #", cell: ({ row }) => <Link to={`/members/${row.original.id}`} className="font-medium text-foreground hover:text-primary hover:underline">{row.original.memberNumber}</Link> },
    { accessorKey: "fullName", header: "Name" },
    { accessorKey: "officeName", header: "Office" },
    { accessorKey: "position", header: "Position" },
    { accessorKey: "sex", header: "Sex" },
    { accessorKey: "membershipDate", header: "Membership Date", cell: ({ row }) => formatDateShort(row.original.membershipDate) },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Active Members" description="Members currently in active standing with the association." />

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
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to list active members.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Active Members" value={String(summary.total)} icon={UserCheck} tone="success" />
            <StatCard label="Male" value={String(summary.male)} icon={Users} tone="primary" />
            <StatCard label="Female" value={String(summary.female)} icon={Users} tone="gold" />
            <StatCard label="Offices Represented" value={String(summary.offices)} icon={Building2} tone="info" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Sex Distribution</h3>
            {sexData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No active members match your filters.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={sexData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(props: { name?: string; value?: number }) => `${props.name} (${props.value})`}>
                    {sexData.map((entry, idx) => <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No active members match your filters"
              emptyDescription="Try clearing the office filter."
            />
          </div>
        </>
      )}
    </div>
  )
}
