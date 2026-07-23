import * as React from "react"
import { Check, ChevronsUpDown, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface CommandSelectOption {
  value: string
  label: string
  description?: string
  icon?: LucideIcon
  disabled?: boolean
}

interface CommandSelectProps {
  value?: string
  onValueChange: (value: string) => void
  options: CommandSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  /** Hides the search input — sensible for short option lists (≤ ~6 items) where typing to filter adds friction instead of removing it. */
  hideSearch?: boolean
  className?: string
  size?: "sm" | "default"
}

/**
 * Generic searchable command-palette dropdown — the system-wide replacement
 * for the plain <Select> for single-value pickers. Options are literal
 * strings (status/type/method enums, etc.), so `value`/`onValueChange` are
 * plain strings rather than a generic type param — callers narrow with `as`
 * at the call site the same way the old <Select onValueChange> callbacks did.
 */
export function CommandSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  disabled,
  hideSearch,
  className,
  size = "default",
}: CommandSelectProps) {
  const [open, setOpen] = React.useState(false)
  const selected = options.find((o) => o.value === value)

  function handleOpenChange(nextOpen: boolean) {
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    setOpen(nextOpen)
    requestAnimationFrame(() => window.scrollTo(scrollX, scrollY))
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            size={size === "sm" ? "sm" : "default"}
            className={cn("w-full justify-between font-normal", className)}
          />
        }
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            {selected.icon && <selected.icon className="size-4 shrink-0 text-muted-foreground" />}
            <span className="truncate">{selected.label}</span>
          </span>
        ) : (
          <span className="truncate text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--anchor-width] p-0" align="start">
        <Command>
          {!hideSearch && <CommandInput placeholder={searchPlaceholder} />}
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  disabled={option.disabled}
                  onSelect={() => {
                    if (option.disabled) return
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("size-4", option.value === value ? "opacity-100" : "opacity-0")} />
                  {option.icon && <option.icon className="size-4 shrink-0 text-muted-foreground" />}
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.description && <span className="block truncate text-xs text-muted-foreground">{option.description}</span>}
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
