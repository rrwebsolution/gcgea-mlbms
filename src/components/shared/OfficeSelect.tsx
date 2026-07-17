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
}

export function OfficeSelect({ value, onValueChange, placeholder = "Select office", disabled, activeOnly = true, className }: OfficeSelectProps) {
  const { data } = useQuery({ queryKey: ["offices", "all"], queryFn: listAllOffices })
  const offices = (data ?? []).filter((o) => !activeOnly || o.status === "Active")

  return (
    <Select value={value} onValueChange={(v) => onValueChange(v ?? "")} disabled={disabled}>
      <SelectTrigger className={className ?? "w-full"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {offices.map((office) => (
          <SelectItem key={office.id} value={office.name}>
            {office.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
