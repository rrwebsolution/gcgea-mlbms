import * as React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Banknote, FileClock, HeartHandshake, PencilLine, UserRound } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatCard } from "@/components/shared/StatCard"
import { DraftStatusBadge } from "@/components/shared/DraftStatusBadge"
import { DraftCompletionBar } from "@/components/shared/DraftCompletionBar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { listMembers } from "@/services/members.service"
import { listLoans } from "@/services/loans.service"
import { listBenefits } from "@/services/benefits.service"
import { formatDateTime } from "@/utils/format"

type DraftModule = "Member" | "Loan" | "Benefit"

interface DraftRow {
  key: string
  module: DraftModule
  reference: string
  recordTitle: string
  createdBy: string
  completion?: number
  lastSavedAt: string
  editPath: string
}

const MODULE_ICON: Record<DraftModule, typeof UserRound> = {
  Member: UserRound,
  Loan: Banknote,
  Benefit: HeartHandshake,
}

function ageInDays(dateString: string): number {
  const diff = Date.now() - new Date(dateString).getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function formatAge(days: number): string {
  if (days === 0) return "Today"
  if (days === 1) return "1 day ago"
  return `${days} days ago`
}

const STALE_AFTER_DAYS = 30

export default function DraftCenterPage() {
  const [search, setSearch] = React.useState("")
  const [moduleFilter, setModuleFilter] = React.useState<DraftModule | "all">("all")
  const [staleOnly, setStaleOnly] = React.useState(false)
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)

  const { data: memberDrafts, isLoading: isLoadingMembers } = useQuery({
    queryKey: ["members", { draftsOnly: true, perPage: 100 }],
    queryFn: () => listMembers({ draftsOnly: true, perPage: 100 }),
  })
  const { data: loanDrafts, isLoading: isLoadingLoans } = useQuery({
    queryKey: ["loans", { status: "Draft", perPage: 100 }],
    queryFn: () => listLoans({ status: "Draft", perPage: 100 }),
  })
  const { data: benefitDrafts, isLoading: isLoadingBenefits } = useQuery({
    queryKey: ["benefits", { status: "Draft", perPage: 100 }],
    queryFn: () => listBenefits({ status: "Draft", perPage: 100 }),
  })

  const isLoading = isLoadingMembers || isLoadingLoans || isLoadingBenefits

  const rows: DraftRow[] = React.useMemo(() => {
    const memberRows: DraftRow[] = (memberDrafts?.data ?? []).map((m) => ({
      key: `member-${m.id}`,
      module: "Member",
      reference: m.draftReferenceNo ?? "Untitled Member Draft",
      recordTitle: m.fullName?.trim() || "Untitled Member",
      createdBy: m.createdBy,
      completion: m.draftCompletionPercentage,
      lastSavedAt: m.updatedAt,
      editPath: `/members/${m.id}/edit`,
    }))
    const loanRows: DraftRow[] = (loanDrafts?.data ?? []).map((l) => ({
      key: `loan-${l.id}`,
      module: "Loan",
      reference: l.applicationNumber || "Untitled Loan Draft",
      recordTitle: l.memberName?.trim() || "Untitled Loan Application",
      createdBy: l.assignedOfficer,
      lastSavedAt: l.updatedAt,
      editPath: `/loans/${l.id}/edit`,
    }))
    const benefitRows: DraftRow[] = (benefitDrafts?.data ?? []).map((b) => ({
      key: `benefit-${b.id}`,
      module: "Benefit",
      reference: b.applicationNumber || "Untitled Benefit Draft",
      recordTitle: b.memberName?.trim() || "Untitled Benefit Application",
      createdBy: b.createdBy,
      lastSavedAt: b.updatedAt,
      editPath: `/benefits/${b.id}/edit`,
    }))
    return [...memberRows, ...loanRows, ...benefitRows].sort((a, b) => b.lastSavedAt.localeCompare(a.lastSavedAt))
  }, [memberDrafts, loanDrafts, benefitDrafts])

  const filteredRows = rows.filter((row) => {
    if (moduleFilter !== "all" && row.module !== moduleFilter) return false
    if (staleOnly && ageInDays(row.lastSavedAt) < STALE_AFTER_DAYS) return false
    if (search) {
      const term = search.toLowerCase()
      if (!row.reference.toLowerCase().includes(term) && !row.recordTitle.toLowerCase().includes(term) && !row.createdBy.toLowerCase().includes(term)) {
        return false
      }
    }
    return true
  })

  const totalRecords = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / perPage))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filteredRows.slice((currentPage - 1) * perPage, currentPage * perPage)

  const staleCount = rows.filter((row) => ageInDays(row.lastSavedAt) >= STALE_AFTER_DAYS).length
  const memberCount = rows.filter((r) => r.module === "Member").length
  const loanCount = rows.filter((r) => r.module === "Loan").length
  const benefitCount = rows.filter((r) => r.module === "Benefit").length

  const columns: ColumnDef<DraftRow, unknown>[] = [
    {
      accessorKey: "reference",
      header: "Draft Reference",
      cell: ({ row }) => (
        <Link to={row.original.editPath} className="font-semibold text-primary hover:text-primary/80 hover:underline tracking-tight transition-colors">
          {row.original.reference}
        </Link>
      ),
    },
    {
      accessorKey: "module",
      header: "Module",
      cell: ({ row }) => {
        const Icon = MODULE_ICON[row.original.module]
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md bg-muted/65 text-foreground/90 border border-border/10">
            <Icon className="size-3 text-muted-foreground/80" />
            {row.original.module}
          </span>
        )
      },
    },
    { accessorKey: "recordTitle", header: "Record Title" },
    { accessorKey: "createdBy", header: "Created By" },
    {
      id: "completion",
      header: "Completion",
      enableSorting: false,
      cell: ({ row }) => (row.original.completion != null ? <DraftCompletionBar percentage={row.original.completion} showLabel={false} /> : "—"),
    },
    { accessorKey: "lastSavedAt", header: "Last Saved", cell: ({ row }) => formatDateTime(row.original.lastSavedAt) },
    { id: "age", header: "Age", enableSorting: false, cell: ({ row }) => formatAge(ageInDays(row.original.lastSavedAt)) },
    { id: "status", header: "Status", enableSorting: false, cell: () => <DraftStatusBadge status="Draft" /> },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => (
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1.5 text-xs hover:bg-accent/80 active:scale-97 transition-all duration-150"
          render={<Link to={row.original.editPath} />}
        >
          <PencilLine className="size-3.5 text-muted-foreground" /> 
          Continue Editing
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Draft Center" description="Every in-progress registration and application saved as a draft, in one place." />

      {/* KPI Stats Panel */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Drafts" value={String(rows.length)} icon={FileClock} isLoading={isLoading} />
        <StatCard label="Member Drafts" value={String(memberCount)} icon={UserRound} tone="info" isLoading={isLoading} />
        <StatCard label="Loan Drafts" value={String(loanCount)} icon={Banknote} tone="primary" isLoading={isLoading} />
        <StatCard label="Benefit Drafts" value={String(benefitCount)} icon={HeartHandshake} tone="success" isLoading={isLoading} />
        <StatCard label="Stale Drafts (30+ days)" value={String(staleCount)} icon={FileClock} tone="warning" isLoading={isLoading} />
      </div>

      {/* Structured Content Panel */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        
        {/* Panel Action Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-muted/5 p-4 transition-all duration-200">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <SearchInput 
              value={search} 
              onChange={(v) => { setSearch(v); setPage(1) }} 
              placeholder="Search by reference, record, or creator…" 
              className="max-w-sm" 
            />
            <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter((v || "all") as DraftModule | "all"); setPage(1) }}>
              <SelectTrigger className="w-40 text-xs bg-background h-9 border-border/85 hover:bg-accent/40 active:scale-99 transition-all">
                <SelectValue placeholder="All Modules">{(v: string) => (v === "all" ? "All Modules" : v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Modules</SelectItem>
                <SelectItem value="Member" className="text-xs">Member</SelectItem>
                <SelectItem value="Loan" className="text-xs">Loan</SelectItem>
                <SelectItem value="Benefit" className="text-xs">Benefit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant={staleOnly ? "secondary" : "outline"}
            size="sm"
            className="h-9 gap-1.5 text-xs hover:bg-accent/80 active:scale-97 transition-all"
            onClick={() => { setStaleOnly((v) => !v); setPage(1) }}
          >
            <FileClock className="size-3.5" /> Stale Drafts Only
          </Button>
        </div>

        {/* Unified Table view */}
        <DataTable
          columns={columns}
          data={pageRows}
          isLoading={isLoading}
          emptyTitle="No drafts found"
          emptyDescription="Drafts you save across Member Registration, Loan Applications, and Benefit Applications will appear here."
        />
        
        {/* Pagination element */}
        <Pagination
          meta={{ currentPage, perPage, totalRecords, totalPages }}
          onPageChange={setPage}
          onPerPageChange={(n) => { setPerPage(n); setPage(1) }}
        />
      </div>
    </div>
  )
}