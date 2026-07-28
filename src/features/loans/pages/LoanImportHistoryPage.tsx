import * as React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Eye, Plus } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { SearchInput } from "@/components/shared/SearchInput"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { listLoanImportBatches } from "@/services/loan-import-history.service"
import { formatDateTime } from "@/utils/format"
import type { LoanImportBatchSummary } from "@/types"

export default function LoanImportHistoryPage() {
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [period, setPeriod] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["loan-import-history", { page, perPage, period, search, dateFrom, dateTo }],
    queryFn: () =>
      listLoanImportBatches({
        page,
        perPage,
        period: period || undefined,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  })

  const hasFilters = Boolean(period || search || dateFrom || dateTo)

  function clearFilters() {
    setPeriod("")
    setSearch("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const columns: ColumnDef<LoanImportBatchSummary, unknown>[] = [
    {
      accessorKey: "originalFilename",
      header: "Workbook",
      cell: ({ row }) => (
        <Link to={`/loans/import-history/${row.original.token}`} className="font-semibold text-primary hover:underline">
          {row.original.originalFilename}
        </Link>
      ),
    },
    { accessorKey: "balancePeriod", header: "Balance Month" },
    { accessorKey: "totalRows", header: "Rows" },
    { accessorKey: "createdCount", header: "Imported" },
    { accessorKey: "skippedCount", header: "Skipped" },
    { accessorKey: "uploadedBy", header: "Imported By", cell: ({ row }) => row.original.uploadedBy || "—" },
    { accessorKey: "committedAt", header: "Import Date", cell: ({ row }) => (row.original.committedAt ? formatDateTime(row.original.committedAt) : "—") },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="icon-sm" className="size-8" aria-label="View batch" render={<Link to={`/loans/import-history/${row.original.token}`} />}>
          <Eye className="size-4 text-muted-foreground/80" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Loan Import History"
        description="Past Import Existing Loans batches and their outcomes."
        actions={
          <PermissionButton permission="loan_payments.import" className="h-9 gap-1.5 text-xs shadow-sm" render={<Link to="/loans/import" />}>
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
          emptyTitle="No loan imports yet"
          emptyDescription="Run an Import Existing Loans batch to see its history here."
          toolbar={
            <>
              <Input type="month" className="h-9 w-40 text-xs" value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1) }} aria-label="Balance month" />
              <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search workbook name…" className="max-w-xs" />
              <div className="flex items-center gap-1 bg-background border border-border/85 rounded-lg px-2.5 shadow-sm h-9">
                <Input type="date" className="h-7 w-32 border-0 bg-transparent p-0 text-xs focus-visible:ring-0 shadow-none" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} aria-label="Date from" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-1">to</span>
                <Input type="date" className="h-7 w-32 border-0 bg-transparent p-0 text-xs focus-visible:ring-0 shadow-none" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} aria-label="Date to" />
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-9 px-3 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </>
          }
        />
        {data && <Pagination meta={data.meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />}
      </div>
    </div>
  )
}
