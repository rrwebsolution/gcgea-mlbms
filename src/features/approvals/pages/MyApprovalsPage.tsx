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
import type { StatusTone } from "@/constants/status"
import type { MyApprovalItem, MyApprovalTab, PaginatedResponse } from "@/types"
import { useAuth } from "@/contexts/AuthContext"

const TABS: { value: MyApprovalTab; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "for-approval", label: "For Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "returned", label: "Returned" },
  { value: "released", label: "Released" },
]

// The backend doesn't support date-range filtering — pull a generous batch and filter/paginate
// locally instead. Fine at this association's real scale; would need backend support to grow.
const DATE_FILTER_FETCH_SIZE = 500

function statusTone(status: string): StatusTone {
  if (status === "approved" || status === "released") return "success"
  if (status === "rejected") return "danger"
  if (status === "returned") return "warning"
  if (status === "pending") return "info"
  return "neutral"
}

function paginateLocally(items: MyApprovalItem[], page: number, perPage: number): PaginatedResponse<MyApprovalItem> {
  const totalRecords = items.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / perPage))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const start = (currentPage - 1) * perPage
  return {
    data: items.slice(start, start + perPage),
    meta: { currentPage, perPage, totalRecords, totalPages },
  }
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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-approvals", user?.id, { tab, page, perPage, search, dateFrom, dateTo }],
    queryFn: async () => {
      if (!hasDateFilter) {
        return listMyApprovals({ tab, page, perPage, search: search || undefined })
      }
      const batch = await listMyApprovals({ tab, page: 1, perPage: DATE_FILTER_FETCH_SIZE, search: search || undefined })
      const filtered = batch.data.filter((item) => {
        const dateStr = item.submittedAt ?? item.actedAt
        if (!dateStr) return false
        const date = dateStr.slice(0, 10)
        if (dateFrom && date < dateFrom) return false
        if (dateTo && date > dateTo) return false
        return true
      })
      return paginateLocally(filtered, page, perPage)
    },
  })

  const { data: pendingData } = useQuery({
    queryKey: ["my-approvals", user?.id, { tab: "pending", page: 1, perPage: 1 }],
    queryFn: () => listMyApprovals({ tab: "pending", page: 1, perPage: 1 }),
    enabled: tab !== "pending",
  })
  const pendingCount = tab === "pending" ? (data?.meta.totalRecords ?? 0) : (pendingData?.meta.totalRecords ?? 0)

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
          data={data?.data ?? []}
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
        {data && <Pagination meta={data.meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />}
      </div>
    </div>
  )
}
