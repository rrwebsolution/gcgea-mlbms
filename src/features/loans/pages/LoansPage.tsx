import * as React from "react"
import { useSearchParams, Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { toast } from "sonner"
import {
  PencilLine,
  Plus,
  Trash2,
  RotateCcw,
  Eye,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ExportButtons } from "@/components/shared/ExportButtons"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { PermissionGuard } from "@/components/shared/PermissionGuard"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { ReloanButton } from "@/features/loans/components/ReloanButton"
import { Button } from "@/components/ui/button"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { listAllLoans, deleteLoanApplication } from "@/services/loans.service"
import { LOAN_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatMonthYear } from "@/utils/format"
import { paginate } from "@/utils/paginate"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import type { LoanApplication, LoanApplicationType, LoanStatus } from "@/types"

const STATUSES: LoanStatus[] = [
  "Draft",
  "Submitted",
  "Under Review",
  "For Approval",
  "Approved",
  "Rejected",
  "Released",
  "Active",
  "Fully Paid",
  "Cancelled",
  "Overdue",
  "Restructured",
]

interface LoansPageProps {
  presetStatus?: LoanStatus
  overdueOnly?: boolean
  activeOnly?: boolean
  title?: string
  description?: string
}

export default function LoansPage({
  presetStatus,
  overdueOnly,
  activeOnly,
  title = "Loan Applications",
  description = "Track, review, approve, and manage all GCGEA member loan applications and portfolio ledgers.",
}: LoansPageProps) {
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { hasAnyPermission } = useAuth()
  const canDeleteDrafts = hasAnyPermission(["drafts.delete_own", "drafts.delete_all"])

  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<string>(presetStatus ?? "")
  const [applicationType, setApplicationType] = React.useState<string>("")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [deleteTarget, setDeleteTarget] = React.useState<LoanApplication | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const officeFilter = searchParams.get("office") ?? undefined

  const {
    data: allLoans = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["loans", "all"],
    queryFn: listAllLoans,
  })

  const filteredLoans = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return allLoans.filter((loan) => {
      const matchesSearch =
        !q ||
        (loan.applicationNumber ?? "").toLowerCase().includes(q) ||
        (loan.memberName ?? "").toLowerCase().includes(q) ||
        (loan.memberNumber ?? "").toLowerCase().includes(q)
      const matchesStatus = !status || loan.status === status
      const matchesType =
        !applicationType || loan.applicationType === (applicationType as LoanApplicationType)
      const matchesOffice = !officeFilter || loan.officeName === officeFilter
      const matchesOverdue = !overdueOnly || loan.status === "Overdue"
      const matchesActive =
        !activeOnly ||
        (["Released", "Active", "Overdue", "Restructured"] as LoanStatus[]).includes(loan.status)

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesOffice &&
        matchesOverdue &&
        matchesActive
      )
    })
  }, [allLoans, search, status, applicationType, officeFilter, overdueOnly, activeOnly])

  const { data: pagedLoans, meta } = paginate(filteredLoans, page, perPage)
  const selectedIds = Object.keys(rowSelection).filter((rowId) => rowSelection[rowId])

  // Summary Metrics calculations
  const totalLoanCount = allLoans.length
  const activeLoans = allLoans.filter((l) =>
    ["Released", "Active", "Overdue", "Restructured"].includes(l.status)
  )
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.outstandingBalance ?? 0), 0)
  const overdueCount = allLoans.filter((l) => l.status === "Overdue").length

  const hasActiveFilters = Boolean(search || (!presetStatus && status) || applicationType)

  function clearFilters() {
    setSearch("")
    if (!presetStatus) setStatus("")
    setApplicationType("")
    setPage(1)
  }

  async function handleDeleteOne() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteLoanApplication(deleteTarget.id)
      toast.success(`Draft ${deleteTarget.applicationNumber} deleted.`)
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ["loans"] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete this draft.")
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleBulkDelete() {
    setIsDeleting(true)
    let succeeded = 0
    let failed = 0
    for (const loanId of selectedIds) {
      try {
        await deleteLoanApplication(loanId)
        succeeded++
      } catch {
        failed++
      }
    }
    setIsDeleting(false)
    setShowBulkDeleteConfirm(false)
    setRowSelection({})
    void queryClient.invalidateQueries({ queryKey: ["loans"] })
    if (failed === 0) toast.success(`${succeeded} draft(s) deleted.`)
    else toast.error(`${succeeded} draft(s) deleted, ${failed} failed.`)
  }

  const columns: ColumnDef<LoanApplication, unknown>[] = [
    {
      accessorKey: "applicationNumber",
      header: "Application #",
      meta: { sticky: "left" },
      cell: ({ row }) => (
        <Link
          to={`/loans/${row.original.id}`}
          className="inline-flex items-center rounded-lg border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-xs font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          {row.original.applicationNumber}
        </Link>
      ),
    },
    {
      accessorKey: "applicationDate",
      header: "Applied",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatMonthYear(row.original.applicationDate)}
        </span>
      ),
    },
    {
      accessorKey: "memberName",
      header: "Member Name",
      meta: { sticky: "left" },
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-heading font-semibold text-foreground tracking-tight">
            {row.original.memberName}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {row.original.memberNumber}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "officeName",
      header: "Office",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.officeName}</span>
      ),
    },
    {
      accessorKey: "loanTypeName",
      header: "Loan Type",
      cell: ({ row }) => (
        <span className="rounded-md bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground/90">
          {row.original.loanTypeName}
        </span>
      ),
    },
    {
      id: "applicationType",
      header: "Type",
      cell: ({ row }) =>
        row.original.applicationType === "reloan" ? (
          <StatusBadge label={`Reloan #${row.original.reloanSequence ?? 1}`} tone="gold" />
        ) : (
          <StatusBadge label="New Loan" tone="neutral" />
        ),
    },
    {
      id: "previousLoanReference",
      header: "Previous Loan",
      cell: ({ row }) =>
        row.original.previousLoanReference && row.original.previousLoanId ? (
          <Link
            to={`/loans/${row.original.previousLoanId}`}
            className="font-mono text-xs font-semibold text-primary hover:underline"
          >
            {row.original.previousLoanReference}
          </Link>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        ),
    },
    {
      accessorKey: "requestedAmount",
      header: "Principal",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {formatCurrency(row.original.requestedAmount)}
        </span>
      ),
    },
    {
      accessorKey: "monthlyAmortization",
      header: "Monthly Amort.",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-foreground/80">
          {formatCurrency(row.original.monthlyAmortization)}
        </span>
      ),
    },
    {
      accessorKey: "outstandingBalance",
      header: "Balance",
      cell: ({ row }) => (
        <span
          className={cn(
            "font-mono text-xs font-semibold",
            row.original.outstandingBalance > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {formatCurrency(row.original.outstandingBalance)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge label={row.original.status} tone={LOAN_STATUS_TONE[row.original.status]} />
      ),
    },
    {
      accessorKey: "assignedOfficer",
      header: "Officer",
      cell: ({ row }) => {
        const officer = row.original.assignedOfficer || "Unassigned"
        return officer === "Unassigned" ? (
          <StatusBadge label="Unassigned" tone="neutral" />
        ) : (
          <span className="text-xs text-muted-foreground">{officer}</span>
        )
      },
    },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => {
        const status = row.original.status
        if (status === "Draft") {
          return (
            <div className="flex items-center gap-1.5">
              <PermissionGuard permission="loans.update">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg text-xs font-semibold active:scale-95"
                  render={<Link to={`/loans/${row.original.id}/edit`} />}
                >
                  <PencilLine className="size-3.5" /> Continue
                </Button>
              </PermissionGuard>
              <PermissionGuard anyOf={["drafts.delete_own", "drafts.delete_all"]}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-90"
                  onClick={() => setDeleteTarget(row.original)}
                  aria-label="Delete draft"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </PermissionGuard>
            </div>
          )
        }
        if (["Under Review", "For Approval", "Approved"].includes(status)) {
          const actionPermission =
            status === "Under Review" ? "loans.review" : status === "For Approval" ? "loans.approve" : "loans.release"
          const actionLabel = status === "Approved" ? "Process Release" : "Review"
          return (
            <PermissionGuard permission={actionPermission}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg text-xs font-semibold active:scale-95"
                render={<Link to={`/approvals/loans/${row.original.id}`} />}
              >
                <Eye className="size-3.5" /> {actionLabel}
              </Button>
            </PermissionGuard>
          )
        }
        if (["Fully Paid", "Active", "Released"].includes(status)) {
          return <ReloanButton loan={row.original} eligible />
        }
        return null
      },
    },
  ]

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons permission="loans.export" label="loan applications" />
            <PermissionButton
              permission="loans.create"
              className="h-9 gap-2 rounded-xl px-4 text-xs font-semibold shadow-xs active:scale-95 transition-all"
              render={<Link to="/loans/new" />}
            >
              <Plus className="size-4" /> Create Loan
            </PermissionButton>
          </div>
        }
      />

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-2xs backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Applications
            </span>
            <span className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              All Time
            </span>
          </div>
          <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? "…" : totalLoanCount}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Recorded loan application accounts
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-2xs backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Active Loan Accounts
            </span>
            <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Servicing
            </span>
          </div>
          <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {isLoading ? "…" : activeLoans.length}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Currently active or in repayment
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-2xs backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Outstanding Portfolio
            </span>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
              Balance
            </span>
          </div>
          <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? "…" : formatCurrency(totalOutstanding)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Remaining uncollected principal
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-2xs backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Overdue Accounts
            </span>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                overdueCount > 0
                  ? "bg-destructive/15 text-destructive"
                  : "bg-muted text-muted-foreground"
              )}
            >
              Alert
            </span>
          </div>
          <p
            className={cn(
              "mt-1 font-heading text-2xl font-bold tracking-tight",
              overdueCount > 0 ? "text-destructive" : "text-foreground"
            )}
          >
            {isLoading ? "…" : overdueCount}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Requiring immediate collections follow-up
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-muted/15 p-4">
          <div className="flex flex-1 flex-wrap items-center gap-2.5 min-w-[280px]">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v)
                setPage(1)
              }}
              placeholder="Search by member, application #…"
              className="max-w-sm"
            />

            {!presetStatus && (
              <CommandSelect
                className="w-44 h-9 rounded-xl border-border/70 bg-background/80 text-xs shadow-2xs"
                value={status || "all"}
                onValueChange={(v) => {
                  setStatus(!v || v === "all" ? "" : v)
                  setPage(1)
                }}
                options={[
                  { value: "all", label: "All Statuses" },
                  ...(activeOnly
                    ? (["Released", "Active", "Overdue", "Restructured"] as LoanStatus[])
                    : STATUSES
                  ).map((s) => ({ value: s, label: s })),
                ]}
                placeholder="All Statuses"
              />
            )}

            <CommandSelect
              className="w-40 h-9 rounded-xl border-border/70 bg-background/80 text-xs shadow-2xs"
              hideSearch
              value={applicationType || "all"}
              onValueChange={(v) => {
                setApplicationType(!v || v === "all" ? "" : v)
                setPage(1)
              }}
              options={[
                { value: "all", label: "All Types" },
                { value: "new", label: "New Loans" },
                { value: "reloan", label: "Reloans" },
              ]}
              placeholder="All Types"
            />

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

          {canDeleteDrafts && selectedIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 active:scale-95 shadow-2xs"
              onClick={() => setShowBulkDeleteConfirm(true)}
            >
              <Trash2 className="size-3.5" /> Delete Selected ({selectedIds.length})
            </Button>
          )}
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={pagedLoans}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="No loan applications found"
          emptyDescription="Try adjusting your search criteria or resetting filters."
          enableRowSelection={
            canDeleteDrafts && !activeOnly ? (row) => row.original.status === "Draft" : false
          }
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          getRowId={(row) => row.id}
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

      {/* Delete Confirmation Dialogs */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete draft loan application?"
        description={`${deleteTarget?.applicationNumber ?? "This draft"} will be permanently removed from the system. This action cannot be reversed.`}
        confirmLabel="Yes, Delete Draft"
        destructive
        isLoading={isDeleting}
        onConfirm={handleDeleteOne}
      />

      <ConfirmDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        title={`Delete ${selectedIds.length} draft loan application(s)?`}
        description="All selected draft applications will be permanently deleted. This action cannot be reversed."
        confirmLabel="Yes, Delete All"
        destructive
        isLoading={isDeleting}
        onConfirm={handleBulkDelete}
      />
    </div>
  )
}