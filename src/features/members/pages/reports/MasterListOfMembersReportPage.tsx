import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowLeft, Building2, Download, RotateCcw, UserCheck, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CommandSelect } from "@/components/shared/CommandSelect"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllActiveMembers } from "@/services/members.service"
import { MEMBERSHIP_STATUS_TONE } from "@/constants/status"
import { formatDateShort } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"
import type { Member } from "@/types"

interface Filters {
  office: string
  sex: string
  membershipStatus: string
}

const EMPTY_FILTERS: Filters = { office: "", sex: "", membershipStatus: "" }

export default function MasterListOfMembersReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const rows = React.useMemo<Member[]>(() => {
    if (!applied) return []
    return getAllActiveMembers()
      .filter((m) => (!applied.office || m.officeName === applied.office) && (!applied.sex || m.sex === applied.sex) && (!applied.membershipStatus || m.membershipStatus === applied.membershipStatus))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [applied])

  const officeData = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const m of rows) map.set(m.officeName, (map.get(m.officeName) ?? 0) + 1)
    return Array.from(map.entries()).map(([office, count]) => ({ office, count })).sort((a, b) => b.count - a.count).slice(0, 6)
  }, [rows])

  const summary = React.useMemo(() => {
    const offices = new Set(rows.map((m) => m.officeName)).size
    const active = rows.filter((m) => m.membershipStatus === "Active").length
    return { total: rows.length, active, offices }
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
      "master-list-of-members-report.csv",
      ["Member #", "Name", "Office", "Position", "Status", "Membership Date"],
      rows.map((m) => [m.memberNumber, m.fullName, m.officeName, m.position, m.membershipStatus, m.membershipDate])
    )
    toast.success("Master list of members exported to CSV.")
  }

  const columns: ColumnDef<Member, unknown>[] = [
    { accessorKey: "memberNumber", header: "Member #", cell: ({ row }) => <Link to={`/members/${row.original.id}`} className="font-medium text-foreground hover:text-primary hover:underline">{row.original.memberNumber}</Link> },
    { accessorKey: "fullName", header: "Name" },
    { accessorKey: "officeName", header: "Office" },
    { accessorKey: "position", header: "Position" },
    { accessorKey: "membershipStatus", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.membershipStatus} tone={MEMBERSHIP_STATUS_TONE[row.original.membershipStatus]} /> },
    { accessorKey: "membershipDate", header: "Membership Date", cell: ({ row }) => formatDateShort(row.original.membershipDate) },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Master List of Members" description="Full roster of GCGEA members across all offices." />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Office</Label>
            <OfficeSelect value={draft.office} onValueChange={(v) => setDraft((f) => ({ ...f, office: v }))} placeholder="All Offices" activeOnly={false} />
          </div>
          <div className="space-y-1.5">
            <Label>Sex</Label>
            <CommandSelect
              className="w-full"
              value={draft.sex || "__all__"}
              onValueChange={(v) => setDraft((f) => ({ ...f, sex: v === "__all__" ? "" : (v ?? "") }))}
              options={[
                { value: "__all__", label: "All" },
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
              ]}
              placeholder="All"
              hideSearch
            />
          </div>
          <div className="space-y-1.5">
            <Label>Membership Status</Label>
            <CommandSelect
              className="w-full"
              value={draft.membershipStatus || "__all__"}
              onValueChange={(v) => setDraft((f) => ({ ...f, membershipStatus: v === "__all__" ? "" : (v ?? "") }))}
              options={[
                { value: "__all__", label: "All Statuses" },
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
                { value: "Suspended", label: "Suspended" },
                { value: "Terminated", label: "Terminated" },
                { value: "Deceased", label: "Deceased" },
              ]}
              placeholder="All Statuses"
              hideSearch
            />
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
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to build the master member list.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Total Members" value={String(summary.total)} icon={Users} tone="primary" />
            <StatCard label="Active" value={String(summary.active)} icon={UserCheck} tone="success" />
            <StatCard label="Offices Represented" value={String(summary.offices)} icon={Building2} tone="info" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Members Per Office</h3>
            {officeData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No members match your filters.</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={officeData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis type="category" dataKey="office" width={120} tick={{ fill: "var(--color-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [value, "Members"]} cursor={{ fill: "var(--color-muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No members match your filters"
              emptyDescription="Try clearing some filters."
            />
          </div>
        </>
      )}
    </div>
  )
}
