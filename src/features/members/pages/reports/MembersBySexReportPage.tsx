import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { ArrowLeft, Download, RotateCcw, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { ColumnDef } from "@tanstack/react-table"
import { getAllActiveMembers } from "@/services/members.service"
import { downloadCsv } from "@/utils/csv"

const PIE_COLORS = ["var(--color-primary)", "var(--color-gold)"]

interface Filters {
  office: string
}

const EMPTY_FILTERS: Filters = { office: "" }

interface OfficeSexRow {
  office: string
  male: number
  female: number
  total: number
}

export default function MembersBySexReportPage() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  const members = React.useMemo(() => {
    if (!applied) return []
    return getAllActiveMembers().filter((m) => !applied.office || m.officeName === applied.office)
  }, [applied])

  const sexData = React.useMemo(() => {
    const male = members.filter((m) => m.sex === "Male").length
    const female = members.filter((m) => m.sex === "Female").length
    return [
      { name: "Male", value: male },
      { name: "Female", value: female },
    ].filter((d) => d.value > 0)
  }, [members])

  const officeRows = React.useMemo<OfficeSexRow[]>(() => {
    const map = new Map<string, { male: number; female: number }>()
    for (const m of members) {
      const entry = map.get(m.officeName) ?? { male: 0, female: 0 }
      if (m.sex === "Male") entry.male += 1
      else entry.female += 1
      map.set(m.officeName, entry)
    }
    return Array.from(map.entries())
      .map(([office, v]) => ({ office, male: v.male, female: v.female, total: v.male + v.female }))
      .sort((a, b) => b.total - a.total)
  }, [members])

  const summary = React.useMemo(() => {
    const male = members.filter((m) => m.sex === "Male").length
    return { total: members.length, male, female: members.length - male }
  }, [members])

  function handleGenerate() {
    setApplied(draft)
  }

  function handleReset() {
    setDraft(EMPTY_FILTERS)
    setApplied(null)
  }

  function handleExportCsv() {
    downloadCsv(
      "members-by-sex-report.csv",
      ["Office", "Male", "Female", "Total"],
      officeRows.map((r) => [r.office, r.male, r.female, r.total])
    )
    toast.success("Members by sex report exported to CSV.")
  }

  const columns: ColumnDef<OfficeSexRow, unknown>[] = [
    { accessorKey: "office", header: "Office" },
    { accessorKey: "male", header: "Male" },
    { accessorKey: "female", header: "Female" },
    { accessorKey: "total", header: "Total" },
  ]

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader title="Members by Sex" description="Sex distribution of GCGEA members overall and per office." />

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
          <p className="text-sm text-muted-foreground">Set your filters and click <strong className="text-foreground">Generate</strong> to build the sex distribution report.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Total Members" value={String(summary.total)} icon={Users} tone="primary" />
            <StatCard label="Male" value={String(summary.male)} icon={Users} tone="info" />
            <StatCard label="Female" value={String(summary.female)} icon={Users} tone="gold" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Overall Sex Distribution</h3>
            {sexData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No members match your filters.</p>
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
              data={officeRows}
              emptyTitle="No members match your filters"
              emptyDescription="Try clearing the office filter."
            />
          </div>
        </>
      )}
    </div>
  )
}
