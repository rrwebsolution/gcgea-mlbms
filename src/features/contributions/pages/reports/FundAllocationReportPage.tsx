import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowLeft, Landmark, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { ReportDataTable } from "@/features/reports/components/ReportDataTable"
import { StatCard } from "@/components/shared/StatCard"
import { getFundAllocationReport, type FundAllocationReportRow } from "@/services/contribution-funds.service"
import { formatCurrency } from "@/utils/format"

const columns: ColumnDef<FundAllocationReportRow, unknown>[] = [
  { accessorKey: "fundName", header: "Fund Name" },
  { accessorKey: "allocatedAmount", header: "Allocated Amount", cell: ({ row }) => formatCurrency(row.original.allocatedAmount) },
  { accessorKey: "currentBalance", header: "Current Balance", cell: ({ row }) => formatCurrency(row.original.currentBalance) },
  { accessorKey: "monthlyTotal", header: "Monthly Total", cell: ({ row }) => formatCurrency(row.original.monthlyTotal) },
  { accessorKey: "annualTotal", header: "Annual Total", cell: ({ row }) => formatCurrency(row.original.annualTotal) },
]

export default function FundAllocationReportPage() {
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["reports", "fund-allocations"], queryFn: getFundAllocationReport })
  const currentBalance = rows.reduce((sum, row) => sum + row.currentBalance, 0)
  const monthlyTotal = rows.reduce((sum, row) => sum + row.monthlyTotal, 0)
  const annualTotal = rows.reduce((sum, row) => sum + row.annualTotal, 0)

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2" render={<Link to="/reports" />}><ArrowLeft /> Back to Report Center</Button>
      <PageHeader title="Fund Allocation Report" description="Dynamic balances generated from all configured Monthly Dues funds." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Current Fund Balance" value={formatCurrency(currentBalance)} icon={Landmark} tone="primary" isLoading={isLoading} />
        <StatCard label="Current Month" value={formatCurrency(monthlyTotal)} icon={Wallet} tone="success" isLoading={isLoading} />
        <StatCard label="Current Year" value={formatCurrency(annualTotal)} icon={Wallet} tone="gold" isLoading={isLoading} />
      </div>
      <div className="rounded-xl border bg-card">
        <ReportDataTable columns={columns} data={rows} getRowId={(row) => row.fundId} emptyTitle="No fund allocations found" />
      </div>
    </div>
  )
}
