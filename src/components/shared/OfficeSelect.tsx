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

  return (
    <CommandSelect
      className={className ?? "w-full"}
      value={value}
      onValueChange={(v) => onValueChange(v ?? "")}
      disabled={disabled}
      placeholder={placeholder}
      searchPlaceholder="Search offices…"
      options={offices.map((office) => ({
        value: valueField === "id" ? office.id : office.name,
        label: office.name,
      }))}
    />
  )
}
