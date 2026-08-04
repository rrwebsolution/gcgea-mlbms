import * as React from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Download, Eye, Plus, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { listAllMemberImportBatches, downloadMemberImportReport, undoMemberImportBatch } from "@/services/member-import.service"
import { paginate } from "@/utils/paginate"
import type { MemberImportBatchSummary } from "@/types"

const STATUS_TONE: Record<MemberImportBatchSummary["status"], "neutral" | "success" | "warning" | "danger" | "info"> = {
  Uploaded: "neutral",
  SheetSelected: "neutral",
  Mapped: "info",
  Previewed: "info",
  Committed: "success",
}

export default function MemberImportHistoryPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [undoTarget, setUndoTarget] = React.useState<MemberImportBatchSummary | null>(null)

  // Fetches the full list once and pages entirely client-side (this page has no
  // search/filter UI of its own — just pagination).
  const { data: allBatches = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["member-imports", "all"],
    queryFn: listAllMemberImportBatches,
  })
  const { data, meta } = paginate(allBatches, page, perPage)

  // Undo is only offered for the most recently committed batch — reverting an older one
  // could also delete records a later import has since built on top of.
  const latestCommittedToken = allBatches
    .filter((b) => b.status === "Committed")
    .reduce<MemberImportBatchSummary | null>(
      (latest, b) => (!latest || new Date(b.importDate) > new Date(latest.importDate) ? b : latest),
      null
    )?.token

  const undoMutation = useMutation({
    mutationFn: (token: string) => undoMemberImportBatch(token),
    onSuccess: () => {
      toast.success("Import undone. Members created by this batch were removed.")
      queryClient.invalidateQueries({ queryKey: ["member-imports"] })
      queryClient.invalidateQueries({ queryKey: ["members"] })
      setUndoTarget(null)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to undo this import.")
    },
  })

  const columns: ColumnDef<MemberImportBatchSummary, unknown>[] = [
    {
      accessorKey: "originalFilename",
      header: "Workbook",
      cell: ({ row }) => (
        <Link to={`/members/import-history/${row.original.token}`} className="font-semibold text-primary hover:underline">
          {row.original.originalFilename}
        </Link>
      ),
    },
    { accessorKey: "uploadedBy", header: "Imported By", cell: ({ row }) => row.original.uploadedBy || "—" },
    { accessorKey: "importDate", header: "Import Date", cell: ({ row }) => new Date(row.original.importDate).toLocaleString() },
    { accessorKey: "totalRows", header: "Rows" },
    { accessorKey: "importedRows", header: "Imported" },
    { accessorKey: "pendingReviewRows", header: "Pending Review" },
    { accessorKey: "legacyLoanFlaggedRows", header: "Legacy Loan Drafts" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={STATUS_TONE[row.original.status]} /> },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => {
        const b = row.original
        return (
          <div className="flex gap-1.5">
            <Button variant="ghost" size="icon-sm" className="size-8" render={<Link to={`/members/import-history/${b.token}`} />} aria-label="View details">
              <Eye className="size-4 text-muted-foreground/80" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-8"
              aria-label="Download report"
              onClick={() => downloadMemberImportReport(b.token, `member-import-${b.token}.csv`)}
            >
              <Download className="size-4 text-muted-foreground/80" />
            </Button>
            {b.token === latestCommittedToken && (
              <PermissionButton
                permission="member_import.create"
                variant="ghost"
                size="icon-sm"
                className="size-8"
                aria-label="Undo import"
                onClick={() => setUndoTarget(b)}
              >
                <Undo2 className="size-4 text-destructive/80" />
              </PermissionButton>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Member Import History"
        description="Past Member Profile Import batches and their outcomes."
        actions={
          <PermissionButton permission="member_import.create" className="h-9 gap-1.5 text-xs shadow-sm" render={<Link to="/members/import" />}>
            <Plus className="size-4" /> New Import
          </PermissionButton>
        }
      />

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="No member imports yet"
          emptyDescription="Run a member import to see its history here."
        />
        {!isLoading && !isError && (
          <Pagination
            meta={meta}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n)
              setPage(1)
            }}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!undoTarget}
        onOpenChange={(open) => !open && setUndoTarget(null)}
        title="Undo this import?"
        description={
          undoTarget
            ? `This deletes the member(s), beneficiaries, and legacy loan drafts created by "${undoTarget.originalFilename}". This cannot be undone.`
            : undefined
        }
        confirmLabel="Yes, Undo Import"
        confirmingLabel="Undoing..."
        destructive
        isLoading={undoMutation.isPending}
        onConfirm={() => undoTarget && undoMutation.mutate(undoTarget.token)}
      />
    </div>
  )
}
