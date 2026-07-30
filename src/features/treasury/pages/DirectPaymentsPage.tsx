import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CreditCard, Loader2, ReceiptText, Save, Wallet } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { MemberSelectionStep } from "@/components/shared/MemberSelectionStep"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/AuthContext"
import { getMember } from "@/services/members.service"
import { createContribution, defaultContributionAmountForType, getAllContributions, hasExistingContribution } from "@/services/contributions.service"
import { createLoanPayment } from "@/services/loan-payments.service"
import { getLoanSettings } from "@/services/loan-settings.service"
import { getMemberLoans, listAllLoans } from "@/services/loans.service"
import { listDeductionTypes } from "@/services/deduction-types.service"
import { getSettings } from "@/services/settings.service"
import { formatCurrency } from "@/utils/format"
import { cn } from "@/lib/utils"
import type { PaymentMethod } from "@/types"

type DirectPaymentType = "Contribution" | "Loan Payment"
// Same options as the standalone Add Contribution / Record Payment pages.
const DIRECT_METHODS: PaymentMethod[] = ["Payroll Deduction", "Cash", "Bank Transfer", "Check"]
// Matches the field label styling used on the standalone Add Contribution page, so this
// section reads as the same form instead of a different-looking shortcut to it.
const FIELD_LABEL = "text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80"

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

// Same default-resolution as the standalone Add Contribution page.
function defaultPaymentMethodSetting(): PaymentMethod {
  const value = getSettings().contribution.defaultPaymentMethod
  return (DIRECT_METHODS as string[]).includes(value) ? (value as PaymentMethod) : "Payroll Deduction"
}

export default function DirectPaymentsPage() {
  const { user, hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const canPostContribution = hasPermission("contributions.create")
  const canPostLoanPayment = hasPermission("loan_payments.create")
  const firstAvailableType: DirectPaymentType = canPostContribution ? "Contribution" : "Loan Payment"

  const [paymentType, setPaymentType] = React.useState<DirectPaymentType>(firstAvailableType)
  const [memberId, setMemberId] = React.useState("")
  const [loanId, setLoanId] = React.useState("")
  const [contributionPeriod, setContributionPeriod] = React.useState(() => currentPeriod())
  const [paymentDate, setPaymentDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = React.useState<number>(() => defaultContributionAmountForType("Monthly Dues") ?? 150)
  const [penalty, setPenalty] = React.useState(0)
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(defaultPaymentMethodSetting)
  const [officialReceiptNumber, setOfficialReceiptNumber] = React.useState("")
  const [payrollReference, setPayrollReference] = React.useState("")
  const [remarks, setRemarks] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  const { data: member } = useQuery({
    queryKey: ["members", memberId],
    queryFn: () => getMember(memberId),
    enabled: Boolean(memberId),
  })
  const { data: loans = [] } = useQuery({ queryKey: ["loans", "all"], queryFn: listAllLoans, enabled: canPostLoanPayment })
  const { data: loanSettings } = useQuery({ queryKey: ["loan-settings"], queryFn: getLoanSettings, enabled: paymentType === "Loan Payment" })
  const { data: deductionTypes = [] } = useQuery({ queryKey: ["deduction-types"], queryFn: listDeductionTypes, enabled: paymentType === "Contribution" })
  const globalPabaonAmount = deductionTypes.find((t) => t.code.toLowerCase() === "pabaon" && t.isActive)?.defaultAmount
  const contributionSettings = getSettings().contribution

  const activeLoans = loans.filter((loan) =>
    loan.memberId === memberId
    && ["Released", "Active", "Overdue", "Restructured"].includes(loan.status)
    && loan.outstandingBalance > 0
  )
  const selectedLoan = activeLoans.find((loan) => loan.id === loanId)

  // Member summary card stats — same source/definition as the standalone Add Contribution
  // and Record Payment pages (member's full loan/contribution history), not the narrower
  // "payable now" filter above that's only used for the Loan Account dropdown.
  const memberContributions = memberId ? getAllContributions().filter((c) => c.memberId === memberId && c.status === "Posted") : []
  const totalContributions = memberContributions.reduce((sum, c) => sum + c.amount, 0)
  const memberLoans = memberId ? getMemberLoans(memberId) : []
  const summaryActiveLoans = memberLoans.filter((l) => ["Active", "Overdue", "Released"].includes(l.status))
  const summaryOverdueLoans = memberLoans.filter((l) => l.status === "Overdue")
  const summaryOutstandingBalance = summaryActiveLoans.reduce((sum, l) => sum + l.outstandingBalance, 0)

  // Same duplicate-period guard as the standalone Add Contribution page — prevents
  // accidentally double-posting Monthly Dues for a period already on record.
  const isDuplicateContribution = paymentType === "Contribution" && Boolean(memberId) && Boolean(contributionPeriod)
    && hasExistingContribution(memberId, contributionPeriod, "Monthly Dues")

  React.useEffect(() => {
    if (paymentType !== "Loan Payment" || !selectedLoan || !loanSettings) return
    const configuredPenalty = selectedLoan.status === "Overdue"
      ? Math.round(selectedLoan.monthlyAmortization * loanSettings.defaultPenaltyRate) / 100
      : 0
    setPenalty(configuredPenalty)
  }, [loanSettings, paymentType, selectedLoan])

  function changePaymentType(type: DirectPaymentType) {
    setPaymentType(type)
    setLoanId("")
    setPenalty(0)
    setAmount(type === "Contribution" ? (defaultContributionAmountForType("Monthly Dues") ?? 150) : 0)
  }

  function selectMember(id: string) {
    setMemberId(id)
    setLoanId("")
    setPenalty(0)
    if (paymentType === "Loan Payment") setAmount(0)
  }

  const loanPrincipalPayment = amount - penalty
  const canSave = Boolean(
    member
    && paymentDate
    && amount > 0
    && officialReceiptNumber.trim()
    && (paymentType === "Contribution"
      ? contributionPeriod && !isDuplicateContribution
      : selectedLoan && loanPrincipalPayment > 0 && loanPrincipalPayment <= selectedLoan.outstandingBalance)
  )

  async function handleSave() {
    if (!canSave || !member || !user) return
    setIsSaving(true)
    try {
      if (paymentType === "Contribution") {
        const contribution = await createContribution({
          memberId: member.id,
          memberNumber: member.memberNumber,
          memberName: member.fullName,
          officeName: member.officeName,
          contributionPeriod,
          contributionType: "Monthly Dues",
          amount,
          paymentMethod,
          officialReceiptNumber: officialReceiptNumber.trim(),
          payrollReference: payrollReference.trim() || undefined,
          paymentDate,
          remarks: remarks.trim() || undefined,
          encodedBy: user.fullName,
        })
        // A Monthly Dues contribution auto-posts a matching Cash Pabaon deduction
        // server-side — refresh so it shows immediately wherever deductions are displayed,
        // same as the standalone Add Contribution page does.
        await queryClient.invalidateQueries({ queryKey: ["deductions"] })
        toast.success(`Direct contribution ${contribution.referenceNumber} posted successfully.`)
      } else if (selectedLoan) {
        const payment = await createLoanPayment({
          memberId: member.id,
          loanApplicationId: selectedLoan.id,
          paymentDate,
          amountPaid: amount,
          penalty,
          paymentMethod,
          officialReceiptNumber: officialReceiptNumber.trim(),
          payrollReference: payrollReference.trim() || undefined,
          remarks: remarks.trim() || undefined,
        })
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["loan-payments"] }),
          queryClient.invalidateQueries({ queryKey: ["loans"] }),
        ])
        toast.success(`Direct loan payment ${payment.paymentReferenceNumber} posted successfully.`)
      }

      setOfficialReceiptNumber("")
      setPayrollReference("")
      setRemarks("")
      setLoanId("")
      setPenalty(0)
      setContributionPeriod(currentPeriod())
      setAmount(paymentType === "Contribution" ? (defaultContributionAmountForType("Monthly Dues") ?? 150) : 0)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to post the direct payment.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5 pb-20">
      <PageHeader title="Payments" description="Record walk-in payments received directly by the Treasurer and issue an official receipt." />

      <div className="grid gap-3 sm:grid-cols-2">
        {canPostContribution && (
          <button
            type="button"
            onClick={() => changePaymentType("Contribution")}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
              paymentType === "Contribution" ? "border-primary bg-primary/8 shadow-sm" : "border-border bg-card hover:border-primary/35"
            )}
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary"><Wallet /></span>
            <span><strong className="block text-sm text-foreground">Contribution Payment</strong><span className="text-xs text-muted-foreground">Post direct Monthly Dues payment</span></span>
          </button>
        )}
        {canPostLoanPayment && (
          <button
            type="button"
            onClick={() => changePaymentType("Loan Payment")}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
              paymentType === "Loan Payment" ? "border-primary bg-primary/8 shadow-sm" : "border-border bg-card hover:border-primary/35"
            )}
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary"><CreditCard /></span>
            <span><strong className="block text-sm text-foreground">Loan Payment</strong><span className="text-xs text-muted-foreground">Post payment to an active loan</span></span>
          </button>
        )}
      </div>

      <FormSection title="Step 1 · Select Member">
        <MemberSelectionStep
          selectedMemberId={memberId || undefined}
          member={member}
          onSelect={selectMember}
          totalContributions={totalContributions}
          outstandingLoanBalance={summaryOutstandingBalance}
          activeLoanCount={summaryActiveLoans.length}
          overdueLoanCount={summaryOverdueLoans.length}
        />
      </FormSection>

      {/* Contribution Details — mirrors the standalone Add Contribution page's field set/format. */}
      {member && paymentType === "Contribution" && (
        <FormSection
          title="Step 2 · Contribution Details"
          description="Contribution type is automatically recorded as Monthly Dues. Cash Pabaon is configured and posted under Deduction Types."
        >
          {isDuplicateContribution && (
            <AlertBanner
              tone="danger"
              title="Duplicate contribution warning"
              description={`A posted Monthly Dues contribution already exists for ${member.fullName} for period ${contributionPeriod}. Change the period to proceed.`}
              className="mb-4"
            />
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>Contribution Period <span className="text-destructive font-bold">*</span></Label>
              <Input type="month" value={contributionPeriod} onChange={(event) => setContributionPeriod(event.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>Monthly Contribution</Label>
              <CurrencyInput value={amount} onChange={() => {}} readOnly disabled className="bg-muted/40" />
            </div>
            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>Cash Pabaon (Contribution Settings)</Label>
              <CurrencyInput value={contributionSettings.defaultCashPabaonContribution} onChange={() => {}} readOnly disabled className="bg-muted/40" />
              <p className="text-[11px] text-muted-foreground">
                Informational only. Actually posted from Deduction Types → Pabaon
                {typeof globalPabaonAmount === "number" ? ` (currently ${formatCurrency(globalPabaonAmount)})` : ""}.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>Payment Method</Label>
              <CommandSelect
                className="w-full h-10 text-sm bg-background border-border hover:bg-accent/40 transition-all"
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                options={DIRECT_METHODS.map((method) => ({ value: method, label: method }))}
                hideSearch
              />
            </div>
            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>Payment Date <span className="text-destructive font-bold">*</span></Label>
              <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>Official Receipt Number</Label>
              <Input placeholder="e.g. OR-2026-000123" value={officialReceiptNumber} onChange={(event) => setOfficialReceiptNumber(event.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>Payroll Reference</Label>
              <Input placeholder="e.g. PR-2026-07-001" value={payrollReference} onChange={(event) => setPayrollReference(event.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label className={FIELD_LABEL}>Remarks</Label>
              <Textarea rows={2} placeholder="Additional notes about this contribution (optional)" value={remarks} onChange={(event) => setRemarks(event.target.value)} className="text-sm bg-background resize-none" />
            </div>
          </div>
        </FormSection>
      )}

      {/* Loan Payment Details — mirrors the standalone Record Payment page's field set/format. */}
      {member && paymentType === "Loan Payment" && (
        <FormSection title="Step 2 · Loan Payment Details">
          {activeLoans.length === 0 && (
            <AlertBanner tone="warning" title="No payable loan found" description="This member has no active loan with an outstanding balance." className="mb-4" />
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Loan Account <span className="text-destructive">*</span></Label>
              <CommandSelect
                value={loanId}
                onValueChange={(value) => {
                  setLoanId(value)
                  const loan = activeLoans.find((item) => item.id === value)
                  setAmount(loan ? Math.min(loan.monthlyAmortization, loan.outstandingBalance) : 0)
                }}
                options={activeLoans.map((loan) => ({
                  value: loan.id,
                  label: `${loan.applicationNumber} · ${loan.loanTypeName} · Balance ${formatCurrency(loan.outstandingBalance)}`,
                }))}
                placeholder="Select an active loan"
                disabled={activeLoans.length === 0}
              />
            </div>
            <div className="space-y-1.5"><Label>Payment Date <span className="text-destructive">*</span></Label><Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></div>
            <div className="space-y-1.5"><Label>Amount Paid <span className="text-destructive">*</span></Label><CurrencyInput value={amount || undefined} onChange={(value) => setAmount(value ?? 0)} /></div>
            <div className="space-y-1.5">
              <Label>Penalty</Label>
              <CurrencyInput value={penalty} onChange={(value) => setPenalty(value ?? 0)} />
              <p className="text-xs text-muted-foreground">{selectedLoan?.status === "Overdue" ? `${loanSettings?.defaultPenaltyRate ?? 0}% of monthly amortization, from Loan Settings.` : "No automatic penalty because this loan is not overdue."}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <CommandSelect value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)} options={DIRECT_METHODS.map((method) => ({ value: method, label: method }))} hideSearch />
            </div>
            <div className="space-y-1.5"><Label>Official Receipt Number <span className="text-destructive">*</span></Label><Input value={officialReceiptNumber} onChange={(event) => setOfficialReceiptNumber(event.target.value)} placeholder="e.g. OR-2026-000123" /></div>
            <div className="space-y-1.5"><Label>Payroll Reference</Label><Input value={payrollReference} onChange={(event) => setPayrollReference(event.target.value)} placeholder="Optional" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Remarks</Label><Textarea rows={2} value={remarks} onChange={(event) => setRemarks(event.target.value)} /></div>
          </div>
          {selectedLoan && loanPrincipalPayment > selectedLoan.outstandingBalance && (
            <p className="mt-3 text-sm font-medium text-destructive">Payment excluding penalty cannot exceed the outstanding balance of {formatCurrency(selectedLoan.outstandingBalance)}.</p>
          )}
        </FormSection>
      )}

      {member && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            {isSaving ? "Posting payment…" : paymentType === "Contribution" ? "Post Direct Payment" : "Record Payment"}
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-info/25 bg-info/5 p-4 text-xs text-muted-foreground">
        <p className="flex items-center gap-2 font-semibold text-foreground"><ReceiptText className="size-4 text-info" /> Treasury posting reminder</p>
        <p className="mt-1">Verify the amount and Official Receipt Number before posting. Direct payments are immediately reflected in the member ledger.</p>
      </div>
    </div>
  )
}
