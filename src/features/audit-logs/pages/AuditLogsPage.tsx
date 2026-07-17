import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Eye } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { listAuditLogs } from "@/services/audit-logs.service"
import { formatDateTime } from "@/utils/format"
import type { AuditLog } from "@/types"

export default function AuditLogsPage() {
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [selected, setSelected] = React.useState<AuditLog | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["audit-logs", { search, page, perPage }],
    queryFn: () => listAuditLogs({ search, page, perPage }),
  })

  const columns: ColumnDef<AuditLog, unknown>[] = [
    { accessorKey: "dateTime", header: "Date & Time", cell: ({ row }) => formatDateTime(row.original.dateTime) },
    { accessorKey: "userName", header: "User" },
    { accessorKey: "roleName", header: "Role" },
    { accessorKey: "module", header: "Module" },
    { accessorKey: "action", header: "Action" },
    { accessorKey: "recordReference", header: "Record Reference" },
    { accessorKey: "ipAddress", header: "IP Address" },
    { accessorKey: "device", header: "Device" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={row.original.status === "Success" ? "success" : "danger"} /> },
    {
      id: "actions",
      header: "Details",
      enableHiding: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="icon-sm" onClick={() => setSelected(row.original)} aria-label="View details">
          <Eye />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Logs" description="Review system activity and change history across all modules." />
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by user or record reference…" className="max-w-sm" />
        </div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="No audit log entries found"
          emptyDescription="Try adjusting your search."
        />
        {data && <Pagination meta={data.meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.action}</DialogTitle>
            <DialogDescription>
              {selected?.userName} · {selected && formatDateTime(selected.dateTime)}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="mb-1 font-medium text-muted-foreground">Old Values</p>
                <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-2 text-foreground">{selected.oldValues ? JSON.stringify(selected.oldValues, null, 2) : "—"}</pre>
              </div>
              <div>
                <p className="mb-1 font-medium text-muted-foreground">New Values</p>
                <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-2 text-foreground">{selected.newValues ? JSON.stringify(selected.newValues, null, 2) : "—"}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
