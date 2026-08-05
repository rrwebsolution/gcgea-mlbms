import * as React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { ClipboardCheck, Eye } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { SearchInput } from "@/components/shared/SearchInput"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { listMyApprovals } from "@/services/approvals.service"
import { formatDateTime } from "@/utils/format"
import { approvalActionLabel } from "@/utils/approval-action-label"
import { paginate } from "@/utils/paginate"
import type { StatusTone } from "@/constants/status"
import type { MyApprovalItem, MyApprovalTab } from "@/types"
import { useAuth } from "@/contexts/AuthContext"

const TABS: { value: MyApprovalTab; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "for-approval", label: "For Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "returned", label: "Returned" },
  { value: "released", label: "Released" },
]

// The backend doesn't support search or date-range filtering server-side for this endpoint
// (the historical tabs' resolvedBucketFor() logic is computed in PHP over a bounded batch,
// not a plain WHERE clause — see ApprovalWorkflowService::myApprovals()) — pull a generous
// batch per tab once and search/filter/paginate entirely client-side instead. Fine at this
// association's real scale; would need backend support to grow past it.
const FETCH_SIZE = 1000

function statusTone(status: string): StatusTone {
  const normalized = status.trim().toLowerCase()
  if (["approve", "approved", "release", "released", "auto_approved"].includes(normalized)) return "success"
  if (["reject", "rejected"].includes(normalized)) return "danger"
  if (["return", "returned", "returned_for_revision"].includes(normalized)) return "warning"
  if (["pending", "submitted", "resubmitted"].includes(normalized)) return "info"
  return "neutral"
}

export default function MyApprovalsPage() {
  const { user } = useAuth()
  const [tab, setTab] = React.useState<MyApprovalTab>("pending")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [search, setSearch] = React.useState("")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")

  const hasDateFilter = Boolean(dateFrom || dateTo)

  // Fetches this tab's full batch once and searches/filters/paginates entirely client-side.
  const { data: allApprovals = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["my-approvals", user?.id, "all", tab],
    queryFn: () => listMyApprovals({ tab, page: 1, perPage: FETCH_SIZE }).then((r) => r.data),
  })

  const filteredApprovals = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return allApprovals.filter((item) => {
      const matchesSearch = !q
        || (item.reference ?? "").toLowerCase().includes(q)
        || item.title.toLowerCase().includes(q)
        || (item.memberName ?? "").toLowerCase().includes(q)
        || (item.currentStageLabel ?? "").toLowerCase().includes(q)
      if (!matchesSearch) return false
      if (!hasDateFilter) return true
      const dateStr = item.submittedAt ?? item.actedAt
      if (!dateStr) return false
      const date = dateStr.slice(0, 10)
      if (dateFrom && date < dateFrom) return false
      if (dateTo && date > dateTo) return false
      return true
    })
  }, [allApprovals, search, hasDateFilter, dateFrom, dateTo])

  const { data, meta } = paginate(filteredApprovals, page, perPage)

  // Kept as its own minimal server request (not folded into the client-side conversion
  // above) — it only needs a count, so a perPage:1 request stays cheaper than fetching up
  // to 1000 pending rows client-side just to read .length when the user isn't even on the
  // Pending tab.
  const { data: pendingData } = useQuery({
    queryKey: ["my-approvals", user?.id, { tab: "pending", page: 1, perPage: 1 }],
    queryFn: () => listMyApprovals({ tab: "pending", page: 1, perPage: 1 }),
    enabled: tab !== "pending",
  })
  const pendingCount = tab === "pending" ? filteredApprovals.length : (pendingData?.meta.totalRecords ?? 0)

  function handleTabChange(value: unknown) {
    setTab(value as MyApprovalTab)
    setPage(1)
  }

  const columns: ColumnDef<MyApprovalItem, unknown>[] = [
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ row }) => (
        <Link
          to={`/approvals/${row.original.subjectType}/${row.original.subjectId}`}
          className="font-semibold text-primary hover:text-primary/80 hover:underline"
        >
          {row.original.reference ?? "—"}
        </Link>
      ),
    },
    { accessorKey: "title", header: "Module" },
    { accessorKey: "memberName", header: "Member", cell: ({ row }) => row.original.memberName ?? "—" },
    { accessorKey: "currentStageLabel", header: "Current Stage", cell: ({ row }) => row.original.currentStageLabel ?? "—" },
    {
      id: "when",
      header: tab === "pending" || tab === "for-approval" ? "Submitted" : "Acted On",
      cell: ({ row }) => formatDateTime(row.original.submittedAt ?? row.original.actedAt ?? ""),
    },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={approvalActionLabel(row.original.status)} tone={statusTone(row.original.status)} /> },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          render={<Link to={`/approvals/${row.original.subjectType}/${row.original.subjectId}`} />}
        >
          <Eye className="size-3.5" /> View
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Approval Inbox" description="Applications and registrations currently awaiting your action, and your recent decisions." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Pending My Action" value={String(pendingCount)} icon={ClipboardCheck} tone="warning" isLoading={isLoading} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1) }}
              placeholder="Search by reference, member…"
              className="w-56"
            />
            <div className="flex h-9 items-center gap-1 rounded-lg border border-border/85 bg-background px-2.5 shadow-sm">
              <Input
                type="date"
                className="h-7 w-32 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                aria-label="Date from"
              />
              <span className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">to</span>
              <Input
                type="date"
                className="h-7 w-32 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                aria-label="Date to"
              />
            </div>
            {(search || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setPage(1) }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="Nothing here"
          emptyDescription={
            tab === "pending"
              ? "You have no approvals waiting for your action."
              : tab === "for-approval"
                ? "You have no applications waiting for your approval."
                : `No ${tab} items yet.`
          }
        />
        {!isLoading && !isError && <Pagination meta={meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />}
      </div>
    </div>
  )
}
