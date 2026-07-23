import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { StatusBadge } from "@/components/shared/StatusBadge"
import type { EligibilityCheckItem } from "@/types"
import { cn } from "@/lib/utils"

export type EligibilityResult = "Eligible" | "Eligible with Warning" | "Not Eligible"

interface EligibilityChecklistProps {
  items: EligibilityCheckItem[]
  result: EligibilityResult
  columns?: 1 | 2
}

const RESULT_TONE: Record<EligibilityResult, "success" | "warning" | "danger"> = {
  Eligible: "success",
  "Eligible with Warning": "warning",
  "Not Eligible": "danger",
}

export function EligibilityChecklist({ items, result, columns = 1 }: EligibilityChecklistProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
        <span className="text-sm font-medium text-foreground">Overall Eligibility Result</span>
        <StatusBadge label={result} tone={RESULT_TONE[result]} className="h-6 px-3 text-xs" />
      </div>
      <ul className={cn("grid gap-2", columns === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
        {items.map((item) => (
          <li
            key={item.label}
            className={cn(
              "flex items-start gap-2.5 rounded-lg border p-3 text-sm",
              item.passed ? "border-success/25 bg-success/5" : "border-destructive/25 bg-destructive/5"
            )}
          >
            {item.passed ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            )}
            <span>
              <span className="block font-medium text-foreground">{item.label}</span>
              <span className="block text-xs text-muted-foreground">{item.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      {result !== "Eligible" && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>One or more conditions were not met. Review the failed items above before proceeding, or apply an eligibility override if you hold the required permission.</span>
        </div>
      )}
    </div>
  )
}
