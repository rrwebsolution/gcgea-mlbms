import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { listLoanTypes, updateLoanType } from "@/services/loans.service"
import { formatCurrency } from "@/utils/format"
import type { LoanType, LoanTypeIncomeBracketInput } from "@/types"

const SOLIDARITY_LOAN_NAME = "Solidarity Cash Assistance Loan"

const BEYOND_NET_PAY = 99_999_999_999

const DEFAULT_BRACKETS: LoanTypeIncomeBracketInput[] = [
  { minNetPay: 5_000, maxNetPay: 7_000, loanableAmount: 20_000 },
  { minNetPay: 8_000, maxNetPay: 10_000, loanableAmount: 30_000 },
  { minNetPay: 11_000, maxNetPay: 12_000, loanableAmount: 40_000 },
  { minNetPay: 13_000, maxNetPay: BEYOND_NET_PAY, loanableAmount: 50_000 },
]

function loanUpdatePayload(
  type: LoanType,
  brackets: LoanTypeIncomeBracketInput[],
  defaultInterestRate: number,
  serviceChargePercent: number,
  maxTermMonths: number,
) {
  const loanableAmounts = brackets.map((b) => b.loanableAmount)
  return {
    name: type.name,
    description: type.description,
    minAmount: loanableAmounts.length ? Math.min(...loanableAmounts) : type.minAmount,
    maxAmount: loanableAmounts.length ? Math.max(...loanableAmounts) : type.maxAmount,
    defaultInterestRate,
    interestMethod: type.interestMethod,
    processingFee: type.processingFee,
    serviceChargePercent,
    incomeBrackets: brackets.map((b) => ({
      ...b,
      // The UI uses an explicit enterprise-scale sentinel for "and above";
      // the existing backend stores the same meaning as NULL/open-ended.
      maxNetPay: b.maxNetPay === BEYOND_NET_PAY ? null : b.maxNetPay,
    })),
    maxTermMonths,
    requiredMembershipMonths: type.requiredMembershipMonths,
    requiredContributionMonths: type.requiredContributionMonths,
    allowExistingActiveLoan: type.allowExistingActiveLoan,
    status: type.status,
  }
}

export interface LoanComputationSettingsHandle {
  save: () => Promise<void>
}

export const LoanComputationSettingsCard = React.forwardRef<LoanComputationSettingsHandle>(function LoanComputationSettingsCard(_, ref) {
  const queryClient = useQueryClient()
  const { data: loanTypes = [] } = useQuery({ queryKey: ["loan-types"], queryFn: listLoanTypes })
  const loanType = loanTypes.find((type) => type.name === SOLIDARITY_LOAN_NAME)
  const sourceBrackets = loanType?.incomeBrackets

  const [brackets, setBrackets] = React.useState<LoanTypeIncomeBracketInput[]>(DEFAULT_BRACKETS)
  const [monthlyInterestRate, setMonthlyInterestRate] = React.useState(1)
  const [serviceChargePercent, setServiceChargePercent] = React.useState(1)
  const [maxTermMonths, setMaxTermMonths] = React.useState(36)

  React.useEffect(() => {
    if (sourceBrackets?.length) {
      setBrackets(sourceBrackets.map((b) => ({
        minNetPay: b.minNetPay,
        maxNetPay: b.maxNetPay ?? BEYOND_NET_PAY,
        loanableAmount: b.loanableAmount,
      })))
    }
  }, [sourceBrackets])

  React.useEffect(() => {
    if (loanType) {
      setMonthlyInterestRate(loanType.defaultInterestRate)
      setServiceChargePercent(loanType.serviceChargePercent ?? 1)
      setMaxTermMonths(loanType.maxTermMonths)
    }
  }, [loanType])

  const invalidRange = brackets.some((bracket, index) =>
    bracket.minNetPay < 0
    || (bracket.maxNetPay != null && bracket.maxNetPay < bracket.minNetPay)
    || bracket.loanableAmount < 0
    || (index > 0 && bracket.minNetPay <= (brackets[index - 1].maxNetPay ?? bracket.minNetPay - 1))
  )
  const invalidTerms = monthlyInterestRate < 0 || serviceChargePercent < 0 || maxTermMonths <= 0

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!loanType) throw new Error(`Missing loan type: ${SOLIDARITY_LOAN_NAME}`)
      await updateLoanType(loanType.id, loanUpdatePayload(loanType, brackets, monthlyInterestRate, serviceChargePercent, maxTermMonths))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan-types"] })
    },
  })

  React.useImperativeHandle(ref, () => ({
    save: async () => {
      if (invalidRange) throw new Error("Fix the Solidarity Cash Assistance Loan income brackets before saving.")
      if (invalidTerms) throw new Error("Fix the Solidarity Cash Assistance Loan interest/service charge/term before saving.")
      await saveMutation.mutateAsync()
    },
  }), [invalidRange, invalidTerms, saveMutation])

  function updateBracket(index: number, patch: Partial<LoanTypeIncomeBracketInput>) {
    setBrackets((current) => current.map((bracket, bracketIndex) => bracketIndex === index ? { ...bracket, ...patch } : bracket))
  }

  function addBracket() {
    setBrackets((current) => {
      if (current.length === 0) return [{ minNetPay: 0, maxNetPay: BEYOND_NET_PAY, loanableAmount: 0 }]
      const next = current.map((bracket) => ({ ...bracket }))
      const last = next[next.length - 1]
      const nextMin = last.minNetPay + 1_000
      last.maxNetPay = nextMin - 1
      return [...next, { minNetPay: nextMin, maxNetPay: BEYOND_NET_PAY, loanableAmount: 0 }]
    })
  }

  function removeBracket(index: number) {
    setBrackets((current) => {
      if (current.length <= 1) return current
      const next = current.filter((_, bracketIndex) => bracketIndex !== index).map((bracket) => ({ ...bracket }))
      for (let bracketIndex = 0; bracketIndex < next.length - 1; bracketIndex += 1) {
        next[bracketIndex].maxNetPay = next[bracketIndex + 1].minNetPay - 1
      }
      next[next.length - 1].maxNetPay = BEYOND_NET_PAY
      return next
    })
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="border-b p-5">
        <h3 className="font-semibold">SOLIDARITY CASH ASSISTANCE LOAN</h3>
        <p className="mt-1 text-sm font-medium">Loanable Amount = Bracket Limit for the Member&apos;s Monthly Net Take-Home Pay</p>
        <p className="mt-1 max-w-4xl text-xs leading-relaxed text-muted-foreground">
          Unlike the benefit tables above, this is not a benefit computation — it determines the maximum loanable
          amount based on the member&apos;s monthly net take-home pay, not a fixed maximum split by percentage
          tiers.
        </p>
      </div>

      <div className="space-y-4 p-4 pt-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Monthly Interest (%)</label>
            <Input className="h-9 text-sm" type="number" min={0} step="0.01" value={monthlyInterestRate} onChange={(event) => setMonthlyInterestRate(Number(event.target.value))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Service Charge (%)</label>
            <Input className="h-9 text-sm" type="number" min={0} step="0.01" value={serviceChargePercent} onChange={(event) => setServiceChargePercent(Number(event.target.value))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Payment Period (months)</label>
            <Input className="h-9 text-sm" type="number" min={1} value={maxTermMonths} onChange={(event) => setMaxTermMonths(Number(event.target.value))} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Members&apos; Monthly Net Take Home Pay brackets and their loanable amount:</p>
          <Button type="button" size="sm" variant="outline" onClick={addBracket}>
            <Plus className="size-4" /> Add Row
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Members&apos; Monthly Net Take Home Pay</TableHead>
                <TableHead>Loanable Amount</TableHead>
                <TableHead>Monthly Interest</TableHead>
                <TableHead>Period of Payment</TableHead>
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brackets.map((bracket, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex min-w-56 items-center gap-2">
                      <span className="text-muted-foreground">₱</span>
                      <Input className="h-8 w-24" type="number" min={0} value={bracket.minNetPay} onChange={(event) => updateBracket(index, { minNetPay: Number(event.target.value) })} />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        className="h-8 w-24"
                        type="number"
                        min={bracket.minNetPay}
                        value={bracket.maxNetPay ?? BEYOND_NET_PAY}
                        onChange={(event) => updateBracket(index, { maxNetPay: Number(event.target.value) })}
                      />
                      {bracket.maxNetPay === BEYOND_NET_PAY && <span className="text-muted-foreground">and above</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">₱</span>
                      <Input className="h-8 w-28" type="number" min={0} value={bracket.loanableAmount} onChange={(event) => updateBracket(index, { loanableAmount: Number(event.target.value) })} />
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">{monthlyInterestRate}% per month</TableCell>
                  <TableCell className="font-semibold">Up to {maxTermMonths} months</TableCell>
                  <TableCell className="w-12">
                    <Button type="button" variant="ghost" size="icon-sm" disabled={brackets.length <= 1} onClick={() => removeBracket(index)} aria-label={`Remove bracket ${index + 1}`}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/10 p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Sample Computation</p>
          <p className="mt-1">
            For a {formatCurrency(brackets[0]?.loanableAmount ?? 0)} loan: Monthly Interest = {formatCurrency((brackets[0]?.loanableAmount ?? 0) * monthlyInterestRate / 100)}
            {" "}({monthlyInterestRate}%), Service Charge = {formatCurrency((brackets[0]?.loanableAmount ?? 0) * serviceChargePercent / 100)} ({serviceChargePercent}%).
          </p>
        </div>
      </div>

      <div className="space-y-3 border-t bg-muted/10 px-5 py-4 text-xs leading-relaxed text-muted-foreground">
        <p>
          A service charge equivalent to the percentage above of the gross loan amount shall be imposed on all loan
          applications, including loan renewals. Any loan exceeding the prescribed limit shall require a Board
          Resolution specifically approving the exception and stating the reasons therefor. Benefits shall apply
          only to claims whose qualifying event occurs after the effectivity of this Resolution unless otherwise
          expressly authorized by the Board.
        </p>
        <p className="font-semibold text-foreground">Table 3 – Solidarity Cash Assistance</p>
      </div>
      {(invalidRange || invalidTerms) && (
        <p className="border-t bg-destructive/5 px-5 py-3 text-sm text-destructive">
          Net pay brackets must be continuous and non-overlapping, and interest/service charge/term must be valid.
        </p>
      )}
    </div>
  )
})
