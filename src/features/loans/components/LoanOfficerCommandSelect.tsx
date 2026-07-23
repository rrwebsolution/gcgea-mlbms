import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { listAllRoles } from "@/services/roles.service"
import { listAllUsers } from "@/services/users.service"
import { cn } from "@/lib/utils"

interface LoanOfficerCommandSelectProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

export function LoanOfficerCommandSelect({ value, onValueChange, disabled }: LoanOfficerCommandSelectProps) {
  const [open, setOpen] = React.useState(false)
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users", "all"],
    queryFn: listAllUsers,
  })
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles", "all"],
    queryFn: listAllRoles,
  })

  const loanOfficerRoleIds = new Set(
    roles
      .filter((role) => ["loan officer", "assigned loan officer"].includes(role.name.trim().toLowerCase()))
      .map((role) => role.id)
  )
  const officers = users.filter(
    (candidate) => candidate.status === "Active"
      && (loanOfficerRoleIds.has(candidate.roleId) || candidate.additionalRoleIds.some((roleId) => loanOfficerRoleIds.has(roleId)))
  )
  const selected = officers.find((officer) => officer.fullName === value)
  const isLoading = isLoadingUsers || isLoadingRoles

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={<Button type="button" variant="outline" className="w-full justify-between font-normal" />}
      >
        {value ? (
          <span className="flex min-w-0 items-center gap-2">
            <UserCheck className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{selected?.fullName ?? value}</span>
          </span>
        ) : (
          <span className="truncate text-muted-foreground">Select a loan officer</span>
        )}
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--anchor-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search loan officers…" />
          <CommandList>
            <CommandEmpty>{isLoading ? "Loading loan officers…" : "No active loan officer found."}</CommandEmpty>
            <CommandGroup>
              {officers.map((officer) => (
                <CommandItem
                  key={officer.id}
                  value={`${officer.fullName} ${officer.username} ${officer.email}`}
                  onSelect={() => {
                    onValueChange(officer.fullName)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("size-4", officer.fullName === value ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0">
                    <span className="block truncate">{officer.fullName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{officer.username}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
