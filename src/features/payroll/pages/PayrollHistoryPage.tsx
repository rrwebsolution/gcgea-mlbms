import * as React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Eye, Plus } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { SearchInput } from "@/components/shared/SearchInput"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { listPayrollDeductionHistory } from "@/services/payroll-history.service"
import { PAYROLL_ENTRY_TYPE_TONE, PAYROLL_HISTORY_STATUS_TONE } from "@/constants/status"
import { formatCurrency } from "@/utils/format"
import type { PayrollDeductionHistoryEntry, PayrollEntryType } from "@/types/payroll-history"

const ENTRY_TYPES: PayrollEntryType[] = ["Manual Entry", "Bulk Entry", "Excel Import"]
const STATUSES = ["Draft", "Posted", "Uploaded", "Previewed", "Committed", "RolledBack"]

export default function PayrollHistoryPage() {
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [payrollPeriod, setPayrollPeriod] = React.useState("")
  const [office, setOffice] = React.useState("")
  const [member, setMember] = React.useState("")
  const [entryType, setEntryType] = React.useState<PayrollEntryType | "">("")
  const [status, setStatus] = React.useState("")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["payroll-history", { page, perPage, payrollPeriod, office, member, entryType, status, dateFrom, dateTo }],
    queryFn: () =>
      listPayrollDeductionHistory({
        page,
        perPage,
        payrollPeriod: payrollPeriod || undefined,
        office: office || undefined,
        member: member || undefined,
        entryType: entryType || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  })

  const hasFilters = Boolean(payrollPeriod || office || member || entryType || status || dateFrom || dateTo)

  function clearFilters() {
    setPayrollPeriod("")
    setOffice("")
    setMember("")
    setEntryType("")
    setStatus("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const columns: ColumnDef<PayrollDeductionHistoryEntry, unknown>[] = [
    {
      accessorKey: "entryType",
      header: "Entry Type",
      cell: ({ row }) => <StatusBadge label={row.original.entryType} tone={PAYROLL_ENTRY_TYPE_TONE[row.original.entryType]} />,
    },
    { accessorKey: "payrollPeriod", header: "Payroll Period" },
    { accessorKey: "reference", header: "Reference", cell: ({ row }) => row.original.reference || "—" },
    { accessorKey: "officeName", header: "Office", cell: ({ row }) => row.original.officeName || "—" },
    { accessorKey: "memberName", header: "Member", cell: ({ row }) => row.original.memberName || "—" },
    { accessorKey: "totalDeduction", header: "Total Deduction", cell: ({ row }) => formatCurrency(row.original.totalDeduction) },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge label={row.original.status} tone={PAYROLL_HISTORY_STATUS_TONE[row.original.status] ?? "neutral"} />,
    },
    { accessorKey: "encodedBy", header: "Encoded By", cell: ({ row }) => row.original.encodedBy || "—" },
    {
      accessorKey: "encodedAt",
      header: "Date",
      cell: ({ row }) => (row.original.encodedAt ? new Date(row.original.encodedAt).toLocaleString() : "—"),
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) =>
        row.original.detailToken ? (
          <Button variant="ghost" size="icon-sm" className="size-8" aria-label="View batch" render={<Link to={`/payroll-deductions/history/${row.original.detailToken}`} />}>
            <Eye className="size-4 text-muted-foreground/80" />
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Payroll Deduction History"
        description="View all posted payroll deduction batches and manually entered payroll deductions."
        actions={
          <PermissionButton permission="payroll.import.view" className="h-9 gap-1.5 text-xs shadow-sm" render={<Link to="/payroll-deductions/import" />}>
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
          emptyTitle="No payroll deduction records yet"
          emptyDescription="Manual entries, bulk entries, and payroll imports will appear here."
          toolbar={
            <>
              <Input type="month" className="h-9 w-40 text-xs" value={payrollPeriod} onChange={(e) => { setPayrollPeriod(e.target.value); setPage(1) }} aria-label="Payroll period" />
              <OfficeSelect value={office} onValueChange={(v) => { setOffice(v); setPage(1) }} placeholder="All Offices" activeOnly={false} className="w-44 text-xs h-9" />
              <SearchInput value={member} onChange={(v) => { setMember(v); setPage(1) }} placeholder="Search member…" className="max-w-xs" />
              <CommandSelect
                size="sm"
                className="w-40 text-xs h-9"
                value={entryType || "__all__"}
                onValueChange={(v) => { setEntryType(v === "__all__" ? "" : (v as PayrollEntryType)); setPage(1) }}
                placeholder="All Entry Types"
                options={[
                  { value: "__all__", label: "All Entry Types" },
                  ...ENTRY_TYPES.map((t) => ({ value: t, label: t })),
                ]}
                hideSearch
              />
              <CommandSelect
                size="sm"
                className="w-36 text-xs h-9"
                value={status || "__all__"}
                onValueChange={(v) => { setStatus(v === "__all__" ? "" : (v ?? "")); setPage(1) }}
                placeholder="All Statuses"
                options={[
                  { value: "__all__", label: "All Statuses" },
                  ...STATUSES.map((s) => ({ value: s, label: s })),
                ]}
              />
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
