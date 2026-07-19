import * as React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ExportButtons } from "@/components/shared/ExportButtons"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { listLoanPayments } from "@/services/loan-payments.service"
import { PAYMENT_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"
import type { LoanPayment } from "@/types"

export default function LoanPaymentsPage() {
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["loan-payments", { search, page, perPage }],
    queryFn: () => listLoanPayments({ search, page, perPage }),
  })

  const columns: ColumnDef<LoanPayment, unknown>[] = [
    { accessorKey: "paymentReferenceNumber", header: "Payment Reference #", cell: ({ row }) => <span className="font-medium text-foreground">{row.original.paymentReferenceNumber}</span> },
    { accessorKey: "memberName", header: "Member" },
    { accessorKey: "loanApplicationNumber", header: "Loan Application #" },
    { accessorKey: "paymentDate", header: "Payment Date", cell: ({ row }) => formatDateShort(row.original.paymentDate) },
    { accessorKey: "amountPaid", header: "Amount Paid", cell: ({ row }) => formatCurrency(row.original.amountPaid) },
    { accessorKey: "principalPortion", header: "Principal", cell: ({ row }) => formatCurrency(row.original.principalPortion) },
    { accessorKey: "interestPortion", header: "Interest", cell: ({ row }) => formatCurrency(row.original.interestPortion) },
    { accessorKey: "paymentMethod", header: "Payment Method" },
    { accessorKey: "officialReceiptNumber", header: "O.R. Number" },
    { accessorKey: "receivedBy", header: "Received By" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={PAYMENT_STATUS_TONE[row.original.status]} /> },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Loan Payments"
        description="Record and track loan amortization payments."
        actions={<><ExportButtons permission="loan_payments.view" label="loan payments" /><PermissionButton permission="loan_payments.create" render={<Link to="/loan-payments/new" />}><Plus /> Record Payment</PermissionButton></>}
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
          emptyTitle="No loan payments found"
          emptyDescription="Try adjusting your search."
        />
        {data && <Pagination meta={data.meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />}
      </div>
    </div>
  )
}
