import * as React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ExportButtons } from "@/components/shared/ExportButtons"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { listContributions } from "@/services/contributions.service"
import { CONTRIBUTION_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"
import type { Contribution } from "@/types"

export default function ContributionsPage() {
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["contributions", { search, page, perPage }],
    queryFn: () => listContributions({ search, page, perPage }),
  })

  const columns: ColumnDef<Contribution, unknown>[] = [
    { accessorKey: "referenceNumber", header: "Reference #", cell: ({ row }) => <span className="font-medium text-foreground">{row.original.referenceNumber}</span> },
    { accessorKey: "memberNumber", header: "Member #" },
    { accessorKey: "memberName", header: "Member Name" },
    { accessorKey: "officeName", header: "Office" },
    { accessorKey: "contributionPeriod", header: "Period" },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => formatCurrency(row.original.amount) },
    { accessorKey: "paymentDate", header: "Payment Date", cell: ({ row }) => formatDateShort(row.original.paymentDate) },
    { accessorKey: "paymentMethod", header: "Payment Method" },
    { accessorKey: "encodedBy", header: "Encoded By" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={CONTRIBUTION_STATUS_TONE[row.original.status]} /> },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contribution Records"
        description="View and manage GCGEA member contribution records."
        actions={
          <>
            <ExportButtons permission="contributions.export" label="contribution records" />
            <PermissionButton permission="contributions.create" render={<Link to="/contributions/new" />}>
              <Plus />
              Record Contribution
            </PermissionButton>
          </>
        }
      />
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by member, reference #…" className="max-w-sm" />
        </div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="No contributions found"
          emptyDescription="Try adjusting your search."
        />
        {data && <Pagination meta={data.meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />}
      </div>
    </div>
  )
}
