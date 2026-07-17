import * as React from "react"
import { useSearchParams, Link } from "react-router-dom"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { listLoans } from "@/services/loans.service"
import { LOAN_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"
import type { LoanApplication, LoanStatus } from "@/types"

const STATUSES: LoanStatus[] = ["Draft", "Submitted", "Under Review", "For Approval", "Approved", "Rejected", "Released", "Active", "Fully Paid", "Cancelled", "Overdue", "Restructured"]

interface LoansPageProps {
  presetStatus?: LoanStatus
  overdueOnly?: boolean
  title?: string
  description?: string
}

export default function LoansPage({ presetStatus, overdueOnly, title = "Loan Applications", description = "Track and manage all GCGEA member loan applications." }: LoansPageProps) {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<string>(presetStatus ?? "")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)

  const officeFilter = searchParams.get("office") ?? undefined

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["loans", { search, status, page, perPage, overdueOnly, officeFilter }],
    queryFn: () => listLoans({ search, status: status || undefined, page, perPage, overdueOnly, office: officeFilter }),
  })

  const columns: ColumnDef<LoanApplication, unknown>[] = [
    { accessorKey: "applicationNumber", header: "Application #", cell: ({ row }) => (
        <Link to={`/loans/${row.original.id}`} className="font-medium text-primary hover:underline">{row.original.applicationNumber}</Link>
      ) },
    { accessorKey: "applicationDate", header: "Application Date", cell: ({ row }) => formatDateShort(row.original.applicationDate) },
    { accessorKey: "memberName", header: "Member Name" },
    { accessorKey: "officeName", header: "Office" },
    { accessorKey: "loanTypeName", header: "Loan Type" },
    { accessorKey: "requestedAmount", header: "Requested Amount", cell: ({ row }) => formatCurrency(row.original.requestedAmount) },
    { accessorKey: "monthlyAmortization", header: "Monthly Amortization", cell: ({ row }) => formatCurrency(row.original.monthlyAmortization) },
    { accessorKey: "outstandingBalance", header: "Outstanding Balance", cell: ({ row }) => formatCurrency(row.original.outstandingBalance) },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={LOAN_STATUS_TONE[row.original.status]} /> },
    { accessorKey: "assignedOfficer", header: "Assigned Officer" },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <ExportButtons permission="loans.export" label="loan applications" />
            <PermissionButton permission="loans.create" render={<Link to="/loans/new" />}>
              <Plus />
              Create Loan
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
          emptyTitle="No loan applications found"
          emptyDescription="Try adjusting your search or filters."
        />
        {data && <Pagination meta={data.meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />}
      </div>
    </div>
  )
}
