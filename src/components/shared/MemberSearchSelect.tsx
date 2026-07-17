import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { listMembers } from "@/services/members.service"
import { cn } from "@/lib/utils"

interface MemberSearchSelectProps {
  value?: string
  onSelect: (memberId: string) => void
  disabled?: boolean
  placeholder?: string
}

export function MemberSearchSelect({ value, onSelect, disabled, placeholder = "Search by name or member number…" }: MemberSearchSelectProps) {
  const [open, setOpen] = React.useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["members", "search-select"],
    queryFn: () => listMembers({ perPage: 200, membershipStatus: "Active" }),
  })

  const members = data?.data ?? []
  const selected = members.find((m) => m.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            variant="outline"
            className="w-full justify-between font-normal"
          />
        }
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <User className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {selected.fullName} <span className="text-muted-foreground">· {selected.memberNumber}</span>
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--anchor-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Type a name or member number…" />
          <CommandList>
            <CommandEmpty>{isLoading ? "Loading members…" : "No member found."}</CommandEmpty>
            <CommandGroup>
              {members.map((member) => (
                <CommandItem
                  key={member.id}
                  value={`${member.fullName} ${member.memberNumber}`}
                  onSelect={() => {
                    onSelect(member.id)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("size-4", member.id === value ? "opacity-100" : "opacity-0")} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{member.fullName}</span>
                    <span className="text-xs text-muted-foreground">
                      {member.memberNumber} · {member.officeName}
                    </span>
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
