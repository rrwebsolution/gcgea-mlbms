import * as React from "react"
import { Banknote, Check, ChevronsUpDown, Gift, PiggyBank } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { ContributionType } from "@/types"

const CONTRIBUTION_TYPES: { value: ContributionType; description: string; icon: typeof Banknote }[] = [
  { value: "Monthly Dues", description: "Regular monthly membership dues", icon: Banknote },
  { value: "Cash Pabaon", description: "Cash Pabaon contribution", icon: Gift },
  { value: "Savings", description: "Member savings contribution", icon: PiggyBank },
]

interface ContributionTypeCommandSelectProps {
  value: ContributionType
  onValueChange: (value: ContributionType) => void
  disabled?: boolean
  className?: string
}

export function ContributionTypeCommandSelect({ value, onValueChange, disabled, className }: ContributionTypeCommandSelectProps) {
  const [open, setOpen] = React.useState(false)
  const selected = CONTRIBUTION_TYPES.find((t) => t.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={<Button type="button" variant="outline" className={cn("w-full justify-between font-normal", className)} />}
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <selected.icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{selected.value}</span>
          </span>
        ) : (
          <span className="truncate text-muted-foreground">Select contribution type</span>
        )}
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--anchor-width] p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>No contribution type found.</CommandEmpty>
            <CommandGroup>
              {CONTRIBUTION_TYPES.map((type) => (
                <CommandItem
                  key={type.value}
                  value={type.value}
                  onSelect={() => {
                    onValueChange(type.value)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("size-4", type.value === value ? "opacity-100" : "opacity-0")} />
                  <type.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate">{type.value}</span>
                    <span className="block truncate text-xs text-muted-foreground">{type.description}</span>
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
