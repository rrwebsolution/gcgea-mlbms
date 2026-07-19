import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format, parseISO } from "date-fns"
import { ArrowLeft, Download, RotateCcw, UserPlus } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllActiveMembers } from "@/services/members.service"
import { formatDateShort } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"
import type { Member } from "@/types"

function monthTick(value: string) {
  try {
    return format(parseISO(`${value}-01`), "MMM yyyy")
  } catch {
    return value
  }
}

interface Filters {
  dateFrom: string
  dateTo: string
  office: string
}

const EMPTY_FILTERS: Filters = { dateFrom: "", dateTo: "", office: "" }

export default function NewMembersReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const rows = React.useMemo<Member[]>(() => {
    if (!applied) return []
    return getAllActiveMembers()
      .filter((m) => {
        if (applied.dateFrom && m.membershipDate < applied.dateFrom) return false
        if (applied.dateTo && m.membershipDate > applied.dateTo) return false
        if (applied.office && m.officeName !== applied.office) return false
        return true
      })
      .sort((a, b) => b.membershipDate.localeCompare(a.membershipDate))
  }, [applied])

  const monthlyData = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const m of rows) {
      const period = m.membershipDate.slice(0, 7)
      map.set(period, (map.get(period) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([period, count]) => ({ period, count })).sort((a, b) => a.period.localeCompare(b.period))
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
      "new-members-report.csv",
      ["Member #", "Name", "Office", "Position", "Membership Date"],
      rows.map((m) => [m.memberNumber, m.fullName, m.officeName, m.position, m.membershipDate])
    )
    toast.success("New members report exported to CSV.")
  }

  const columns: ColumnDef<Member, unknown>[] = [
    { accessorKey: "memberNumber", header: "Member #", cell: ({ row }) => <Link to={`/members/${row.original.id}`} className="font-medium text-foreground hover:text-primary hover:underline">{row.original.memberNumber}</Link> },
    { accessorKey: "fullName", header: "Name" },
    { accessorKey: "officeName", header: "Office" },
    { accessorKey: "position", header: "Position" },
    { accessorKey: "membershipDate", header: "Membership Date", cell: ({ row }) => formatDateShort(row.original.membershipDate) },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="New Members" description="Members who joined the association within a selected date range." />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Date From</Label>
            <Input type="date" value={draft.dateFrom} onChange={(e) => setDraft((f) => ({ ...f, dateFrom: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Date To</Label>
            <Input type="date" value={draft.dateTo} onChange={(e) => setDraft((f) => ({ ...f, dateTo: e.target.value }))} />
          </div>
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
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to list new members.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <StatCard label="New Members" value={String(rows.length)} icon={UserPlus} tone="success" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">New Members Per Month</h3>
            {monthlyData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No new members in range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="period" tickFormatter={monthTick} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip formatter={(value) => [value, "New Members"]} labelFormatter={(label) => monthTick(label as string)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-popover)", fontSize: 12 }} />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No new members match your filters"
              emptyDescription="Try widening the date range or clearing the office filter."
            />
          </div>
        </>
      )}
    </div>
  )
}
