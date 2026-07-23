import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Banknote, CalendarDays, ReceiptText, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { StatCard } from "@/components/shared/StatCard"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { Input } from "@/components/ui/input"
import { listDeductions } from "@/services/deductions.service"
import { listDeductionTypes } from "@/services/deduction-types.service"
import { formatCurrency, formatDateShort } from "@/utils/format"
import type { Deduction } from "@/types"

export default function DeductionRecordsPage() {
  const [search, setSearch] = React.useState("")
  const [period, setPeriod] = React.useState("")
  const [status, setStatus] = React.useState("")
  const [deductionTypeCode, setDeductionTypeCode] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["deduction-records", { search, period, status, deductionTypeCode, page, perPage }],
    queryFn: () => listDeductions({
      search,
      period: period || undefined,
      status: status || undefined,
      deductionTypeCode: deductionTypeCode || undefined,
      page,
      perPage,
    }),
  })
  const { data: deductionTypes = [] } = useQuery({
    queryKey: ["deduction-types"],
    queryFn: listDeductionTypes,
  })

  const rows = data?.data ?? []
  const postedRows = rows.filter((row) => row.status === "Posted")
  const memberCount = new Set(postedRows.map((row) => row.memberId)).size
  const totalAmount = postedRows.reduce((sum, row) => sum + row.amount, 0)

  const columns: ColumnDef<Deduction, unknown>[] = [
    { accessorKey: "referenceNumber", header: "Reference #" },
    { accessorKey: "memberNumber", header: "Member #" },
    { accessorKey: "memberName", header: "Member Name" },
    {
      accessorKey: "deductionTypeName",
      header: "Deduction Type",
      cell: ({ row }) => (
        <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {row.original.deductionTypeName || row.original.deductionTypeCode || "Unspecified"}
        </span>
      ),
    },
    { accessorKey: "period", header: "Period" },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => formatCurrency(row.original.amount) },
    { accessorKey: "paymentDate", header: "Payment Date", cell: ({ row }) => formatDateShort(row.original.paymentDate) },
    { accessorKey: "payrollReference", header: "Payroll Reference", cell: ({ row }) => row.original.payrollReference || "—" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge label={row.original.status} tone={row.original.status === "Posted" ? "success" : "neutral"} />,
    },
    { accessorKey: "encodedBy", header: "Encoded By" },
  ]

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Deduction Records"
        description="View all posted and voided member deductions, grouped by their configured deduction type."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Records on This Page" value={String(rows.length)} icon={ReceiptText} tone="primary" />
        <StatCard label="Members on This Page" value={String(memberCount)} icon={Users} tone="info" />
        <StatCard label="Posted Amount on This Page" value={formatCurrency(totalAmount)} icon={Banknote} tone="success" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="No deduction records found"
          emptyDescription="Try adjusting the search, deduction type, period, or status filter."
          toolbar={
            <>
              <SearchInput
                value={search}
                onChange={(value) => { setSearch(value); setPage(1) }}
                placeholder="Search member or reference #…"
                className="max-w-xs"
              />
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="month"
                  value={period}
                  onChange={(event) => { setPeriod(event.target.value); setPage(1) }}
                  className="h-9 w-44 pl-9 text-xs"
                />
              </div>
              <CommandSelect
                size="sm"
                className="h-9 w-48 text-xs"
                value={deductionTypeCode || "__all__"}
                onValueChange={(value) => { setDeductionTypeCode(value === "__all__" ? "" : value); setPage(1) }}
                options={[
                  { value: "__all__", label: "All Deduction Types" },
                  ...deductionTypes.map((type) => ({ value: type.code, label: type.name })),
                ]}
                placeholder="Deduction type"
              />
              <CommandSelect
                size="sm"
                className="h-9 w-36 text-xs"
                value={status || "__all__"}
                onValueChange={(value) => { setStatus(value === "__all__" ? "" : value); setPage(1) }}
                options={[
                  { value: "__all__", label: "All Statuses" },
                  { value: "Posted", label: "Posted" },
                  { value: "Voided", label: "Voided" },
                ]}
                hideSearch
              />
            </>
          }
        />
        {data?.meta && (
          <Pagination
            meta={data.meta}
            onPageChange={setPage}
            onPerPageChange={(value) => { setPerPage(value); setPage(1) }}
          />
        )}
      </div>
    </div>
  )
}
