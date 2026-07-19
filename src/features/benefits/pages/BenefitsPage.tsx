import * as React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { PencilLine, Plus } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ExportButtons } from "@/components/shared/ExportButtons"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { PermissionGuard } from "@/components/shared/PermissionGuard"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { listBenefits } from "@/services/benefits.service"
import { BENEFIT_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"
import type { BenefitApplication, BenefitStatus } from "@/types"

const STATUSES: BenefitStatus[] = ["Draft", "Submitted", "Under Review", "For Approval", "Approved", "Rejected", "Released", "Completed", "Cancelled"]

interface BenefitsPageProps {
  presetStatus?: BenefitStatus
  title?: string
  description?: string
}

export default function BenefitsPage({ presetStatus, title = "Benefit Applications", description = "Track and manage all GCGEA member benefit applications." }: BenefitsPageProps) {
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<string>(presetStatus ?? "")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["benefits", { search, status, page, perPage }],
    queryFn: () => listBenefits({ search, status: status || undefined, page, perPage }),
  })

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
          <PermissionGuard permission="benefits.update">
            <Button variant="outline" size="sm" render={<Link to={`/benefits/${row.original.id}/edit`} />}>
              <PencilLine /> Continue Editing
            </Button>
          </PermissionGuard>
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
            <Select value={status || "all"} onValueChange={(v) => { setStatus(!v || v === "all" ? "" : v); setPage(1) }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Statuses">{(v: string) => (v === "all" ? "All Statuses" : v)}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
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
        />
        {data && <Pagination meta={data.meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />}
      </div>
    </div>
  )
}
