import { useQuery } from "@tanstack/react-query"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { listAllOffices } from "@/services/offices.service"

interface OfficeSelectProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  activeOnly?: boolean
  className?: string
  /** Which office field to use as the option value. Filters match by name; foreign-key fields (e.g. officeId) need the id. Defaults to "name". */
  valueField?: "id" | "name"
}

export function OfficeSelect({ value, onValueChange, placeholder = "Select office", disabled, activeOnly = true, className, valueField = "name" }: OfficeSelectProps) {
  const { data } = useQuery({ queryKey: ["offices", "all"], queryFn: listAllOffices })
  const offices = (data ?? []).filter((o) => !activeOnly || o.status === "Active")
  const officeOptions = offices.map((office) => ({
    value: valueField === "id" ? office.id : office.name,
    label: office.name,
  }))
  // Callers use the "All Offices" placeholder specifically for filter contexts
  // (as opposed to a required single-office field like a member's own office),
  // so only those get a selectable "clear the filter" option back to "".
  const isFilterContext = placeholder.toLowerCase().startsWith("all offices")
  const options = isFilterContext ? [{ value: "", label: placeholder }, ...officeOptions] : officeOptions

  return (
    <CommandSelect
      className={className ?? "w-full"}
      value={value}
      onValueChange={(v) => onValueChange(v ?? "")}
      disabled={disabled}
      placeholder={placeholder}
      searchPlaceholder="Search offices…"
      options={options}
    />
  )
}
