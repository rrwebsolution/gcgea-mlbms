import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface CurrencyInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number | undefined
  onChange: (value: number | undefined) => void
}

function formatAmount(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return ""
  return new Intl.NumberFormat("en-PH", {
    useGrouping: true,
    maximumFractionDigits: 2,
  }).format(value)
}

function normalizeAmountInput(input: string): { display: string; value: number | undefined } {
  const cleaned = input.replace(/[^\d.]/g, "")
  if (!cleaned) return { display: "", value: undefined }

  const [wholePart = "", ...decimalParts] = cleaned.split(".")
  const hasDecimalPoint = cleaned.includes(".")
  const fraction = decimalParts.join("").slice(0, 2)
  const normalizedWhole = wholePart.replace(/^0+(?=\d)/, "") || "0"
  const groupedWhole = normalizedWhole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  const display = hasDecimalPoint ? `${groupedWhole}.${fraction}` : groupedWhole
  const parsed = Number(`${normalizedWhole}${hasDecimalPoint ? `.${fraction}` : ""}`)

  return { display, value: Number.isFinite(parsed) ? parsed : undefined }
}

export function CurrencyInput({ value, onChange, className, onFocus, onBlur, ...props }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = React.useState(() => formatAmount(value))
  const focusedRef = React.useRef(false)

  React.useEffect(() => {
    if (!focusedRef.current) setDisplayValue(formatAmount(value))
  }, [value])

  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
      <Input
        placeholder="0.00"
        {...props}
        type="text"
        inputMode="decimal"
        className="pl-6 tabular-nums"
        value={displayValue}
        onChange={(event) => {
          const normalized = normalizeAmountInput(event.target.value)
          setDisplayValue(normalized.display)
          onChange(normalized.value)
        }}
        onFocus={(event) => {
          focusedRef.current = true
          onFocus?.(event)
        }}
        onBlur={(event) => {
          focusedRef.current = false
          setDisplayValue(formatAmount(value))
          onBlur?.(event)
        }}
      />
    </div>
  )
}
