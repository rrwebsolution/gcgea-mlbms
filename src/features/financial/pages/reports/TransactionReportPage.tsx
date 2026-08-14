import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import { ArrowLeft, ChevronDown, Search } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable } from "@/components/shared/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { formatCurrency, formatDate } from "@/utils/format"
import { getTransactionReport, type ReportTransaction } from "@/services/transaction-report.service"

const today = new Date().toISOString().slice(0, 10)
const yearStart = `${new Date().getFullYear()}-01-01`
const TYPES = ["All", "Contribution Payment", "Loan Payment", "Benefit Payment", "Membership Payment", "Other Payment"]
const ROW_BATCH_SIZE = 50

export default function TransactionReportPage() {
  const [draft, setDraft] = React.useState({ startDate: yearStart, endDate: today, type: "All" })
  const [filters, setFilters] = React.useState(draft)
  const query = useQuery({ queryKey: ["transaction-report", filters], queryFn: () => getTransactionReport(filters) })
  const report = query.data
  const [visibleRows, setVisibleRows] = React.useState(ROW_BATCH_SIZE)
  React.useEffect(() => { setVisibleRows(ROW_BATCH_SIZE) }, [report?.periodStart, report?.periodEnd, filters.type])
  const displayedTransactions = report?.transactions.slice(0, visibleRows) ?? []
  const columns = React.useMemo<ColumnDef<ReportTransaction, unknown>[]>(() => [
    { accessorKey: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
    { accessorKey: "reference", header: "Reference", cell: ({ row }) => <span className="font-mono text-xs">{row.original.reference}</span> },
    { accessorKey: "type", header: "Transaction Type", cell: ({ row }) => <span className="font-medium">{row.original.type}</span> },
    { accessorKey: "party", header: "Member / Payee" },
    { accessorKey: "details", header: "Details", cell: ({ row }) => <span className="block max-w-56 truncate" title={row.original.details}>{row.original.details}</span> },
    { accessorKey: "method", header: "Method" },
    { accessorKey: "direction", header: "Flow", cell: ({ row }) => <Badge variant={row.original.direction === "Inflow" ? "secondary" : "outline"}>{row.original.direction}</Badge> },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => <span className={`block text-right font-mono ${row.original.direction === "Inflow" ? "text-emerald-600" : "text-rose-600"}`}>{row.original.direction === "Outflow" ? "−" : "+"}{formatCurrency(row.original.amount)}</span> },
    { accessorKey: "status", header: "Status" },
  ], [])

  return <div className="space-y-5 pb-20">
    <Button variant="ghost" size="sm" render={<Link to="/reports" />}><ArrowLeft /> Back to Report Center</Button>
    <PageHeader title="Transaction Report" description="Unified record of posted payments, releases, and other financial transactions." />
    <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <label className="space-y-1 text-xs font-medium">Start Date<Input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></label>
      <label className="space-y-1 text-xs font-medium">End Date<Input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} /></label>
      <label className="space-y-1 text-xs font-medium">Transaction Type<CommandSelect value={draft.type} onValueChange={(type) => setDraft({ ...draft, type })} options={TYPES.map((value) => ({ value, label: value }))} hideSearch /></label>
      <Button disabled={!draft.startDate || !draft.endDate || draft.endDate < draft.startDate} onClick={() => setFilters({ ...draft })}><Search /> Generate Report</Button>
    </div>
    {(report || query.isFetching) && <>
      <div className="grid gap-3 sm:grid-cols-3"><Summary label="Total Inflow" value={report?.summary.inflow ?? 0} tone="text-emerald-600" /><Summary label="Total Outflow" value={report?.summary.outflow ?? 0} tone="text-rose-600" /><Summary label="Transactions" value={report?.summary.count ?? 0} /></div>
      <div className="overflow-hidden rounded-xl border bg-card"><DataTable columns={columns} data={displayedTransactions} isLoading={query.isFetching} isError={query.isError} onRetry={() => query.refetch()} getRowId={(row) => row.id} emptyTitle="No transactions found" emptyDescription="No posted transactions match the selected date range and type." maxHeight="max-h-[calc(100vh-25rem)]" bodyEnd={report && displayedTransactions.length < report.transactions.length ? <div className="flex w-full flex-col items-center justify-center gap-2 text-center"><p>Showing {displayedTransactions.length.toLocaleString()} of {report.transactions.length.toLocaleString()} transactions</p><Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500" onClick={() => setVisibleRows((count) => Math.min(count + ROW_BATCH_SIZE, report.transactions.length))}>Load More Transactions <ChevronDown /></Button></div> : undefined} /></div>
    </>}
  </div>
}

function Summary({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
  return <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-2 text-xl font-bold ${tone}`}>{label === "Transactions" ? value.toLocaleString() : formatCurrency(value)}</p></div>
}
