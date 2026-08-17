import * as React from "react"
import { Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Ban,
  Eye,
  History,
  Pencil,
  Plus,
  Wallet,
  Banknote,
  Users,
  UserX,
  CalendarClock,
  RotateCcw,
  MoreHorizontal,
  Calendar,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { StatCard } from "@/components/shared/StatCard"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { VoidTransactionDialog } from "@/components/shared/VoidTransactionDialog"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getContributionSummary,
  listContributionPeriods,
  listContributions,
  voidContribution,
} from "@/services/contributions.service"
import { CONTRIBUTION_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"
import type { Contribution, ContributionType, PaymentMethod } from "@/types"

const PAYMENT_METHODS: PaymentMethod[] = ["Payroll Deduction", "Cash", "Bank Transfer", "Check"]
const CONTRIBUTION_TYPES: ContributionType[] = ["Monthly Dues", "Cash Pabaon"]

export default function ContributionsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [period, setPeriod] = React.useState("")
  const [contributionType, setContributionType] = React.useState("")
  const [office, setOffice] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState("")
  const [status, setStatus] = React.useState("")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")

  const [voidTarget, setVoidTarget] = React.useState<Contribution | null>(null)
  const [isVoiding, setIsVoiding] = React.useState(false)

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const filters = {
    page,
    perPage,
    search: debouncedSearch,
    period,
    contributionType: (contributionType as ContributionType) || undefined,
    office,
    paymentMethod,
    status,
    dateFrom,
    dateTo,
  }

  const {
    data: contributionPage,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["contributions", filters],
    queryFn: () => listContributions(filters),
  })

  const {
    data: summary = {
      totalContributions: 0,
      totalAmount: 0,
      paidMembers: 0,
      unpaidMembers: 0,
      contributionsThisMonth: 0,
    },
  } = useQuery({
    queryKey: ["contributions", "summary"],
    queryFn: getContributionSummary,
  })

  const { data: periods = [] } = useQuery({
    queryKey: ["contributions", "periods"],
    queryFn: listContributionPeriods,
  })

  const pagedContributions = contributionPage?.data ?? []
  const meta = contributionPage?.meta ?? {
    currentPage: page,
    perPage,
    totalRecords: 0,
    totalPages: 1,
  }

  const hasActiveFilters = Boolean(
    search || period || contributionType || office || paymentMethod || status || dateFrom || dateTo
  )

  function clearFilters() {
    setSearch("")
    setPeriod("")
    setContributionType("")
    setOffice("")
    setPaymentMethod("")
    setStatus("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

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

  const columns: ColumnDef<Contribution, unknown>[] = [
    {
      accessorKey: "referenceNumber",
      header: "Reference #",
      meta: { sticky: "left" },
      cell: ({ row }) => (
        <Link
          to={`/contributions/${row.original.id}`}
          className="inline-flex items-center rounded-lg border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-xs font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          {row.original.referenceNumber}
        </Link>
      ),
    },
    {
      accessorKey: "memberNumber",
      header: "Member ID",
      meta: { sticky: "left" },
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.memberNumber}</span>
      ),
    },
    {
      accessorKey: "memberName",
      header: "Member Name",
      meta: { sticky: "left" },
      cell: ({ row }) => (
        <span className="font-heading font-semibold text-foreground tracking-tight">
          {row.original.memberName}
        </span>
      ),
    },
    {
      accessorKey: "officeName",
      header: "Office",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.officeName}</span>
      ),
    },
    {
      accessorKey: "contributionType",
      header: "Type",
      cell: ({ row }) => (
        <span className="rounded-md bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground/90">
          {row.original.contributionType}
        </span>
      ),
    },
    {
      accessorKey: "contributionPeriod",
      header: "Period",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-foreground/80">{row.original.contributionPeriod}</span>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(row.original.amount)}
        </span>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Payment Method",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.paymentMethod}</span>
      ),
    },
    {
      accessorKey: "paymentDate",
      header: "Payment Date",
      cell: ({ row }) => formatDateShort(row.original.paymentDate),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          label={row.original.status}
          tone={CONTRIBUTION_STATUS_TONE[row.original.status]}
        />
      ),
    },
    {
      accessorKey: "encodedBy",
      header: "Encoded By",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.encodedBy || "—"}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => {
        const c = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-8 rounded-lg hover:bg-muted/80 active:scale-90"
                aria-label="Row actions"
              >
                <MoreHorizontal className="size-4 text-muted-foreground/80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-md p-1">
              <DropdownMenuItem
                className="rounded-lg text-xs font-medium"
                render={<Link to={`/contributions/${c.id}`} />}
              >
                <Eye className="size-3.5 mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg text-xs font-medium"
                render={<Link to={`/contributions/${c.id}`} />}
              >
                <History className="size-3.5 mr-2" /> View History
              </DropdownMenuItem>
              {c.status === "Posted" && (
                <DropdownMenuItem
                  className="rounded-lg text-xs font-medium"
                  render={<Link to={`/contributions/${c.id}/edit`} />}
                >
                  <Pencil className="size-3.5 mr-2" /> Edit Record
                </DropdownMenuItem>
              )}
              {c.status === "Posted" && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setVoidTarget(c)}
                  className="rounded-lg text-xs font-medium"
                >
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
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
        title="Contribution Records"
        description="Comprehensive ledger of GCGEA member monthly dues, cash pabaon, and special collections."
        actions={
          <PermissionButton
            permission="contributions.create"
            className="h-9 gap-2 rounded-xl px-4 text-xs font-semibold shadow-xs active:scale-95 transition-all"
            render={<Link to="/contributions/new" />}
          >
            <Plus className="size-4" /> Add Contribution
          </PermissionButton>
        }
      />

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total Contributions"
          value={String(summary.totalContributions)}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label="Total Amount Collected"
          value={formatCurrency(summary.totalAmount)}
          icon={Banknote}
          tone="success"
        />
        <StatCard
          label="Paid Members"
          value={String(summary.paidMembers)}
          icon={Users}
          tone="info"
        />
        <StatCard
          label="Unpaid Members"
          value={String(summary.unpaidMembers)}
          icon={UserX}
          tone="warning"
        />
        <StatCard
          label="Contributions This Month"
          value={String(summary.contributionsThisMonth)}
          icon={CalendarClock}
          tone="gold"
        />
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
        <DataTable
          columns={columns}
          data={pagedContributions}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="No contributions found"
          emptyDescription="Try adjusting your search terms or filter selections."
          enableColumnVisibility={false}
          toolbar={
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              <SearchInput
                value={search}
                onChange={(v) => {
                  setSearch(v)
                  setPage(1)
                }}
                placeholder="Search member, reference #…"
                className="w-full sm:max-w-xs"
              />

              <CommandSelect
                size="sm"
                className="w-36 h-9 rounded-xl border-border/70 bg-background/80 text-xs font-medium shadow-2xs hover:bg-muted"
                value={period || "__all__"}
                onValueChange={(v) => {
                  setPeriod(v === "__all__" ? "" : v)
                  setPage(1)
                }}
                options={[
                  { value: "__all__", label: "All Periods" },
                  ...periods.map((p) => ({ value: p, label: p })),
                ]}
                placeholder="All Periods"
              />

              <CommandSelect
                size="sm"
                className="w-36 h-9 rounded-xl border-border/70 bg-background/80 text-xs font-medium shadow-2xs hover:bg-muted"
                value={contributionType || "__all__"}
                onValueChange={(v) => {
                  setContributionType(v === "__all__" ? "" : v)
                  setPage(1)
                }}
                options={[
                  { value: "__all__", label: "All Types" },
                  ...CONTRIBUTION_TYPES.map((t) => ({ value: t, label: t })),
                ]}
                placeholder="All Types"
                hideSearch
              />

              <OfficeSelect
                value={office}
                onValueChange={(v) => {
                  setOffice(v)
                  setPage(1)
                }}
                placeholder="All Offices"
                activeOnly={false}
                className="w-40 h-9 rounded-xl border-border/70 bg-background/80 text-xs font-medium shadow-2xs hover:bg-muted"
              />

              <CommandSelect
                size="sm"
                className="w-40 h-9 rounded-xl border-border/70 bg-background/80 text-xs font-medium shadow-2xs hover:bg-muted"
                value={paymentMethod || "__all__"}
                onValueChange={(v) => {
                  setPaymentMethod(v === "__all__" ? "" : v)
                  setPage(1)
                }}
                options={[
                  { value: "__all__", label: "All Payment Methods" },
                  ...PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
                ]}
                placeholder="Payment Method"
                hideSearch
              />

              <CommandSelect
                size="sm"
                className="w-32 h-9 rounded-xl border-border/70 bg-background/80 text-xs font-medium shadow-2xs hover:bg-muted"
                value={status || "__all__"}
                onValueChange={(v) => {
                  setStatus(v === "__all__" ? "" : v)
                  setPage(1)
                }}
                options={[
                  { value: "__all__", label: "All Statuses" },
                  { value: "Posted", label: "Posted" },
                  { value: "Voided", label: "Voided" },
                ]}
                placeholder="All Statuses"
                hideSearch
              />

              {/* Integrated Date-Range Selector */}
              <div className="flex h-9 items-center gap-1.5 rounded-xl border border-border/70 bg-background/80 px-3 shadow-2xs backdrop-blur-xs">
                <Calendar className="size-3.5 text-muted-foreground/70" />
                <Input
                  type="date"
                  className="h-7 w-28 border-0 bg-transparent p-0 font-mono text-xs focus-visible:ring-0 shadow-none"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setPage(1)
                  }}
                  aria-label="Date from"
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                  to
                </span>
                <Input
                  type="date"
                  className="h-7 w-28 border-0 bg-transparent p-0 font-mono text-xs focus-visible:ring-0 shadow-none"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    setPage(1)
                  }}
                  aria-label="Date to"
                />
              </div>

              {/* Reset Filter Button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1.5 rounded-xl px-3 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all"
                  onClick={clearFilters}
                >
                  <RotateCcw className="size-3.5" /> Reset Filters
                </Button>
              )}
            </div>
          }
        />

        {/* Integrated Pagination Footer */}
        {!isLoading && !isError && (
          <div className="border-t border-border/40 bg-muted/10 p-3">
            <Pagination
              meta={meta}
              onPageChange={setPage}
              onPerPageChange={(n) => {
                setPerPage(n)
                setPage(1)
              }}
            />
          </div>
        )}
      </div>

      {/* Transaction Cancellation Confirmation Dialog */}
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