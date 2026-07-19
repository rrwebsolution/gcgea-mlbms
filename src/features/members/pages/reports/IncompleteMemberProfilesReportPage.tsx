import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { AlertTriangle, ArrowLeft, Download, RotateCcw, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { ProfileCompleteness } from "@/components/shared/ProfileCompleteness"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllActiveMembers, isProfileComplete, profileCompleteness } from "@/services/members.service"
import { downloadCsv } from "@/utils/csv"
import type { Member } from "@/types"

const PIE_COLORS = ["var(--color-destructive)", "var(--color-success)"]

interface Filters {
  office: string
}

const EMPTY_FILTERS: Filters = { office: "" }

export default function IncompleteMemberProfilesReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const allMembers = React.useMemo(() => {
    if (!applied) return []
    return getAllActiveMembers().filter((m) => !applied.office || m.officeName === applied.office)
  }, [applied])

  const rows = React.useMemo<Member[]>(
    () => allMembers.filter((m) => !isProfileComplete(m)).sort((a, b) => profileCompleteness(a) - profileCompleteness(b)),
    [allMembers]
  )

  const pieData = React.useMemo(() => {
    const incomplete = rows.length
    const complete = allMembers.length - incomplete
    return [
      { name: "Incomplete", value: incomplete },
      { name: "Complete", value: complete },
    ].filter((d) => d.value > 0)
  }, [rows, allMembers])

  const summary = React.useMemo(() => {
    const rate = allMembers.length > 0 ? (rows.length / allMembers.length) * 100 : 0
    return { total: allMembers.length, incomplete: rows.length, rate }
  }, [rows, allMembers])

  function handleGenerate() {
    setApplied(draft)
  }

  function handleReset() {
    setDraft(EMPTY_FILTERS)
    setApplied(null)
  }

  function handleExportCsv() {
    downloadCsv(
      "incomplete-member-profiles-report.csv",
      ["Member #", "Name", "Office", "Completeness %"],
      rows.map((m) => [m.memberNumber, m.fullName, m.officeName, profileCompleteness(m)])
    )
    toast.success("Incomplete member profiles report exported to CSV.")
  }

  const columns: ColumnDef<Member, unknown>[] = [
    { accessorKey: "memberNumber", header: "Member #", cell: ({ row }) => <Link to={`/members/${row.original.id}`} className="font-medium text-foreground hover:text-primary hover:underline">{row.original.memberNumber}</Link> },
    { accessorKey: "fullName", header: "Name" },
    { accessorKey: "officeName", header: "Office" },
    { id: "completeness", header: "Completeness", cell: ({ row }) => <ProfileCompleteness percentage={profileCompleteness(row.original)} /> },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Incomplete Member Profiles" description="Members with missing contact details, beneficiaries, or documents." />

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
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to find incomplete profiles.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Members in Scope" value={String(summary.total)} icon={Users} tone="primary" />
            <StatCard label="Incomplete Profiles" value={String(summary.incomplete)} icon={AlertTriangle} tone="danger" />
            <StatCard label="Incomplete Rate" value={`${summary.rate.toFixed(1)}%`} icon={AlertTriangle} tone="warning" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Profile Completeness Overview</h3>
            {pieData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No members match your filters.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(props: { name?: string; value?: number }) => `${props.name} (${props.value})`}>
                    {pieData.map((entry, idx) => <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
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
              emptyTitle="No incomplete profiles found"
              emptyDescription="Every member in this scope has a complete profile."
            />
          </div>
        </>
      )}
    </div>
  )
}
