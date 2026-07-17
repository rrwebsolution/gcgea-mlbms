import * as React from "react"
import { Check, ChevronsUpDown, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Role } from "@/types"

interface RoleMultiSelectProps {
  roles: Role[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  excludeId?: string
  placeholder?: string
}

export function RoleMultiSelect({ roles, selectedIds, onChange, excludeId, placeholder = "Select additional roles…" }: RoleMultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const options = roles.filter((r) => r.id !== excludeId)
  const selectedRoles = options.filter((r) => selectedIds.includes(r.id))

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id])
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="outline" className="w-full justify-between font-normal" />}>
          <span className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="size-4" />
            {placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[--anchor-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search roles…" />
            <CommandList>
              <CommandEmpty>No roles found.</CommandEmpty>
              <CommandGroup>
                {options.map((role) => (
                  <CommandItem key={role.id} value={role.name} onSelect={() => toggle(role.id)}>
                    <Check className={cn("size-4", selectedIds.includes(role.id) ? "opacity-100" : "opacity-0")} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{role.name}</span>
                      <span className="text-xs text-muted-foreground">{role.permissions.length} permissions</span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedRoles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedRoles.map((role) => (
            <Badge key={role.id} variant="secondary" className="gap-1">
              {role.name}
              <button type="button" onClick={() => toggle(role.id)} className="ml-0.5 opacity-70 hover:opacity-100" aria-label={`Remove ${role.name}`}>
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
