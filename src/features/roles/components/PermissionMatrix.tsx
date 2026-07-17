import * as React from "react"
import { ChevronDown, Search } from "lucide-react"
import type { PermissionCode } from "@/types"
import { PERMISSION_GROUPS } from "@/constants/permissions"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface PermissionMatrixProps {
  selected: PermissionCode[]
  onChange: (codes: PermissionCode[]) => void
  /** Codes that are always on and cannot be unchecked (e.g. Super Administrator core access). */
  lockedCodes?: PermissionCode[]
  className?: string
}

export function PermissionMatrix({ selected, onChange, lockedCodes = [], className }: PermissionMatrixProps) {
  const selectedSet = React.useMemo(() => new Set(selected), [selected])
  const lockedSet = React.useMemo(() => new Set(lockedCodes), [lockedCodes])
  const [search, setSearch] = React.useState("")
  const [openGroups, setOpenGroups] = React.useState<Set<string>>(new Set(PERMISSION_GROUPS.map((g) => g.group)))

  const filteredGroups = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return PERMISSION_GROUPS
    return PERMISSION_GROUPS.map((group) => ({
      ...group,
      permissions: group.permissions.filter(
        (perm) => perm.label.toLowerCase().includes(term) || perm.code.toLowerCase().includes(term) || perm.description.toLowerCase().includes(term)
      ),
    })).filter((group) => group.permissions.length > 0)
  }, [search])

  function toggleGroup(group: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  function setPermission(code: PermissionCode, checked: boolean) {
    if (lockedSet.has(code)) return
    const next = new Set(selectedSet)
    if (checked) next.add(code)
    else next.delete(code)
    onChange(Array.from(next))
  }

  function setGroupAll(groupCodes: PermissionCode[], checked: boolean) {
    const next = new Set(selectedSet)
    for (const code of groupCodes) {
      if (lockedSet.has(code)) continue
      if (checked) next.add(code)
      else next.delete(code)
    }
    onChange(Array.from(next))
  }

  const totalCount = PERMISSION_GROUPS.reduce((sum, g) => sum + g.permissions.length, 0)

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search permissions…" className="pl-8" />
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setOpenGroups(new Set(PERMISSION_GROUPS.map((g) => g.group)))}>
            Expand All
          </button>
          <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setOpenGroups(new Set())}>
            Collapse All
          </button>
          <span className="text-xs font-medium text-muted-foreground">
            {selected.length} of {totalCount} permissions selected
          </span>
        </div>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border">
        {filteredGroups.map((group) => {
          const groupCodes = group.permissions.map((p) => p.code)
          const selectedInGroup = groupCodes.filter((c) => selectedSet.has(c))
          const allSelected = selectedInGroup.length === groupCodes.length
          const someSelected = selectedInGroup.length > 0 && !allSelected
          const isOpen = openGroups.has(group.group) || search.trim().length > 0

          return (
            <div key={group.group}>
              <div className="flex items-center justify-between gap-2 bg-muted/40 px-3 py-2">
                <button type="button" className="flex flex-1 items-center gap-2 text-left" onClick={() => toggleGroup(group.group)}>
                  <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  <span className="text-sm font-semibold text-foreground">{group.label}</span>
                  <span className="text-xs text-muted-foreground">
                    ({selectedInGroup.length}/{groupCodes.length})
                  </span>
                </button>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={(v) => setGroupAll(groupCodes, !!v)}
                    aria-label={`Select all ${group.label} permissions`}
                  />
                  Select All
                </label>
              </div>
              {isOpen && (
                <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.permissions.map((perm) => (
                    <label
                      key={perm.code}
                      className={cn(
                        "flex items-start gap-2 rounded-md px-1.5 py-1 text-sm",
                        lockedSet.has(perm.code) ? "opacity-70" : "hover:bg-muted/50"
                      )}
                      title={perm.description}
                    >
                      <Checkbox
                        checked={selectedSet.has(perm.code)}
                        disabled={lockedSet.has(perm.code)}
                        onCheckedChange={(v) => setPermission(perm.code, !!v)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-foreground">{perm.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{perm.code}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {filteredGroups.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">No permissions match your search.</p>}
      </div>
    </div>
  )
}
