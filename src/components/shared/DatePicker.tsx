import * as React from "react"
import { format, parseISO } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value?: string
  onChange: (value: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  fromDate?: Date
  toDate?: Date
  className?: string
}

export function DatePicker({ value, onChange, placeholder = "Select date", disabled, fromDate, toDate, className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = value ? parseISO(value) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            variant="outline"
            className={cn("w-full justify-start font-normal", !value && "text-muted-foreground", className)}
          />
        }
      >
        <CalendarIcon className="size-4" />
        {selected ? format(selected, "MMMM d, yyyy") : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          startMonth={new Date(1940, 0)}
          endMonth={new Date(2035, 11)}
          captionLayout="dropdown"
          disabled={
            fromDate && toDate
              ? { before: fromDate, after: toDate }
              : fromDate
                ? { before: fromDate }
                : toDate
                  ? { after: toDate }
                  : undefined
          }
          onSelect={(date) => {
            onChange(date ? format(date, "yyyy-MM-dd") : undefined)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
