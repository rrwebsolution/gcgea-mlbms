import { useQuery } from "@tanstack/react-query"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    <Select value={value} onValueChange={(v) => onValueChange(v ?? "")} disabled={disabled}>
      <SelectTrigger className={className ?? "w-full"}>
        <SelectValue placeholder={placeholder}>
          {(selectedValue: string) =>
            offices.find((office) => (valueField === "id" ? office.id : office.name) === selectedValue)?.name ?? placeholder
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {offices.map((office) => (
          <SelectItem key={office.id} value={valueField === "id" ? office.id : office.name}>
            {office.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
