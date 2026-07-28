import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Building2,
  Clock,
  KeyRound,
  Landmark,
  Loader2,
  Search,
  User,
  Users as UsersIcon,
  Wallet,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { listAllActiveMembers } from "@/services/members.service"
import { listAllLoans } from "@/services/loans.service"
import { listAllBenefits } from "@/services/benefits.service"
import { listAllContributions } from "@/services/contributions.service"
import { listAllUsers } from "@/services/users.service"
import { listAllRoles } from "@/services/roles.service"
import { listAllOffices } from "@/services/offices.service"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { useHeaderDropdownSlot } from "@/contexts/HeaderDropdownContext"
import { NAV_ITEMS, type NavItem } from "@/constants/navigation"
import { REPORT_ROUTES } from "@/constants/reports"

const MAX_RECENT = 5
const MAX_RESULTS_PER_GROUP = 8

interface SystemSearchEntry {
  label: string
  category: string
  path: string
  keywords: string
}

function searchableText(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) return value.map(searchableText).join(" ")
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map(searchableText).join(" ")
  return ""
}

function matchesSearch(term: string, value: unknown): boolean {
  return searchableText(value).toLocaleLowerCase().includes(term)
}

function flattenNavigation(items: NavItem[], parent = ""): SystemSearchEntry[] {
  return items.flatMap((item) => {
    const category = parent || "System Page"
    const current = {
      label: item.label,
      category,
      path: item.path,
      keywords: `${parent} ${item.label}`,
    }
    return [current, ...flattenNavigation(item.children ?? [], item.label)]
  })
}

const REPORT_SEARCH_ENTRIES: SystemSearchEntry[] = Object.entries(REPORT_ROUTES).flatMap(([category, reports]) =>
  Object.entries(reports ?? {}).map(([label, path]) => ({ label, category, path, keywords: `${category} report ${label}` }))
)

const FEATURE_SEARCH_ENTRIES: SystemSearchEntry[] = [
  { label: "General Settings", category: "System Settings", path: "/admin/settings", keywords: "system name language timezone date currency fiscal year records per page alert translation" },
  { label: "Organization Information", category: "System Settings", path: "/admin/settings", keywords: "organization acronym address contact email website signatory treasurer president" },
  { label: "Numbering Formats", category: "System Settings", path: "/admin/settings", keywords: "member loan payment contribution benefit reference number prefix sequence" },
  { label: "Loan Settings", category: "System Settings", path: "/admin/settings", keywords: "interest processing fee penalty grace period eligibility override payment method active loans" },
  { label: "Re-loan Policy", category: "System Settings", path: "/admin/settings", keywords: "reloan paid installments overdue penalty payslip authorization promissory note board resolution" },
  { label: "Contribution Settings", category: "System Settings", path: "/admin/settings", keywords: "monthly dues cash pabaon contribution amount due day partial advance payroll duplicate" },
  { label: "Deduction Types", category: "System Settings", path: "/admin/settings?section=deductionTypes", keywords: "deduction type active inactive disabled payroll form input" },
  { label: "Benefit Settings", category: "System Settings", path: "/admin/settings", keywords: "retirement separation mortuary member nuclear family fees benefit computation" },
  { label: "Notification Settings", category: "System Settings", path: "/admin/settings", keywords: "notification email sms alerts bell loan benefit contribution profile user" },
  { label: "Security Settings", category: "System Settings", path: "/admin/settings", keywords: "password session timeout login attempts lockout two factor authentication audit transaction" },
  { label: "Backup Settings", category: "System Settings", path: "/admin/settings", keywords: "backup restore retention attachment frequency" },
  { label: "Report Template", category: "System Settings", path: "/admin/settings", keywords: "pdf excel logo paper orientation caption subtitle note font table border report design" },
  { label: "Appearance Settings", category: "System Settings", path: "/admin/settings", keywords: "theme light dark color background sidebar font century gothic compact logo progress" },
  { label: "Contribution Fund Allocation", category: "Contributions", path: "/reports/contributions/fund-allocation", keywords: "mortuary fund emergency fund operational fund retirement fund loan investment monthly dues allocation" },
  { label: "Monthly Dues Eligibility", category: "Loans", path: "/loans/new", keywords: "fully paid consecutive missing unpaid skipped month eligibility check cash pabaon" },
  { label: "Loan Computation", category: "Loans", path: "/loans/new", keywords: "principal interest processing fee service charge net proceeds total payable amortization payment months formula" },
  { label: "Member Payslip and Net Pay", category: "Members", path: "/members", keywords: "payslip document monthly net pay loanable limit member profile" },
  { label: "Contribution Allocation Funds", category: "Contributions", path: "/contributions", keywords: "mortuary emergency operational retirement loan investment cash pabaon monthly dues" },
]

const SYSTEM_SEARCH_ENTRIES = [...flattenNavigation(NAV_ITEMS), ...REPORT_SEARCH_ENTRIES, ...FEATURE_SEARCH_ENTRIES]

export function GlobalSearch() {
  const [open, setOpen] = useHeaderDropdownSlot("search")
  const [query, setQuery] = React.useState("")
  const [recent, setRecent] = React.useState<string[]>(() => readStorage<string[]>(STORAGE_KEYS.recentSearches, []))
  const navigate = useNavigate()
  const { data: searchData, isLoading, isError } = useQuery({
    queryKey: ["global-search-data"],
    queryFn: async () => {
      const [members, loans, benefits, contributions, users, roles, offices] = await Promise.all([
        listAllActiveMembers(),
        listAllLoans(),
        listAllBenefits(),
        listAllContributions(),
        listAllUsers(),
        listAllRoles(),
        listAllOffices(),
      ])
      return { members, loans, benefits, contributions, users, roles, offices }
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(!open)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, setOpen])

  React.useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  function rememberQuery(term: string) {
    if (!term.trim()) return
    setRecent((prev) => {
      const next = [term, ...prev.filter((q) => q.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT)
      writeStorage(STORAGE_KEYS.recentSearches, next)
      return next
    })
  }

  function clearRecent() {
    setRecent([])
    writeStorage(STORAGE_KEYS.recentSearches, [])
  }

  function go(path: string, term?: string) {
    if (term) rememberQuery(term)
    setOpen(false)
    navigate(path)
  }

  const term = query.trim().toLowerCase()
  const showRecent = term.length === 0 && recent.length > 0
  const hasSearchTerm = term.length > 0
  const members = hasSearchTerm
    ? (searchData?.members ?? []).filter((item) => matchesSearch(term, item)).slice(0, MAX_RESULTS_PER_GROUP)
    : []
  const loans = hasSearchTerm
    ? (searchData?.loans ?? []).filter((item) => matchesSearch(term, item)).slice(0, MAX_RESULTS_PER_GROUP)
    : []
  const benefits = hasSearchTerm
    ? (searchData?.benefits ?? []).filter((item) => matchesSearch(term, item)).slice(0, MAX_RESULTS_PER_GROUP)
    : []
  const contributions = hasSearchTerm
    ? (searchData?.contributions ?? []).filter((item) => matchesSearch(term, item)).slice(0, MAX_RESULTS_PER_GROUP)
    : []
  const users = hasSearchTerm
    ? (searchData?.users ?? []).filter((item) => matchesSearch(term, item)).slice(0, MAX_RESULTS_PER_GROUP)
    : []
  const roles = hasSearchTerm
    ? (searchData?.roles ?? []).filter((item) => matchesSearch(term, item)).slice(0, MAX_RESULTS_PER_GROUP)
    : []
  const offices = hasSearchTerm
    ? (searchData?.offices ?? []).filter((item) => matchesSearch(term, item)).slice(0, MAX_RESULTS_PER_GROUP)
    : []
  const systemResults = hasSearchTerm
    ? SYSTEM_SEARCH_ENTRIES.filter((item) => matchesSearch(term, item)).slice(0, 12)
    : []
  const resultCount = systemResults.length + members.length + loans.length + benefits.length + contributions.length + users.length + roles.length + offices.length
  const sampleSearches = React.useMemo(() => {
    if (!searchData) return []
    return [
      searchData.members[0] && { label: "Member", value: searchData.members[0].memberNumber || searchData.members[0].fullName },
      searchData.loans[0] && { label: "Loan", value: searchData.loans[0].applicationNumber },
      searchData.contributions[0] && { label: "Contribution", value: searchData.contributions[0].referenceNumber },
      searchData.offices[0] && { label: "Office", value: searchData.offices[0].code || searchData.offices[0].name },
    ].filter((sample): sample is { label: string; value: string } => Boolean(sample?.value))
  }, [searchData])

  return (
    <>
      <Button
        variant="outline"
        className="hidden w-[320px] justify-start gap-2 text-muted-foreground sm:flex lg:w-[460px]"
        style={{ maxWidth: 600, minWidth: 320 }}
        onClick={() => setOpen(true)}
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">Search members, loans, benefits…</span>
        <CommandShortcut className="ml-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground">Ctrl K</CommandShortcut>
      </Button>
      <Button variant="outline" size="icon" className="sm:hidden" onClick={() => setOpen(true)} aria-label="Search">
        <Search />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Global Search"
        description="Search members, loans, benefits, contributions, users, roles, and offices"
        className="sm:max-w-xl"
      >
        <CommandInput value={query} onValueChange={setQuery} placeholder="Search members, loans, benefits, contributions, users, roles, offices…" />
        <CommandList>
          <CommandEmpty>
            {isLoading
              ? "Loading system data…"
              : isError
                ? "Search data could not be loaded. Close and reopen search to try again."
                : term.length > 0
                  ? `No results found for "${query}".`
                  : "Start typing to search across GCGEA MLBMS."}
          </CommandEmpty>

          {isLoading && (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading searchable records…
            </div>
          )}

          {showRecent && (
            <>
              <CommandGroup heading="Recent Searches">
                {recent.map((q) => (
                  <CommandItem key={q} value={`recent ${q}`} onSelect={() => setQuery(q)}>
                    <Clock />
                    <span>{q}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandItem value="clear-recent-searches" onSelect={clearRecent} className="text-muted-foreground">
                <X /> Clear recent searches
              </CommandItem>
            </>
          )}

          {!isLoading && !hasSearchTerm && sampleSearches.length > 0 && (
            <>
              {showRecent && <CommandSeparator />}
              <CommandGroup heading="Sample Searches">
                {sampleSearches.map((sample) => (
                  <CommandItem
                    key={`${sample.label}-${sample.value}`}
                    value={`sample ${sample.label} ${sample.value}`}
                    onSelect={() => setQuery(sample.value)}
                  >
                    <Search />
                    <span className="flex-1">{sample.value}</span>
                    <span className="text-xs text-muted-foreground">{sample.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {!isLoading && hasSearchTerm && resultCount > 0 && <CommandGroup heading={`${resultCount} result${resultCount === 1 ? "" : "s"} found`} />}

          {systemResults.length > 0 && <CommandGroup heading="Pages, Features & Labels">
            {systemResults.map((item, index) => (
              <CommandItem key={`${item.path}-${item.label}-${index}`} value={`${item.label} ${item.category} ${item.keywords}`} onSelect={() => go(item.path, query)}>
                <Search />
                <span className="flex-1">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.category}</span>
              </CommandItem>
            ))}
          </CommandGroup>}

          {members.length > 0 && <CommandGroup heading="Members">
            {members.map((member) => (
              <CommandItem key={member.id} value={`${member.fullName} ${member.memberNumber}`} onSelect={() => go(`/members/${member.id}`, query)}>
                <User />
                <span>
                  {member.fullName} <span className="text-muted-foreground">· {member.memberNumber}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>}
          {loans.length > 0 && <CommandGroup heading="Loans">
            {loans.map((loan) => (
              <CommandItem key={loan.id} value={`${loan.memberName} ${loan.applicationNumber}`} onSelect={() => go(`/loans/${loan.id}`, query)}>
                <Landmark />
                <span>
                  {loan.applicationNumber} <span className="text-muted-foreground">· {loan.memberName}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>}
          {benefits.length > 0 && <CommandGroup heading="Benefits">
            {benefits.map((benefit) => (
              <CommandItem key={benefit.id} value={`${benefit.memberName} ${benefit.applicationNumber}`} onSelect={() => go(`/benefits/${benefit.id}`, query)}>
                <Wallet />
                <span>
                  {benefit.applicationNumber} <span className="text-muted-foreground">· {benefit.memberName}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>}
          {contributions.length > 0 && <CommandGroup heading="Contributions">
            {contributions.map((c) => (
              <CommandItem key={c.id} value={`${c.memberName} ${c.memberNumber} ${c.referenceNumber} ${c.contributionPeriod}`} onSelect={() => go(`/contributions/${c.id}`, query)}>
                <Wallet />
                <span>
                  {c.referenceNumber} <span className="text-muted-foreground">· {c.memberName}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>}
          {users.length > 0 && <CommandGroup heading="Users">
            {users.map((u) => (
              <CommandItem key={u.id} value={`${u.fullName} ${u.username}`} onSelect={() => go(`/admin/users/${u.id}/edit`, query)}>
                <UsersIcon />
                <span>
                  {u.fullName} <span className="text-muted-foreground">· {u.username}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>}
          {roles.length > 0 && <CommandGroup heading="Roles">
            {roles.map((r) => (
              <CommandItem key={r.id} value={`${r.name} ${r.code}`} onSelect={() => go(`/admin/roles/${r.id}`, query)}>
                <KeyRound />
                <span>
                  {r.name} <span className="text-muted-foreground">· {r.code}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>}
          {offices.length > 0 && <CommandGroup heading="Offices">
            {offices.map((o) => (
              <CommandItem key={o.id} value={`${o.name} ${o.code}`} onSelect={() => go("/admin/offices", query)}>
                <Building2 />
                <span>
                  {o.name} <span className="text-muted-foreground">· {o.code}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>}
        </CommandList>
      </CommandDialog>
    </>
  )
}
