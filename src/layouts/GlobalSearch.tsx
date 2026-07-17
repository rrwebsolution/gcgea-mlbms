import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
  Building2,
  Clock,
  KeyRound,
  Landmark,
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
import { getAllActiveMembers } from "@/services/members.service"
import { getAllLoans } from "@/services/loans.service"
import { getAllBenefits } from "@/services/benefits.service"
import { getAllContributions } from "@/services/contributions.service"
import { getAllUsersSync } from "@/services/users.service"
import { getAllRolesSync } from "@/services/roles.service"
import { MOCK_OFFICES } from "@/services/mock-data/offices"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { useHeaderDropdownSlot } from "@/contexts/HeaderDropdownContext"

const MAX_RECENT = 5

export function GlobalSearch() {
  const [open, setOpen] = useHeaderDropdownSlot("search")
  const [query, setQuery] = React.useState("")
  const [recent, setRecent] = React.useState<string[]>(() => readStorage<string[]>(STORAGE_KEYS.recentSearches, []))
  const navigate = useNavigate()

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

  const members = getAllActiveMembers().slice(0, 8)
  const loans = getAllLoans().slice(0, 8)
  const benefits = getAllBenefits().slice(0, 8)
  const contributions = getAllContributions().slice(0, 8)
  const users = getAllUsersSync().slice(0, 8)
  const roles = getAllRolesSync().slice(0, 8)
  const offices = MOCK_OFFICES.slice(0, 8)

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
            {term.length > 0 ? `No results found for "${query}".` : "Start typing to search across GCGEA MLBMS."}
          </CommandEmpty>

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

          <CommandGroup heading="Members">
            {members.map((member) => (
              <CommandItem key={member.id} value={`${member.fullName} ${member.memberNumber}`} onSelect={() => go(`/members/${member.id}`, query)}>
                <User />
                <span>
                  {member.fullName} <span className="text-muted-foreground">· {member.memberNumber}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Loans">
            {loans.map((loan) => (
              <CommandItem key={loan.id} value={`${loan.memberName} ${loan.applicationNumber}`} onSelect={() => go(`/loans/${loan.id}`, query)}>
                <Landmark />
                <span>
                  {loan.applicationNumber} <span className="text-muted-foreground">· {loan.memberName}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Benefits">
            {benefits.map((benefit) => (
              <CommandItem key={benefit.id} value={`${benefit.memberName} ${benefit.applicationNumber}`} onSelect={() => go(`/benefits/${benefit.id}`, query)}>
                <Wallet />
                <span>
                  {benefit.applicationNumber} <span className="text-muted-foreground">· {benefit.memberName}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Contributions">
            {contributions.map((c) => (
              <CommandItem key={c.id} value={`${c.memberName} ${c.referenceNumber}`} onSelect={() => go(`/contributions`, query)}>
                <Wallet />
                <span>
                  {c.referenceNumber} <span className="text-muted-foreground">· {c.memberName}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Users">
            {users.map((u) => (
              <CommandItem key={u.id} value={`${u.fullName} ${u.username}`} onSelect={() => go(`/admin/users/${u.id}/edit`, query)}>
                <UsersIcon />
                <span>
                  {u.fullName} <span className="text-muted-foreground">· {u.username}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Roles">
            {roles.map((r) => (
              <CommandItem key={r.id} value={`${r.name} ${r.code}`} onSelect={() => go(`/admin/roles/${r.id}`, query)}>
                <KeyRound />
                <span>
                  {r.name} <span className="text-muted-foreground">· {r.code}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Offices">
            {offices.map((o) => (
              <CommandItem key={o.id} value={`${o.name} ${o.code}`} onSelect={() => go(`/members?office=${encodeURIComponent(o.name)}`, query)}>
                <Building2 />
                <span>
                  {o.name} <span className="text-muted-foreground">· {o.code}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
