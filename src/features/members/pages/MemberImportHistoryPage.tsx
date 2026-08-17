import * as React from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Download,
  Eye,
  FileSpreadsheet,
  Plus,
  Undo2,
  Calendar,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Button } from "@/components/ui/button"
import {
  listAllMemberImportBatches,
  downloadMemberImportReport,
  undoMemberImportBatch,
} from "@/services/member-import.service"
import { paginate } from "@/utils/paginate"
import type { MemberImportBatchSummary } from "@/types"

const STATUS_TONE: Record<
  MemberImportBatchSummary["status"],
  "neutral" | "success" | "warning" | "danger" | "info"
> = {
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

  const {
    data: allBatches = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["member-imports", "all"],
    queryFn: listAllMemberImportBatches,
  })

  const { data, meta } = paginate(allBatches, page, perPage)

  // Undo is only permitted for the most recently committed batch
  const latestCommittedToken = allBatches
    .filter((b) => b.status === "Committed")
    .reduce<MemberImportBatchSummary | null>(
      (latest, b) =>
        !latest || new Date(b.importDate) > new Date(latest.importDate) ? b : latest,
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

  // Summary Metrics calculations
  const totalImportedMembers = allBatches.reduce((sum, b) => sum + (b.importedRows ?? 0), 0)
  const totalBatchesCount = allBatches.length

  const columns: ColumnDef<MemberImportBatchSummary, unknown>[] = [
    {
      accessorKey: "originalFilename",
      header: "Workbook Source",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <FileSpreadsheet className="size-4" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <Link
              to={`/members/import-history/${row.original.token}`}
              className="block truncate font-heading text-xs font-semibold text-primary transition-colors hover:underline"
            >
              {row.original.originalFilename}
            </Link>
            <span className="font-mono text-[10px] text-muted-foreground">
              Token: {row.original.token.slice(0, 8)}…
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "uploadedBy",
      header: "Imported By",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="size-3.5 text-muted-foreground/60" />
          <span className="font-medium text-foreground/90">{row.original.uploadedBy || "System"}</span>
        </div>
      ),
    },
    {
      accessorKey: "importDate",
      header: "Import Date",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3.5 text-muted-foreground/60" />
          <span>{new Date(row.original.importDate).toLocaleString()}</span>
        </div>
      ),
    },
    {
      accessorKey: "totalRows",
      header: "Total Rows",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-foreground/80">
          {row.original.totalRows}
        </span>
      ),
    },
    {
      accessorKey: "importedRows",
      header: "Imported",
      cell: ({ row }) => (
        <span className="inline-flex rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
          {row.original.importedRows}
        </span>
      ),
    },
    {
      accessorKey: "pendingReviewRows",
      header: "Pending Review",
      cell: ({ row }) =>
        row.original.pendingReviewRows > 0 ? (
          <span className="inline-flex rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
            {row.original.pendingReviewRows}
          </span>
        ) : (
          <span className="font-mono text-xs text-muted-foreground/60">0</span>
        ),
    },
    {
      accessorKey: "legacyLoanFlaggedRows",
      header: "Legacy Drafts",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.legacyLoanFlaggedRows ?? 0}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          label={row.original.status}
          tone={STATUS_TONE[row.original.status]}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => {
        const b = row.original
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-8 rounded-lg hover:bg-muted/80 active:scale-90"
              render={<Link to={`/members/import-history/${b.token}`} />}
              aria-label="View details"
            >
              <Eye className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-8 rounded-lg hover:bg-muted/80 active:scale-90"
              aria-label="Download audit report"
              onClick={() =>
                downloadMemberImportReport(b.token, `member-import-${b.token}.csv`)
              }
            >
              <Download className="size-3.5" />
            </Button>
            {b.token === latestCommittedToken && (
              <PermissionButton
                permission="member_import.create"
                variant="ghost"
                size="icon-sm"
                className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-90"
                aria-label="Undo import"
                onClick={() => setUndoTarget(b)}
              >
                <Undo2 className="size-3.5" />
              </PermissionButton>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
        title="Member Import History"
        description="Historical audit logs of processed Member Profile workbook imports and batch outcomes."
        actions={
          <PermissionButton
            permission="member_import.create"
            className="h-9 gap-2 rounded-xl px-4 text-xs font-semibold shadow-xs active:scale-95 transition-all"
            render={<Link to="/members/import" />}
          >
            <Plus className="size-4" /> New Import
          </PermissionButton>
        }
      />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-2xs backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Import Batches
            </span>
            <span className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Archive
            </span>
          </div>
          <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? "…" : totalBatchesCount}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Executed workbook import tasks
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-2xs backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Members Imported
            </span>
            <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Active
            </span>
          </div>
          <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {isLoading ? "…" : totalImportedMembers}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Created across all uploaded files
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-2xs backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Reversible Batch
            </span>
            <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Safety
            </span>
          </div>
          <p className="mt-1 font-heading text-sm font-bold tracking-tight text-foreground truncate">
            {latestCommittedToken ? `Token: ${latestCommittedToken.slice(0, 10)}…` : "None"}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Latest committed batch available to undo
          </p>
        </div>
      </div>

      {/* Main Data Table Card */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="No member imports yet"
          emptyDescription="Upload and process a members spreadsheet to generate batch history."
        />

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

      {/* Reversible Batch Confirmation Dialog */}
      <ConfirmDialog
        open={!!undoTarget}
        onOpenChange={(open) => !open && setUndoTarget(null)}
        title="Undo this member import batch?"
        description={
          undoTarget
            ? `This permanently removes the members, beneficiary records, and legacy loan drafts created during the import of "${undoTarget.originalFilename}". This operation cannot be reversed.`
            : undefined
        }
        confirmLabel="Yes, Undo Import"
        confirmingLabel="Undoing Batch..."
        destructive
        isLoading={undoMutation.isPending}
        onConfirm={() => undoTarget && undoMutation.mutate(undoTarget.token)}
      />
    </div>
  )
}