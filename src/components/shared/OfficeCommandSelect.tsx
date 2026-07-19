import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Building2, Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { listAllOffices } from "@/services/offices.service"
import { cn } from "@/lib/utils"

interface OfficeCommandSelectProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  activeOnly?: boolean
  className?: string
  /** Which office field to use as the option value. Filters match by name; foreign-key fields (e.g. officeId) need the id. Defaults to "name". */
  valueField?: "id" | "name"
}

export function OfficeCommandSelect({
  value,
  onValueChange,
  placeholder = "Search office…",
  disabled,
  activeOnly = true,
  className,
  valueField = "name",
}: OfficeCommandSelectProps) {
  const [open, setOpen] = React.useState(false)
  const { data, isLoading } = useQuery({ queryKey: ["offices", "all"], queryFn: listAllOffices })
  const offices = (data ?? []).filter((o) => !activeOnly || o.status === "Active")

  const selected = offices.find((office) => (valueField === "id" ? office.id : office.name) === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={<Button type="button" variant="outline" className={cn("w-full justify-between font-normal", className)} />}
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <Building2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--anchor-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Type to search offices…" />
          <CommandList>
            <CommandEmpty>{isLoading ? "Loading offices…" : "No office found."}</CommandEmpty>
            <CommandGroup>
              {offices.map((office) => {
                const optionValue = valueField === "id" ? office.id : office.name
                return (
                  <CommandItem
                    key={office.id}
                    value={office.name}
                    onSelect={() => {
                      onValueChange(optionValue)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("size-4", optionValue === value ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{office.name}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
