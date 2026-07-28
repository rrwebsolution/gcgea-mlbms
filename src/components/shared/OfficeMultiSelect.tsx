import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Building2, Check, ChevronsUpDown, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { listAllOffices } from "@/services/offices.service"
import { cn } from "@/lib/utils"

interface OfficeMultiSelectProps {
  values: string[]
  onValuesChange: (values: string[]) => void
  placeholder?: string
  error?: boolean
}

export function OfficeMultiSelect({ values, onValuesChange, placeholder = "Select offices", error = false }: OfficeMultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const { data: allOffices = [] } = useQuery({ queryKey: ["offices", "all"], queryFn: listAllOffices })
  const offices = allOffices.filter((office) => office.status === "Active")
  const officeNames = offices.map((office) => office.name)
  const allSelected = officeNames.length > 0 && officeNames.every((name) => values.includes(name))

  function toggle(name: string) {
    onValuesChange(values.includes(name) ? values.filter((value) => value !== name) : [...values, name])
  }

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              aria-invalid={error}
              className={cn("h-auto min-h-10 w-full items-start justify-between py-2 font-normal", error && "border-destructive ring-1 ring-destructive/20")}
            />
          }
        >
          <span className={cn("flex min-w-0 flex-1 items-start gap-2", values.length === 0 && "text-muted-foreground")}>
            <Building2 className="mt-0.5 size-4 shrink-0" />
            {values.length === 0 ? (
              <span className="truncate">{placeholder}</span>
            ) : (
              <span className="flex max-h-20 min-w-0 flex-1 flex-wrap gap-1.5 overflow-y-auto pr-1">
                {values.map((name) => (
                  <Badge key={name} variant="secondary" className="max-w-full gap-1">
                    <span className="truncate">{name}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Remove ${name}`}
                      className="shrink-0 rounded-sm opacity-60 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      onPointerDown={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                      }}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        toggle(name)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          event.stopPropagation()
                          toggle(name)
                        }
                      }}
                    >
                      <X className="size-3" />
                    </span>
                  </Badge>
                ))}
              </span>
            )}
          </span>
          <ChevronsUpDown className="mt-0.5 size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[--anchor-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search offices…" />
            <CommandList>
              <CommandEmpty>No active offices found.</CommandEmpty>
              <CommandGroup>
                {offices.length > 0 && (
                  <CommandItem
                    value={allSelected ? "Clear all offices" : "Select all offices"}
                    onSelect={() => onValuesChange(allSelected ? [] : officeNames)}
                    className="font-semibold"
                  >
                    <Check className={cn("size-4", allSelected ? "opacity-100" : "opacity-0")} />
                    {allSelected ? "Clear All Offices" : "Select All Offices"}
                  </CommandItem>
                )}
                {offices.map((office) => (
                  <CommandItem key={office.id} value={office.name} onSelect={() => toggle(office.name)}>
                    <Check className={cn("size-4", values.includes(office.name) ? "opacity-100" : "opacity-0")} />
                    {office.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
