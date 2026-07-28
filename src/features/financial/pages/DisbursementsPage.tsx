import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import { Eye, FilePlus2 } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { SearchInput } from "@/components/shared/SearchInput"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { listDisbursements } from "@/services/disbursements.service"
import { formatCurrency, formatDate } from "@/utils/format"
import type { Disbursement, DisbursementStatus } from "@/types"
import type { StatusTone } from "@/constants/status"

function tone(status: DisbursementStatus): StatusTone {
  if (status === "Paid" || status === "Approved") return "success"
  if (status === "Rejected" || status === "Voided") return "danger"
  if (status === "For Approval") return "warning"
  return "neutral"
}

export default function DisbursementsPage() {
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<DisbursementStatus | "">("")
  const query = useQuery({
    queryKey: ["disbursements", { page, perPage, search, status }],
    queryFn: () => listDisbursements({ page, perPage, search, status }),
  })

  const columns: ColumnDef<Disbursement, unknown>[] = [
    { accessorKey: "referenceNumber", header: "Reference", cell: ({ row }) => <span className="font-semibold">{row.original.referenceNumber}</span> },
    { accessorKey: "disbursementDate", header: "Date", cell: ({ row }) => formatDate(row.original.disbursementDate) },
    { accessorKey: "accountTitle", header: "Particular" },
    { accessorKey: "payee", header: "Payee" },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => formatCurrency(row.original.amount) },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={tone(row.original.status)} /> },
    { accessorKey: "preparedBy", header: "Prepared By", cell: ({ row }) => row.original.preparedBy ?? "—" },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" render={<Link to={`/financial/disbursements/${row.original.id}`} />}>
          <Eye /> View
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Disbursements"
        description="Encode, approve, pay, and audit expenses against approved annual-budget accounts."
        actions={
          <PermissionButton permission="disbursements.manage" render={<Link to="/financial/disbursements/new" />}>
            <FilePlus2 /> New Disbursement
          </PermissionButton>
        }
      />
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Search reference, payee, or particular…" className="w-full sm:max-w-sm" />
          <CommandSelect
            className="w-full sm:w-48"
            value={status || "__all__"}
            onValueChange={(value) => { setStatus(value === "__all__" ? "" : value as DisbursementStatus); setPage(1) }}
            options={[
              { value: "__all__", label: "All Statuses" },
              ...["Draft", "For Approval", "Approved", "Paid", "Rejected", "Voided"].map((value) => ({ value, label: value })),
            ]}
            hideSearch
          />
        </div>
        <DataTable columns={columns} data={query.data?.data ?? []} isLoading={query.isLoading} emptyTitle="No disbursements found" getRowId={(row) => row.id} />
        {query.data && <Pagination meta={query.data.meta} onPageChange={setPage} onPerPageChange={(value) => { setPerPage(value); setPage(1) }} />}
      </div>
    </div>
  )
}
