import * as React from "react"
import { Check, ChevronsUpDown, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { PH_LOCATIONS, formatLocation, type PhLocation } from "@/data/ph-locations"
import { cn } from "@/lib/utils"

interface AddressCommandSelectProps {
  value?: string
  onSelect: (formatted: string) => void
  disabled?: boolean
  placeholder?: string
}

export function AddressCommandSelect({ value, onSelect, disabled, placeholder = "Search barangay, city, municipality, or province…" }: AddressCommandSelectProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={<Button type="button" variant="outline" className="w-full justify-between font-normal" />}
      >
        {value ? (
          <span className="flex min-w-0 items-center gap-2">
            <MapPin className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{value}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--anchor-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Type to search, e.g. “Tag”…" />
          <CommandList>
            <CommandEmpty>No matching location found.</CommandEmpty>
            <CommandGroup>
              {PH_LOCATIONS.map((location: PhLocation) => {
                const formatted = formatLocation(location)
                return (
                  <CommandItem
                    key={formatted}
                    value={`${location.cityMunicipality} ${location.province} ${location.region}`}
                    onSelect={() => {
                      onSelect(formatted)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("size-4", formatted === value ? "opacity-100" : "opacity-0")} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{location.cityMunicipality}</span>
                      <span className="text-xs text-muted-foreground">
                        {location.province} · {location.region}
                      </span>
                    </span>
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
