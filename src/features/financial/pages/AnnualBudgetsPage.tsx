import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import { Eye, FilePlus2, Wallet, Banknote, PiggyBank, ShieldCheck, TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable } from "@/components/shared/DataTable"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Pagination } from "@/components/shared/Pagination"
import { SearchInput } from "@/components/shared/SearchInput"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { listAllAnnualBudgets, type AnnualBudget, type AnnualBudgetStatus } from "@/services/annual-budgets.service"
import { formatCurrency } from "@/utils/format"
import { paginate } from "@/utils/paginate"
import { cn } from "@/lib/utils"

function badgeClass(status: AnnualBudgetStatus) {
  if (status === "Approved") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
  if (status === "For Approval") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
  if (status === "Rejected") return "border-destructive/30 bg-destructive/10 text-destructive"
  return "border-border/60 bg-muted text-muted-foreground"
}

export default function AnnualBudgetsPage() {
  const { hasPermission } = useAuth()
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [status, setStatus] = React.useState<AnnualBudgetStatus | "">("")
  const [search, setSearch] = React.useState("")

  // Fetches the full list once and pages/searches/filters entirely client-side. The
  // search box previously sent a `search` param the backend never actually read (only
  // `status` was filtered server-side) — implemented here for real, matching what the
  // placeholder text already promised (fiscal year, status, preparer, approver).
  const query = useQuery({
    queryKey: ["annual-budgets", "all"],
    queryFn: listAllAnnualBudgets,
  })
  const allBudgets = query.data ?? []

  const filteredBudgets = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return allBudgets.filter((b) => {
      const matchesSearch = !q
        || String(b.fiscalYear).includes(q)
        || b.status.toLowerCase().includes(q)
        || (b.preparedBy ?? "").toLowerCase().includes(q)
        || (b.approvedBy ?? "").toLowerCase().includes(q)
      const matchesStatus = !status || b.status === status
      return matchesSearch && matchesStatus
    })
  }, [allBudgets, search, status])

  const { data: pagedBudgets, meta } = paginate(filteredBudgets, page, perPage)

  // Executive KPI Summary Aggregation — over the current page, matching the prior behavior
  // (these figures were always computed from data?.data, i.e. only the visible page).
  const budgetList = pagedBudgets
  const totalProposed = React.useMemo(() => budgetList.reduce((acc, item) => acc + (item.totalProposedBudget || 0), 0), [budgetList])
  const totalRevenue = React.useMemo(() => budgetList.reduce((acc, item) => acc + (item.estimatedRevenue || 0), 0), [budgetList])
  const totalUnallocated = React.useMemo(() => budgetList.reduce((acc, item) => acc + (item.unallocatedBalance || 0), 0), [budgetList])

  const columns = React.useMemo<ColumnDef<AnnualBudget, unknown>[]>(() => [
    { 
      accessorKey: "fiscalYear", 
      header: "Fiscal Year", 
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary ring-1 ring-primary/20">
            {row.original.fiscalYear.toString().slice(-2)}
          </span>
          <span className="font-bold text-foreground">FY {row.original.fiscalYear}</span>
        </div>
      )
    },
    { 
      accessorKey: "estimatedRevenue", 
      header: () => <div>Estimated Revenue</div>, 
      cell: ({ row }) => (
        <div className="font-medium text-foreground">
          {formatCurrency(row.original.estimatedRevenue)}
        </div>
      ) 
    },
    { 
      accessorKey: "totalProposedBudget", 
      header: () => <div>Proposed Budget</div>, 
      cell: ({ row }) => (
        <div className="font-semibold text-primary">
          {formatCurrency(row.original.totalProposedBudget)}
        </div>
      ) 
    },
    { 
      accessorKey: "unallocatedBalance", 
      header: () => <div>Unallocated Balance</div>, 
      cell: ({ row }) => {
        const val = row.original.unallocatedBalance
        return (
          <div className={cn(" font-mono text-xs font-semibold", val < 0 ? "text-destructive" : "text-muted-foreground")}>
            {formatCurrency(val)}
          </div>
        )
      } 
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-2xs", badgeClass(row.original.status))}>
          {row.original.status}
        </Badge>
      ),
    },
    { accessorKey: "preparedBy", header: "Prepared By", cell: ({ row }) => <span className="text-xs font-medium text-muted-foreground">{row.original.preparedBy ?? "—"}</span> },
    { accessorKey: "approvedBy", header: "Approver", cell: ({ row }) => <span className="text-xs font-medium text-muted-foreground">{row.original.approvedBy ?? row.original.currentStageLabel ?? "—"}</span> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const isEditable = hasPermission("annual_budgets.manage") && ["Draft", "Rejected"].includes(row.original.status)
        return (
          <div className="text-right">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs rounded-xl hover:bg-muted" render={<Link to={`/financial/annual-budgets/${row.original.fiscalYear}`} />}>
              <Eye className="size-3.5" />
              <span>{isEditable ? "Open" : "View"}</span>
            </Button>
          </div>
        )
      },
    },
  ], [hasPermission])

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Annual Expenditure Budgets"
        description="Prepare, submit, approve, and review GCGEA annual expenditure programs and allocations."
        actions={
          <PermissionButton
            permission="annual_budgets.manage"
            render={<Link to={`/financial/annual-budgets/${new Date().getFullYear() + 1}`} />}
            className="rounded-xl text-xs shadow-xs"
          >
            <FilePlus2 className="size-4" /> Create Annual Budget
          </PermissionButton>
        }
      />

      {/* KPI Overview Chips */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3.5 rounded-2xl border border-border/60 bg-card p-4 shadow-2xs">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Proposed Budget Total</p>
            <p className="text-base font-bold text-foreground">{formatCurrency(totalProposed)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-border/60 bg-card p-4 shadow-2xs">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Banknote className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Estimated Revenue</p>
            <p className="text-base font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-border/60 bg-card p-4 shadow-2xs">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <PiggyBank className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unallocated Balance</p>
            <p className="text-base font-bold text-foreground">{formatCurrency(totalUnallocated)}</p>
          </div>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        <div className="flex flex-col gap-3 border-b border-border/50 p-4 sm:flex-row sm:items-center justify-between">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            placeholder="Search by fiscal year, status, preparer, or approver…"
            className="w-full sm:max-w-md rounded-xl"
          />
          <CommandSelect
            className="w-full sm:w-52 rounded-xl"
            value={status || "__all__"}
            onValueChange={(value) => {
              setStatus(value === "__all__" ? "" : value as AnnualBudgetStatus)
              setPage(1)
            }}
            options={[
              { value: "__all__", label: "All Statuses" },
              { value: "Draft", label: "Draft" },
              { value: "For Approval", label: "For Approval" },
              { value: "Approved", label: "Approved" },
              { value: "Rejected", label: "Rejected" },
            ]}
            hideSearch
          />
        </div>

        <DataTable
          columns={columns}
          data={pagedBudgets}
          isLoading={query.isLoading}
          emptyTitle="No annual budgets found"
          emptyDescription="Create a budget draft for an upcoming fiscal year to get started."
          getRowId={(row) => row.id ?? String(row.fiscalYear)}
        />

        {!query.isLoading && !query.isError && (
          <div className="p-3 border-t border-border/40">
            <Pagination meta={meta} onPageChange={setPage} onPerPageChange={(value) => { setPerPage(value); setPage(1) }} />
          </div>
        )}
      </div>

      {/* Role Governance Banner */}
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Wallet className="size-4" />
          </span>
          <div>
            <p className="font-bold text-foreground">Annual Budget Role Governance</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Treasurer prepares &amp; submits · Approving Officer / President approves · Auditor holds read-only review rights
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10 shrink-0">
          <ShieldCheck className="size-3.5" /> Governance Active
        </span>
      </div>
    </div>
  )
}
