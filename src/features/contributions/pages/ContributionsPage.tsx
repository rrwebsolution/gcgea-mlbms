import * as React from "react"
import { Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import { Ban, Download, Eye, History, Pencil, Plus, Printer, Wallet, Banknote, Users, UserX, CalendarClock } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { StatCard } from "@/components/shared/StatCard"
import { ExportButtons } from "@/components/shared/ExportButtons"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { VoidTransactionDialog } from "@/components/shared/VoidTransactionDialog"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { listContributions, getAllContributions, getContributionPeriods, voidContribution } from "@/services/contributions.service"
import { getAllActiveMembers } from "@/services/members.service"
import { CONTRIBUTION_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { downloadCsv } from "@/utils/csv"
import { useAuth } from "@/contexts/AuthContext"
import type { Contribution, PaymentMethod } from "@/types"

const PAYMENT_METHODS: PaymentMethod[] = ["Payroll Deduction", "Cash", "Bank Transfer", "Check"]

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export default function ContributionsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [period, setPeriod] = React.useState("")
  const [office, setOffice] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState("")
  const [status, setStatus] = React.useState("")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")

  const [voidTarget, setVoidTarget] = React.useState<Contribution | null>(null)
  const [isVoiding, setIsVoiding] = React.useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["contributions", { search, page, perPage, period, office, paymentMethod, status, dateFrom, dateTo }],
    queryFn: () => listContributions({ search, page, perPage, period: period || undefined, office: office || undefined, paymentMethod: paymentMethod || undefined, status: status || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
  })

  const periods = React.useMemo(() => getContributionPeriods(), [data])

  const summary = React.useMemo(() => {
    const all = getAllContributions()
    const posted = all.filter((c) => c.status === "Posted")
    const thisPeriod = currentPeriod()
    const activeMembers = getAllActiveMembers()
    const paidThisPeriodIds = new Set(posted.filter((c) => c.contributionPeriod === thisPeriod).map((c) => c.memberId))
    const paidMembers = activeMembers.filter((m) => paidThisPeriodIds.has(m.id)).length
    const unpaidMembers = activeMembers.length - paidMembers
    const contributionsThisMonth = posted.filter((c) => c.paymentDate.slice(0, 7) === thisPeriod).length
    return {
      totalContributions: all.length,
      totalAmount: posted.reduce((sum, c) => sum + c.amount, 0),
      paidMembers,
      unpaidMembers: Math.max(0, unpaidMembers),
      contributionsThisMonth,
    }
  }, [data])

  async function handleVoid(reason: string) {
    if (!voidTarget || !user) return
    setIsVoiding(true)
    try {
      await voidContribution(voidTarget.id, reason)
      await queryClient.invalidateQueries({ queryKey: ["contributions"] })
      toast.success("Contribution voided.")
      setVoidTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to void this contribution.")
    } finally {
      setIsVoiding(false)
    }
  }

  function handleExportCsv() {
    const rows = data?.data ?? []
    downloadCsv(
      "contribution-records.csv",
      ["Reference #", "Member #", "Member Name", "Office", "Period", "Amount", "Payment Method", "Payment Date", "Status", "Encoded By"],
      rows.map((c) => [c.referenceNumber, c.memberNumber, c.memberName, c.officeName, c.contributionPeriod, c.amount.toFixed(2), c.paymentMethod, c.paymentDate, c.status, c.encodedBy])
    )
    toast.success("Contribution records exported to CSV.")
  }

  const columns: ColumnDef<Contribution, unknown>[] = [
    {
      accessorKey: "referenceNumber",
      header: "Reference #",
      cell: ({ row }) => (
        <Link to={`/contributions/${row.original.id}`} className="font-semibold text-primary hover:text-primary/80 hover:underline tracking-tight transition-colors">
          {row.original.referenceNumber}
        </Link>
      ),
    },
    { accessorKey: "memberNumber", header: "Member #" },
    { accessorKey: "memberName", header: "Member Name" },
    { accessorKey: "officeName", header: "Office" },
    { accessorKey: "contributionPeriod", header: "Period" },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => formatCurrency(row.original.amount) },
    { accessorKey: "paymentMethod", header: "Payment Method" },
    { accessorKey: "paymentDate", header: "Payment Date", cell: ({ row }) => formatDateShort(row.original.paymentDate) },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={CONTRIBUTION_STATUS_TONE[row.original.status]} /> },
    { accessorKey: "encodedBy", header: "Encoded By" },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => {
        const c = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger 
              render={
                <Button 
                  variant="ghost" 
                  size="icon-sm" 
                  className="size-8 hover:bg-accent/80 active:scale-95 transition-all duration-150" 
                  aria-label="Row actions" 
                />
              }
            >
              <Eye className="size-4 text-muted-foreground/80" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem render={<Link to={`/contributions/${c.id}`} />} className="text-xs">
                <Eye className="size-3.5 mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to={`/contributions/${c.id}`} />} className="text-xs">
                <History className="size-3.5 mr-2" /> View History
              </DropdownMenuItem>
              {c.status === "Posted" && (
                <DropdownMenuItem render={<Link to={`/contributions/${c.id}/edit`} />} className="text-xs">
                  <Pencil className="size-3.5 mr-2" /> Edit Records
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => toast.info("Preparing receipt for printing…")} className="text-xs">
                <Printer className="size-3.5 mr-2" /> Print Receipt
              </DropdownMenuItem>
              {c.status === "Posted" && (
                <DropdownMenuItem variant="destructive" onClick={() => setVoidTarget(c)} className="text-xs">
                  <Ban className="size-3.5 mr-2" /> Void Transaction
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Contribution Records"
        description="View and manage GCGEA member contribution records."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PermissionButton 
              permission="contributions.print" 
              variant="outline" 
              size="sm" 
              className="h-9 gap-1.5 text-xs hover:bg-accent/80 active:scale-97 transition-all" 
              onClick={() => window.print()}
            >
              <Printer className="size-3.5" /> Print
            </PermissionButton>
            <PermissionButton 
              permission="contributions.export" 
              variant="outline" 
              size="sm" 
              className="h-9 gap-1.5 text-xs hover:bg-accent/80 active:scale-97 transition-all" 
              onClick={handleExportCsv}
            >
              <Download className="size-3.5" /> Export CSV
            </PermissionButton>
            <ExportButtons permission="contributions.export" label="contribution records" />
            <PermissionButton 
              permission="contributions.create" 
              className="h-9 gap-1.5 text-xs shadow-sm active:scale-97 transition-all" 
              render={<Link to="/contributions/new" />}
            >
              <Plus className="size-4" /> Add Contribution
            </PermissionButton>
          </div>
        }
      />

      {/* KPI Stats Panel */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Contributions" value={String(summary.totalContributions)} icon={Wallet} tone="primary" />
        <StatCard label="Total Amount Collected" value={formatCurrency(summary.totalAmount)} icon={Banknote} tone="success" />
        <StatCard label="Paid Members" value={String(summary.paidMembers)} icon={Users} tone="info" />
        <StatCard label="Unpaid Members" value={String(summary.unpaidMembers)} icon={UserX} tone="warning" />
        <StatCard label="Contributions This Month" value={String(summary.contributionsThisMonth)} icon={CalendarClock} tone="gold" />
      </div>

      {/* Main Table view and Filter options */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        
        {/* Data list view with integrated filters and column selector */}
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="No contributions found"
          emptyDescription="Try adjusting your search or filters."
          toolbar={
            <>
          <SearchInput 
            value={search} 
            onChange={(v) => { setSearch(v); setPage(1) }} 
            placeholder="Search by member, reference #…" 
            className="max-w-xs" 
          />
          <Select value={period || "__all__"} onValueChange={(v) => { setPeriod(v === "__all__" ? "" : (v ?? "")); setPage(1) }}>
            <SelectTrigger size="sm" className="w-40 text-xs bg-background h-9 border-border/85 hover:bg-accent/40 active:scale-99 transition-all">
              <SelectValue placeholder="All Periods">{(v: string) => (v === "__all__" ? "All Periods" : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-xs">All Periods</SelectItem>
              {periods.map((p) => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <OfficeSelect 
            value={office} 
            onValueChange={(v) => { setOffice(v); setPage(1) }} 
            placeholder="All Offices" 
            activeOnly={false} 
            className="w-44 text-xs h-9 bg-background border-border/85 hover:bg-accent/40 active:scale-99 transition-all" 
          />
          <Select value={paymentMethod || "__all__"} onValueChange={(v) => { setPaymentMethod(v === "__all__" ? "" : (v ?? "")); setPage(1) }}>
            <SelectTrigger size="sm" className="w-44 text-xs bg-background h-9 border-border/85 hover:bg-accent/40 active:scale-99 transition-all">
              <SelectValue placeholder="All Payment Methods">{(v: string) => (v === "__all__" ? "All Payment Methods" : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-xs">All Payment Methods</SelectItem>
              {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status || "__all__"} onValueChange={(v) => { setStatus(v === "__all__" ? "" : (v ?? "")); setPage(1) }}>
            <SelectTrigger size="sm" className="w-32 text-xs bg-background h-9 border-border/85 hover:bg-accent/40 active:scale-99 transition-all">
              <SelectValue placeholder="All Statuses">{(v: string) => (v === "__all__" ? "All Statuses" : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="Posted" className="text-xs">Posted</SelectItem>
              <SelectItem value="Voided" className="text-xs">Voided</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Custom Integrated Datepicker Box */}
          <div className="flex items-center gap-1 bg-background border border-border/85 rounded-lg px-2.5 shadow-sm h-9">
            <Input 
              type="date" 
              className="h-7 w-32 border-0 bg-transparent p-0 text-xs focus-visible:ring-0 shadow-none" 
              value={dateFrom} 
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} 
              aria-label="Date from" 
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-1">to</span>
            <Input 
              type="date" 
              className="h-7 w-32 border-0 bg-transparent p-0 text-xs focus-visible:ring-0 shadow-none" 
              value={dateTo} 
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }} 
              aria-label="Date to" 
            />
          </div>
          
          {(period || office || paymentMethod || status || dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-97 transition-all duration-150"
              onClick={() => { setPeriod(""); setOffice(""); setPaymentMethod(""); setStatus(""); setDateFrom(""); setDateTo(""); setPage(1) }}
            >
              Clear Filters
            </Button>
          )}
            </>
          }
        />
        
        {/* Pagination element */}
        {data && <Pagination meta={data.meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />}
      </div>

      {/* Transaction Cancellation Confirmation Overlay */}
      <VoidTransactionDialog
        open={!!voidTarget}
        onOpenChange={(open) => !open && setVoidTarget(null)}
        transactionLabel={voidTarget ? `Contribution ${voidTarget.referenceNumber}` : "Contribution"}
        isLoading={isVoiding}
        onConfirm={handleVoid}
      />
    </div>
  )
}
