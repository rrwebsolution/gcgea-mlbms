import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { EligibilityChecklist } from "@/components/shared/EligibilityChecklist"
import { getReloanEligibility } from "@/services/loans.service"
import { formatCurrency } from "@/utils/format"

interface ReloanEligibilityCardProps {
  loanId: string
  onResult?: (eligible: boolean, reason?: string) => void
}

/** The "ReLoan Eligibility" card — Loan Details sidebar and Reloan wizard Step 2. Server-authoritative via GET /loans/{loan}/reloan-eligibility. */
export function ReloanEligibilityCard({ loanId, onResult }: ReloanEligibilityCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["reloan-eligibility", loanId],
    queryFn: () => getReloanEligibility(loanId),
  })

  useEffect(() => {
    if (data) onResult?.(data.eligible, data.checks.find((c) => !c.passed)?.detail)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-border p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Checking reloan eligibility…
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-3">
      <EligibilityChecklist items={data.checks} result={data.verdict} columns={2} />
      {data.previousObligation.amount > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          Previous outstanding obligation: <span className="font-semibold">{formatCurrency(data.previousObligation.amount)}</span> — must be settled before this reloan can be released.
        </div>
      )}
    </div>
  )
}
