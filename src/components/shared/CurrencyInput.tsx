import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface CurrencyInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number | undefined
  onChange: (value: number | undefined) => void
}

export function CurrencyInput({ value, onChange, className, ...props }: CurrencyInputProps) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
      <Input
        placeholder="0.00"
        {...props}
        type="number"
        inputMode="decimal"
        step="0.01"
        min={0}
        className="pl-6"
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value
          onChange(raw === "" ? undefined : Number(raw))
        }}
      />
    </div>
  )
}
