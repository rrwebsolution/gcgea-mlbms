import * as React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Eye, Calendar, RotateCcw } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { SearchInput } from "@/components/shared/SearchInput"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { listMyApprovals } from "@/services/approvals.service"
import { formatDateTime } from "@/utils/format"
import { approvalActionLabel } from "@/utils/approval-action-label"
import { paginate } from "@/utils/paginate"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import type { StatusTone } from "@/constants/status"
import type { MyApprovalItem, MyApprovalTab } from "@/types"

const TABS: { value: MyApprovalTab; label: string }[] = [
  { value: "pending", label: "Pending My Action" },
  { value: "for-approval", label: "For Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "returned", label: "Returned for Revision" },
  { value: "released", label: "Disbursed / Released" },
]

const FETCH_SIZE = 1000

function statusTone(status: string): StatusTone {
  const normalized = status.trim().toLowerCase()
  if (["approve", "approved", "release", "released", "auto_approved"].includes(normalized))
    return "success"
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
  const hasActiveFilters = Boolean(search || dateFrom || dateTo)

  const {
    data: allApprovals = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["my-approvals", user?.id, "all", tab],
    queryFn: () => listMyApprovals({ tab, page: 1, perPage: FETCH_SIZE }).then((r) => r.data),
  })

  const filteredApprovals = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return allApprovals.filter((item) => {
      const matchesSearch =
        !q ||
        (item.reference ?? "").toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        (item.memberName ?? "").toLowerCase().includes(q) ||
        (item.currentStageLabel ?? "").toLowerCase().includes(q)
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

  const { data: pendingData } = useQuery({
    queryKey: ["my-approvals", user?.id, { tab: "pending", page: 1, perPage: 1 }],
    queryFn: () => listMyApprovals({ tab: "pending", page: 1, perPage: 1 }),
    enabled: tab !== "pending",
  })
  const pendingCount =
    tab === "pending" ? allApprovals.length : pendingData?.meta.totalRecords ?? 0

  function handleTabChange(value: unknown) {
    setTab(value as MyApprovalTab)
    setPage(1)
  }

  function clearFilters() {
    setSearch("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const columns: ColumnDef<MyApprovalItem, unknown>[] = [
    {
      accessorKey: "reference",
      header: "Reference #",
      meta: { sticky: "left" },
      cell: ({ row }) => (
        <Link
          to={`/approvals/${row.original.subjectType}/${row.original.subjectId}`}
          className="inline-flex items-center rounded-lg border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-xs font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          {row.original.reference ?? "—"}
        </Link>
      ),
    },
    {
      accessorKey: "title",
      header: "Module Category",
      cell: ({ row }) => (
        <span className="rounded-md bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground/90">
          {row.original.title}
        </span>
      ),
    },
    {
      accessorKey: "memberName",
      header: "Applicant Member",
      cell: ({ row }) => (
        <span className="font-heading font-semibold text-foreground tracking-tight">
          {row.original.memberName ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "currentStageLabel",
      header: "Workflow Stage",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="size-1.5 rounded-full bg-primary" />
          <span className="font-medium text-foreground/85">
            {row.original.currentStageLabel ?? "—"}
          </span>
        </div>
      ),
    },
    {
      id: "when",
      header: tab === "pending" || tab === "for-approval" ? "Submitted Date" : "Decision Date",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatDateTime(row.original.submittedAt ?? row.original.actedAt ?? "")}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Stage Outcome",
      cell: ({ row }) => (
        <StatusBadge
          label={approvalActionLabel(row.original.status)}
          tone={statusTone(row.original.status)}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-lg text-xs font-semibold active:scale-95 shadow-2xs hover:bg-muted"
          render={<Link to={`/approvals/${row.original.subjectType}/${row.original.subjectId}`} />}
        >
          <Eye className="size-3.5" /> View &amp; Act
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
        title="Approval Workflow Inbox"
        description="Review member loan applications, benefit claims, and profile registrations awaiting your authorization."
      />

      {/* KPI Mission-Control Ribbon */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-2xs backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Pending Direct Action
            </span>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                pendingCount > 0
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse"
                  : "bg-muted text-muted-foreground"
              )}
            >
              Action Queue
            </span>
          </div>
          <p
            className={cn(
              "mt-1 font-heading text-2xl font-bold tracking-tight",
              pendingCount > 0 ? "text-amber-600 dark:text-amber-400 font-mono" : "text-foreground font-mono"
            )}
          >
            {pendingCount}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Items currently stalled awaiting your sign-off
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-2xs backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Active Queue Volume
            </span>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
              {tab.toUpperCase()}
            </span>
          </div>
          <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-foreground font-mono">
            {isLoading ? "…" : filteredApprovals.length}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Total records matching current workflow filter
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-2xs backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Workflow Authority
            </span>
            <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Active
            </span>
          </div>
          <p className="mt-1 font-heading text-sm font-bold tracking-tight text-foreground truncate">
            {user?.fullName ?? "Authorized Officer"}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Role: {user?.roleName ?? "Workflow Reviewer"}
          </p>
        </div>
      </div>

      {/* Main Inbox Card */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs space-y-0">
        
        {/* Tab Selector Header */}
        <div className="border-b border-border/40 bg-muted/15 p-4">
          <div className="overflow-x-auto pb-1 scrollbar-none">
            <Tabs value={tab} onValueChange={handleTabChange}>
              <TabsList className="inline-flex h-11 items-center gap-1 rounded-2xl border border-border/60 bg-background/80 p-1 backdrop-blur-xs">
                {TABS.map((t) => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="rounded-xl px-3.5 text-xs font-semibold whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <span>{t.label}</span>
                    {t.value === "pending" && pendingCount > 0 && (
                      <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-muted/10 p-4">
          <div className="flex flex-1 flex-wrap items-center gap-2.5 min-w-[280px]">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v)
                setPage(1)
              }}
              placeholder="Search reference, member, stage…"
              className="w-full sm:max-w-xs"
            />

            {/* Date Range Selector */}
            <div className="flex h-9 items-center gap-1.5 rounded-xl border border-border/70 bg-background/80 px-3 shadow-2xs backdrop-blur-xs">
              <Calendar className="size-3.5 text-muted-foreground/70" />
              <Input
                type="date"
                className="h-7 w-28 border-0 bg-transparent p-0 font-mono text-xs focus-visible:ring-0 shadow-none"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setPage(1)
                }}
                aria-label="Date from"
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                to
              </span>
              <Input
                type="date"
                className="h-7 w-28 border-0 bg-transparent p-0 font-mono text-xs focus-visible:ring-0 shadow-none"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setPage(1)
                }}
                aria-label="Date to"
              />
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 gap-1.5 rounded-xl px-3 text-xs text-muted-foreground hover:text-foreground active:scale-95"
              >
                <RotateCcw className="size-3.5" /> Reset Filters
              </Button>
            )}
          </div>
        </div>

        {/* Data Grid */}
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle={
            tab === "pending"
              ? "All Clear — Zero Pending Items"
              : tab === "for-approval"
                ? "No applications waiting for approval"
                : `No ${tab} records found`
          }
          emptyDescription={
            tab === "pending"
              ? "You have reviewed and acted on all assigned applications."
              : "Try adjusting your search query or broadening the date filter."
          }
          enableColumnVisibility={false}
        />

        {/* Integrated Pagination Footer */}
        {!isLoading && !isError && (
          <div className="border-t border-border/40 bg-muted/10 p-3">
            <Pagination
              meta={meta}
              onPageChange={setPage}
              onPerPageChange={(n) => {
                setPerPage(n)
                setPage(1)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}