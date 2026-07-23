import * as React from "react"
import { Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { toast } from "sonner"
import { PencilLine, Plus, Trash2 } from "lucide-react"
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
import { deleteBenefitApplication, listBenefits } from "@/services/benefits.service"
import { BENEFIT_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"
import type { BenefitApplication, BenefitStatus } from "@/types"

const STATUSES: BenefitStatus[] = ["Draft", "Submitted", "Under Review", "For Approval", "Approved", "Rejected", "Released", "Completed", "Cancelled"]

interface BenefitsPageProps {
  presetStatus?: BenefitStatus
  title?: string
  description?: string
}

export default function BenefitsPage({ presetStatus, title = "Benefit Applications", description = "Track and manage all GCGEA member benefit applications." }: BenefitsPageProps) {
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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["benefits", { search, status, page, perPage }],
    queryFn: () => listBenefits({ search, status: status || undefined, page, perPage }),
  })

  const selectedIds = Object.keys(rowSelection).filter((rowId) => rowSelection[rowId])

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
        // eslint-disable-next-line no-await-in-loop
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
    else toast.error(`${succeeded} draft(s) deleted, ${failed} failed (not a draft, or not yours to delete).`)
  }

  const columns: ColumnDef<BenefitApplication, unknown>[] = [
    { accessorKey: "applicationNumber", header: "Application #", cell: ({ row }) => (
        <Link to={`/benefits/${row.original.id}`} className="font-medium text-primary hover:underline">{row.original.applicationNumber}</Link>
      ) },
    { accessorKey: "applicationDate", header: "Application Date", cell: ({ row }) => formatDateShort(row.original.applicationDate) },
    { accessorKey: "memberName", header: "Member Name" },
    { accessorKey: "officeName", header: "Office" },
    { accessorKey: "benefitTypeName", header: "Benefit Type" },
    { accessorKey: "requestedAmount", header: "Requested Amount", cell: ({ row }) => formatCurrency(row.original.requestedAmount) },
    { accessorKey: "approvedAmount", header: "Approved Amount", cell: ({ row }) => row.original.approvedAmount != null ? formatCurrency(row.original.approvedAmount) : "—" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={BENEFIT_STATUS_TONE[row.original.status]} /> },
    { accessorKey: "releaseDate", header: "Release Date", cell: ({ row }) => formatDateShort(row.original.releaseDate) },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) =>
        row.original.status === "Draft" ? (
          <div className="flex items-center gap-1.5">
            <PermissionGuard permission="benefits.update">
              <Button variant="outline" size="sm" render={<Link to={`/benefits/${row.original.id}/edit`} />}>
                <PencilLine /> Continue Editing
              </Button>
            </PermissionGuard>
            <PermissionGuard anyOf={["drafts.delete_own", "drafts.delete_all"]}>
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteTarget(row.original)}>
                <Trash2 /> Delete
              </Button>
            </PermissionGuard>
          </div>
        ) : null,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <ExportButtons permission="benefits.export" label="benefit applications" />
            <PermissionButton permission="benefits.create" render={<Link to="/benefits/new" />}>
              <Plus />
              Create Application
            </PermissionButton>
          </>
        }
      />
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by member, application #…" className="max-w-sm" />
          {!presetStatus && (
            <CommandSelect
              className="w-44"
              value={status || "all"}
              onValueChange={(v) => { setStatus(!v || v === "all" ? "" : v); setPage(1) }}
              options={[{ value: "all", label: "All Statuses" }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
              placeholder="All Statuses"
            />
          )}
          {canDeleteDrafts && selectedIds.length > 0 && (
            <Button variant="outline" size="sm" className="ml-auto gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setShowBulkDeleteConfirm(true)}>
              <Trash2 className="size-3.5" /> Delete Selected ({selectedIds.length})
            </Button>
          )}
        </div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="No benefit applications found"
          emptyDescription="Try adjusting your search or filters."
          enableRowSelection={canDeleteDrafts ? (row) => row.original.status === "Draft" : false}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          getRowId={(row) => row.id}
        />
        {data && <Pagination meta={data.meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this draft benefit application?"
        description={`${deleteTarget?.applicationNumber ?? "This draft"} will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        isLoading={isDeleting}
        onConfirm={handleDeleteOne}
      />

      <ConfirmDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        title={`Delete ${selectedIds.length} draft benefit application(s)?`}
        description="Only the selected draft applications will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete All"
        destructive
        isLoading={isDeleting}
        onConfirm={handleBulkDelete}
      />
    </div>
  )
}
