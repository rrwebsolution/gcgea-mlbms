import * as React from "react"
import { Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { toast } from "sonner"
import {
  PencilLine,
  Plus,
  Trash2,
  RotateCcw,
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
import { Button } from "@/components/ui/button"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { deleteBenefitApplication, listAllBenefits } from "@/services/benefits.service"
import { BENEFIT_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { paginate } from "@/utils/paginate"
import { useAuth } from "@/contexts/AuthContext"
import type { BenefitApplication, BenefitStatus } from "@/types"

const STATUSES: BenefitStatus[] = [
  "Draft",
  "Submitted",
  "Under Review",
  "For Approval",
  "Approved",
  "Rejected",
  "Released",
  "Completed",
  "Cancelled",
]

interface BenefitsPageProps {
  presetStatus?: BenefitStatus
  title?: string
  description?: string
}

export default function BenefitsPage({
  presetStatus,
  title = "Benefit Applications",
  description = "Track, evaluate, approve, and disburse GCGEA mutual aid and member assistance benefits.",
}: BenefitsPageProps) {
  const queryClient = useQueryClient()
  const { hasAnyPermission } = useAuth()
  const canDeleteDrafts = hasAnyPermission(["drafts.delete_own", "drafts.delete_all"])

  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<string>(presetStatus ?? "")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [deleteTarget, setDeleteTarget] = React.useState<BenefitApplication | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const {
    data: allBenefits = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["benefits", "all"],
    queryFn: listAllBenefits,
  })

  const filteredBenefits = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return allBenefits.filter((benefit) => {
      const matchesSearch =
        !q ||
        (benefit.applicationNumber ?? "").toLowerCase().includes(q) ||
        (benefit.memberName ?? "").toLowerCase().includes(q) ||
        (benefit.memberNumber ?? "").toLowerCase().includes(q)
      const matchesStatus = !status || benefit.status === status
      return matchesSearch && matchesStatus
    })
  }, [allBenefits, search, status])

  const { data: pagedBenefits, meta } = paginate(filteredBenefits, page, perPage)
  const selectedIds = Object.keys(rowSelection).filter((rowId) => rowSelection[rowId])

  // Summary Metrics calculations
  const totalBenefitCount = allBenefits.length
  const approvedOrReleased = allBenefits.filter((b) =>
    ["Approved", "Released", "Completed"].includes(b.status)
  )
  const totalAidDisbursed = approvedOrReleased.reduce(
    (sum, b) => sum + (b.approvedAmount ?? b.requestedAmount ?? 0),
    0
  )
  const pendingReviewCount = allBenefits.filter((b) =>
    ["Submitted", "Under Review", "For Approval"].includes(b.status)
  ).length
  const completedCount = allBenefits.filter((b) => b.status === "Completed").length

  const hasActiveFilters = Boolean(search || (!presetStatus && status))

  function clearFilters() {
    setSearch("")
    if (!presetStatus) setStatus("")
    setPage(1)
  }

  async function handleDeleteOne() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteBenefitApplication(deleteTarget.id)
      toast.success(`Draft ${deleteTarget.applicationNumber} deleted.`)
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ["benefits"] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete this draft.")
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleBulkDelete() {
    setIsDeleting(true)
    let succeeded = 0
    let failed = 0
    for (const benefitId of selectedIds) {
      try {
        await deleteBenefitApplication(benefitId)
        succeeded++
      } catch {
        failed++
      }
    }
    setIsDeleting(false)
    setShowBulkDeleteConfirm(false)
    setRowSelection({})
    void queryClient.invalidateQueries({ queryKey: ["benefits"] })
    if (failed === 0) toast.success(`${succeeded} benefit draft(s) deleted.`)
    else toast.error(`${succeeded} draft(s) deleted, ${failed} failed.`)
  }

  const columns: ColumnDef<BenefitApplication, unknown>[] = [
    {
      accessorKey: "applicationNumber",
      header: "Application #",
      meta: { sticky: "left" },
      cell: ({ row }) => (
        <Link
          to={`/benefits/${row.original.id}`}
          className="inline-flex items-center rounded-lg border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-xs font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          {row.original.applicationNumber}
        </Link>
      ),
    },
    {
      accessorKey: "applicationDate",
      header: "Filing Date",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatDateShort(row.original.applicationDate)}
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
      header: "Office Agency",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.officeName}</span>
      ),
    },
    {
      accessorKey: "benefitTypeName",
      header: "Benefit Type",
      cell: ({ row }) => (
        <span className="rounded-md bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground/90">
          {row.original.benefitTypeName}
        </span>
      ),
    },
    {
      accessorKey: "requestedAmount",
      header: "Requested Aid",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {formatCurrency(row.original.requestedAmount)}
        </span>
      ),
    },
    {
      accessorKey: "approvedAmount",
      header: "Approved Aid",
      cell: ({ row }) =>
        row.original.approvedAmount != null ? (
          <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(row.original.approvedAmount)}
          </span>
        ) : (
          <span className="font-mono text-xs text-muted-foreground/60">—</span>
        ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          label={row.original.status}
          tone={BENEFIT_STATUS_TONE[row.original.status]}
        />
      ),
    },
    {
      accessorKey: "releaseDate",
      header: "Disbursed",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.releaseDate ? formatDateShort(row.original.releaseDate) : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) =>
        row.original.status === "Draft" ? (
          <div className="flex items-center gap-1.5">
            <PermissionGuard permission="benefits.update">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg text-xs font-semibold active:scale-95"
                render={<Link to={`/benefits/${row.original.id}/edit`} />}
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
        ) : null,
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
            <ExportButtons permission="benefits.export" label="benefit applications" />
            <PermissionButton
              permission="benefits.create"
              className="h-9 gap-2 rounded-xl px-4 text-xs font-semibold shadow-xs active:scale-95 transition-all"
              render={<Link to="/benefits/new" />}
            >
              <Plus className="size-4" /> Create Application
            </PermissionButton>
          </div>
        }
      />

      {/* KPI Summary Ribbon */}
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
            {isLoading ? "…" : totalBenefitCount}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Filed mutual aid applications
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-2xs backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Aid Approved
            </span>
            <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Disbursed
            </span>
          </div>
          <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {isLoading ? "…" : formatCurrency(totalAidDisbursed)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Total assistance granted to members
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-2xs backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Pending Pipeline
            </span>
            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              In Review
            </span>
          </div>
          <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {isLoading ? "…" : pendingReviewCount}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Awaiting verification &amp; approval
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-2xs backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Completed Claims
            </span>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
              Settled
            </span>
          </div>
          <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? "…" : completedCount}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Fully processed &amp; disbursed claims
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
                  ...STATUSES.map((s) => ({ value: s, label: s })),
                ]}
                placeholder="All Statuses"
              />
            )}

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
          data={pagedBenefits}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="No benefit applications found"
          emptyDescription="Try adjusting your search criteria or resetting filters."
          enableRowSelection={canDeleteDrafts ? (row) => row.original.status === "Draft" : false}
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
        title="Delete draft benefit application?"
        description={`${deleteTarget?.applicationNumber ?? "This draft"} will be permanently removed from the system. This action cannot be reversed.`}
        confirmLabel="Yes, Delete Draft"
        destructive
        isLoading={isDeleting}
        onConfirm={handleDeleteOne}
      />

      <ConfirmDialog
        open={showBulkDeleteConfirm}
        onOpenChange={(open) => !open && setShowBulkDeleteConfirm(false)}
        title={`Delete ${selectedIds.length} draft benefit application(s)?`}
        description="All selected draft applications will be permanently deleted. This action cannot be reversed."
        confirmLabel="Yes, Delete All"
        destructive
        isLoading={isDeleting}
        onConfirm={handleBulkDelete}
      />
    </div>
  )
}