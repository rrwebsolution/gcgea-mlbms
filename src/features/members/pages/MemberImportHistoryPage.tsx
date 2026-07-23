import * as React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Download, Eye, Plus } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { listMemberImportBatches, downloadMemberImportReport } from "@/services/member-import.service"
import type { MemberImportBatchSummary } from "@/types"

const STATUS_TONE: Record<MemberImportBatchSummary["status"], "neutral" | "success" | "warning" | "danger" | "info"> = {
  Uploaded: "neutral",
  SheetSelected: "neutral",
  Mapped: "info",
  Previewed: "info",
  Committed: "success",
}

export default function MemberImportHistoryPage() {
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["member-imports", { page, perPage }],
    queryFn: () => listMemberImportBatches({ page, perPage }),
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
          data={data?.data ?? []}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="No member imports yet"
          emptyDescription="Run a member import to see its history here."
        />
        {data && (
          <Pagination
            meta={data.meta}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n)
              setPage(1)
            }}
          />
        )}
      </div>
    </div>
  )
}
