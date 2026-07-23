import * as React from "react"
import { Link } from "react-router-dom"
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowLeft, Building2, RotateCcw, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { DataTable } from "@/components/shared/DataTable"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllActiveMembers } from "@/services/members.service"

const PIE_COLORS = ["var(--color-primary)", "var(--color-success)", "var(--color-gold)", "var(--color-info)", "var(--color-warning)", "var(--color-destructive)"]

interface Filters {
  membershipStatus: string
}

const EMPTY_FILTERS: Filters = { membershipStatus: "" }

interface OfficeRow {
  office: string
  memberNameList: string[]
  memberNames: string
  count: number
  share: number
}

export default function MembersByOfficeReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)
  const [viewingOffice, setViewingOffice] = React.useState<OfficeRow | null>(null)

  const rows = React.useMemo<OfficeRow[]>(() => {
    if (!applied) return []
    const filtered = getAllActiveMembers().filter((m) => !applied.membershipStatus || m.membershipStatus === applied.membershipStatus)
    const map = new Map<string, string[]>()
    for (const member of filtered) {
      const names = map.get(member.officeName) ?? []
      names.push(member.fullName)
      map.set(member.officeName, names)
    }
    const total = filtered.length
    return Array.from(map.entries())
      .map(([office, names]) => {
        const sortedNames = names.sort((a, b) => a.localeCompare(b))
        return {
          office,
          memberNameList: sortedNames,
          memberNames: sortedNames.map((name) => `* ${name}`).join("\n"),
          count: sortedNames.length,
          share: total > 0 ? (sortedNames.length / total) * 100 : 0,
        }
      })
      .sort((a, b) => b.count - a.count)
  }, [applied])

  const summary = React.useMemo(() => {
    const total = rows.reduce((sum, r) => sum + r.count, 0)
    return { offices: rows.length, total, topOffice: rows[0]?.office ?? "—" }
  }, [rows])

  function handleGenerate() {
    setApplied(draft)
  }

  function handleReset() {
    setDraft(EMPTY_FILTERS)
    setApplied(null)
  }

  const columns: ColumnDef<OfficeRow, unknown>[] = [
    { accessorKey: "office", header: "Office" },
    { accessorKey: "count", header: "Member Count" },
    {
      accessorKey: "memberNames",
      header: "Member List",
      cell: ({ row }) => {
        const record = row.original
        const preview = record.memberNameList.slice(0, 3)
        return (
          <div data-report-value={record.memberNames} className="min-w-52">
            <div className="whitespace-pre-line">{preview.map((name) => `* ${name}`).join("\n")}</div>
            {record.memberNameList.length > 3 && (
              <Button type="button" variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" onClick={() => setViewingOffice(record)}>
                View All ({record.memberNameList.length})
              </Button>
            )}
          </div>
        )
      },
    },
    { accessorKey: "share", header: "Share", cell: ({ row }) => `${row.original.share.toFixed(1)}%` },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Members by Office" description="Distribution of GCGEA members across member offices." />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        </div>
      </div>

      {!applied ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to build the members-by-office report.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Offices" value={String(summary.offices)} icon={Building2} tone="primary" />
            <StatCard label="Total Members" value={String(summary.total)} icon={Users} tone="success" />
            <StatCard label="Top Office" value={summary.topOffice} icon={Building2} tone="gold" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Members Per Office</h3>
              {rows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No members match your filters.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={rows.slice(0, 6)} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis type="category" dataKey="office" width={120} tick={{ fill: "var(--color-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => [value, "Members"]} cursor={{ fill: "var(--color-muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                    <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Share of Total Membership</h3>
              {rows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No members match your filters.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={rows.slice(0, 6)} dataKey="count" nameKey="office" cx="50%" cy="50%" outerRadius={90} label={(props: { name?: string; percent?: number }) => `${props.name} (${((props.percent ?? 0) * 100).toFixed(0)}%)`}>
                      {rows.slice(0, 6).map((entry, idx) => <Cell key={entry.office} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [value, "Members"]} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No members match your filters"
              emptyDescription="Try clearing the status filter."
            />
          </div>
        </>
      )}

      <Dialog open={!!viewingOffice} onOpenChange={(open) => !open && setViewingOffice(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewingOffice?.office} Members</DialogTitle>
            <DialogDescription>{viewingOffice?.count ?? 0} member(s) assigned to this office.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-border">
            <ol className="divide-y divide-border">
              {viewingOffice?.memberNameList.map((name, index) => (
                <li key={`${name}-${index}`} className="flex gap-3 px-4 py-2.5 text-sm">
                  <span className="w-6 shrink-0 text-right text-xs text-muted-foreground">{index + 1}.</span>
                  <span className="font-medium text-foreground">{name}</span>
                </li>
              ))}
            </ol>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
