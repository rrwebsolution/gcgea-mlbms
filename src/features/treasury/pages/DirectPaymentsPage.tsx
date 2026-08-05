import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { 
  BadgeCheck, 
  CreditCard, 
  HeartHandshake, 
  Loader2, 
  ReceiptText, 
  Save, 
  Wallet,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  Sparkles,
  Info,
  DollarSign
} from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { MemberSelectionStep } from "@/components/shared/MemberSelectionStep"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/AuthContext"
import { getMember, payMembershipFee } from "@/services/members.service"
import { createContribution, defaultContributionAmountForType, getAllContributions, listAllContributions, hasExistingContribution } from "@/services/contributions.service"
import { createLoanPayment } from "@/services/loan-payments.service"
import { getLoanSettings } from "@/services/loan-settings.service"
import { getMemberLoans, getLoanSchedule, listAllLoans } from "@/services/loans.service"
import { listAllBenefits, releaseBenefit } from "@/services/benefits.service"
import { listAllDeductions } from "@/services/deductions.service"
import { listDeductionTypes } from "@/services/deduction-types.service"
import { getSettings } from "@/services/settings.service"
import { formatCurrency, formatMonthYear } from "@/utils/format"
import { CASH_PABAON_PROGRAM_NAME } from "@/utils/eligibility"
import { cn } from "@/lib/utils"
import type { PaymentMethod } from "@/types"

type DirectPaymentType = "Contribution" | "Loan Payment" | "Benefit Payment" | "Membership Fee"

const DIRECT_METHODS: PaymentMethod[] = ["Payroll Deduction", "Cash", "Bank Transfer", "Check"]

const FIELD_LABEL = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/90 flex items-center gap-1.5"

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function defaultPaymentMethodSetting(): PaymentMethod {
  const value = getSettings().contribution.defaultPaymentMethod
  return (DIRECT_METHODS as string[]).includes(value) ? (value as PaymentMethod) : "Payroll Deduction"
}

export default function DirectPaymentsPage() {
  const { user, hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const canPostContribution = hasPermission("contributions.create")
  const canPostLoanPayment = hasPermission("loan_payments.create")
  const canPostBenefitPayment = hasPermission("benefits.release")
  const canPostMembershipFee = hasPermission("members.create") || hasPermission("contributions.create")
  const firstAvailableType: DirectPaymentType = canPostContribution ? "Contribution" : canPostLoanPayment ? "Loan Payment" : canPostBenefitPayment ? "Benefit Payment" : "Membership Fee"

  const [paymentType, setPaymentType] = React.useState<DirectPaymentType>(firstAvailableType)
  const [memberId, setMemberId] = React.useState("")
  const [loanId, setLoanId] = React.useState("")
  const [benefitId, setBenefitId] = React.useState("")
  const [contributionPeriod, setContributionPeriod] = React.useState(() => currentPeriod())
  const [paymentDate, setPaymentDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = React.useState<number>(() => defaultContributionAmountForType("Monthly Dues") ?? 150)
  const [penalty, setPenalty] = React.useState(0)
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(defaultPaymentMethodSetting)
  const [officialReceiptNumber, setOfficialReceiptNumber] = React.useState("")
  const [payrollReference, setPayrollReference] = React.useState("")
  const [remarks, setRemarks] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const [includeShortfall, setIncludeShortfall] = React.useState(true)

  const { data: member } = useQuery({
    queryKey: ["members", memberId],
    queryFn: () => getMember(memberId),
    enabled: Boolean(memberId),
  })
  const { data: loans = [] } = useQuery({ queryKey: ["loans", "all"], queryFn: listAllLoans, enabled: canPostLoanPayment })
  const { data: loanSettings } = useQuery({ queryKey: ["loan-settings"], queryFn: getLoanSettings, enabled: paymentType === "Loan Payment" })
  const { data: deductionTypes = [] } = useQuery({ queryKey: ["deduction-types"], queryFn: listDeductionTypes, enabled: paymentType === "Contribution" || paymentType === "Benefit Payment" })
  const globalPabaonAmount = deductionTypes.find((t) => t.code.toLowerCase() === "pabaon" && t.isActive)?.defaultAmount
  const contributionSettings = getSettings().contribution

  const { data: benefits = [] } = useQuery({ queryKey: ["benefits", "all"], queryFn: listAllBenefits, enabled: canPostBenefitPayment })
  const memberApprovedBenefits = benefits.filter((b) => b.memberId === memberId && b.status === "Approved")
  const selectedBenefit = memberApprovedBenefits.find((b) => b.id === benefitId)
  const { data: allContributionsForBenefit = [] } = useQuery({ queryKey: ["contributions", "all"], queryFn: listAllContributions, enabled: paymentType === "Benefit Payment" })
  const { data: allDeductionsForBenefit = [] } = useQuery({ queryKey: ["deductions", "all"], queryFn: listAllDeductions, enabled: paymentType === "Benefit Payment" })
  const pabaonDeductionType = deductionTypes.find((t) => t.code.toLowerCase() === "pabaon")
  const isCashPabaonBenefit = selectedBenefit?.benefitTypeName === CASH_PABAON_PROGRAM_NAME

  const benefitMemberPosted = allContributionsForBenefit.filter((c) => c.memberId === memberId && c.status === "Posted")
  const benefitMemberDirectPabaon = benefitMemberPosted.filter((c) => c.contributionType === "Cash Pabaon")
  const benefitMemberPabaonDeductions = allDeductionsForBenefit.filter((d) =>
    d.memberId === memberId
    && d.status === "Posted"
    && (d.deductionTypeId === pabaonDeductionType?.id || d.deductionTypeCode?.toLowerCase() === "pabaon")
  )
  const benefitPabaonPeriodsWithContribution = new Set(benefitMemberDirectPabaon.map((c) => c.contributionPeriod))
  const totalCashPabaonContributed = benefitMemberDirectPabaon.reduce((sum, c) => sum + c.amount, 0)
    + benefitMemberPabaonDeductions
        .filter((d) => !benefitPabaonPeriodsWithContribution.has(d.period))
        .reduce((sum, d) => sum + d.amount, 0)
  const benefitApprovedAmount = selectedBenefit?.approvedAmount ?? selectedBenefit?.requestedAmount ?? 0
  const defaultBenefitReleaseAmount = isCashPabaonBenefit
    ? Math.max(0, benefitApprovedAmount - totalCashPabaonContributed)
    : benefitApprovedAmount

  React.useEffect(() => {
    if (paymentType !== "Benefit Payment" || !selectedBenefit) return
    setAmount(defaultBenefitReleaseAmount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentType, selectedBenefit?.id, defaultBenefitReleaseAmount])

  React.useEffect(() => {
    if (paymentType !== "Membership Fee" || !member?.membershipFeePayment) return
    setAmount(member.membershipFeePayment.amount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentType, member?.id])

  const activeLoans = loans.filter((loan) =>
    loan.memberId === memberId
    && ["Released", "Active", "Overdue", "Restructured"].includes(loan.status)
    && loan.outstandingBalance > 0
  )
  const selectedLoan = activeLoans.find((loan) => loan.id === loanId)
  const { data: selectedLoanSchedule = [] } = useQuery({
    queryKey: ["loans", loanId, "schedule"],
    queryFn: () => getLoanSchedule(loanId),
    enabled: paymentType === "Loan Payment" && !!loanId,
  })
  const partiallyPaidInstallment = selectedLoanSchedule.find((entry) => entry.status === "Partially Paid")
  const shortfallAmount = partiallyPaidInstallment ? partiallyPaidInstallment.amountDue - partiallyPaidInstallment.amountPaid : 0

  const memberContributions = memberId ? getAllContributions().filter((c) => c.memberId === memberId && c.status === "Posted") : []
  const totalContributions = memberContributions.reduce((sum, c) => sum + c.amount, 0)
  const memberLoans = memberId ? getMemberLoans(memberId) : []
  const summaryActiveLoans = memberLoans.filter((l) => ["Active", "Overdue", "Released"].includes(l.status))
  const summaryOverdueLoans = memberLoans.filter((l) => l.status === "Overdue")
  const summaryOutstandingBalance = summaryActiveLoans.reduce((sum, l) => sum + l.outstandingBalance, 0)

  const isDuplicateContribution = paymentType === "Contribution" && Boolean(memberId) && Boolean(contributionPeriod)
    && hasExistingContribution(memberId, contributionPeriod, "Monthly Dues")

  React.useEffect(() => {
    if (paymentType !== "Loan Payment" || !selectedLoan || !loanSettings) return
    const configuredPenalty = selectedLoan.status === "Overdue"
      ? Math.round(selectedLoan.monthlyAmortization * loanSettings.defaultPenaltyRate) / 100
      : 0
    setPenalty(configuredPenalty)
  }, [loanSettings, paymentType, selectedLoan])

  React.useEffect(() => {
    if (paymentType !== "Loan Payment" || !selectedLoan) return
    const suggested = includeShortfall ? selectedLoan.monthlyAmortization + shortfallAmount : selectedLoan.monthlyAmortization
    setAmount(Math.min(suggested, selectedLoan.outstandingBalance))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentType, selectedLoan?.id, partiallyPaidInstallment?.installmentNumber, includeShortfall])

  function changePaymentType(type: DirectPaymentType) {
    setPaymentType(type)
    setLoanId("")
    setBenefitId("")
    setPenalty(0)
    setAmount(type === "Contribution" ? (defaultContributionAmountForType("Monthly Dues") ?? 150) : 0)
  }

  function selectMember(id: string) {
    setMemberId(id)
    setLoanId("")
    setBenefitId("")
    setPenalty(0)
    if (paymentType !== "Contribution") setAmount(0)
  }

  const loanPrincipalPayment = amount - penalty
  const membershipFeeAlreadyPosted = member?.membershipFeePayment?.status === "Posted"
  const canSave = Boolean(
    member
    && amount > 0
    && (paymentType === "Contribution"
      ? paymentDate && officialReceiptNumber.trim() && contributionPeriod && !isDuplicateContribution
      : paymentType === "Loan Payment"
        ? paymentDate && officialReceiptNumber.trim() && selectedLoan && loanPrincipalPayment > 0 && loanPrincipalPayment <= selectedLoan.outstandingBalance
        : paymentType === "Benefit Payment"
          ? selectedBenefit && amount <= benefitApprovedAmount
          : member.membershipFeePayment && !membershipFeeAlreadyPosted && paymentDate && paymentMethod)
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
        await queryClient.invalidateQueries({ queryKey: ["deductions"] })
        toast.success(`Direct contribution ${contribution.referenceNumber} posted successfully.`)
      } else if (paymentType === "Loan Payment" && selectedLoan) {
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
      } else if (paymentType === "Benefit Payment" && selectedBenefit) {
        const released = await releaseBenefit(selectedBenefit.id, remarks.trim() || undefined, amount)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["benefits"] }),
          queryClient.invalidateQueries({ queryKey: ["approvals"] }),
        ])
        toast.success(`Benefit ${released.releaseReferenceNumber ?? released.applicationNumber} released and paid successfully.`)
      } else if (paymentType === "Membership Fee" && member.membershipFeePayment) {
        const updated = await payMembershipFee(member.id, { amount, paymentDate, paymentMethod })
        await queryClient.invalidateQueries({ queryKey: ["members"] })
        toast.success(`Membership fee ${updated.membershipFeePayment?.referenceNumber ?? ""} posted successfully.`)
      }

      setOfficialReceiptNumber("")
      setPayrollReference("")
      setRemarks("")
      setLoanId("")
      setBenefitId("")
      setPenalty(0)
      setContributionPeriod(currentPeriod())
      setAmount(paymentType === "Contribution" ? (defaultContributionAmountForType("Monthly Dues") ?? 150) : 0)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to post the direct payment.")
    } finally {
      setIsSaving(false)
    }
  }

  const PAYMENT_OPTIONS = [
    {
      id: "Contribution" as DirectPaymentType,
      title: "Contribution Payment",
      description: "Post direct Monthly Dues payment",
      icon: Wallet,
      show: canPostContribution,
    },
    {
      id: "Loan Payment" as DirectPaymentType,
      title: "Loan Payment",
      description: "Post payment to an active loan",
      icon: CreditCard,
      show: canPostLoanPayment,
    },
    {
      id: "Benefit Payment" as DirectPaymentType,
      title: "Benefit Payment",
      description: "Release an approved benefit claim",
      icon: HeartHandshake,
      show: canPostBenefitPayment,
    },
    {
      id: "Membership Fee" as DirectPaymentType,
      title: "Membership Fee",
      description: "Post a member's registration fee",
      icon: BadgeCheck,
      show: canPostMembershipFee,
    },
  ]

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      <PageHeader 
        title="Direct Payments Hub" 
        description="Record walk-in payments received directly by the Treasurer and issue official receipts in real time." 
      />

      {/* Select Payment Type Header Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PAYMENT_OPTIONS.filter((opt) => opt.show).map((opt) => {
          const Icon = opt.icon
          const isSelected = paymentType === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => changePaymentType(opt.id)}
              className={cn(
                "group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                isSelected
                  ? "border-primary bg-primary/[0.04] shadow-md shadow-primary/5 ring-1 ring-primary/30"
                  : "border-border/80 bg-card hover:border-primary/40 hover:bg-accent/30 hover:shadow-sm"
              )}
            >
              {isSelected && (
                <div className="absolute right-3 top-3 text-primary animate-in fade-in zoom-in-75 duration-150">
                  <CheckCircle2 className="size-4 fill-primary/10" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="space-y-0.5 pr-4">
                  <strong className="block text-sm font-semibold tracking-tight text-foreground">
                    {opt.title}
                  </strong>
                  <span className="block text-xs text-muted-foreground line-clamp-1">
                    {opt.description}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Step 1: Member Selection */}
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

      {/* Step 2: Contribution Details */}
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
              className="mb-5 shadow-sm"
            />
          )}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>
                <Calendar className="size-3.5 text-primary" />
                Contribution Period <span className="text-destructive font-bold">*</span>
              </Label>
              <Input 
                type="month" 
                value={contributionPeriod} 
                onChange={(event) => setContributionPeriod(event.target.value)} 
                className="h-10 text-sm font-medium focus-visible:ring-primary/30" 
              />
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>
                <DollarSign className="size-3.5 text-primary" />
                Monthly Contribution
              </Label>
              <CurrencyInput 
                value={amount} 
                onChange={() => {}} 
                readOnly 
                disabled 
                className="bg-muted/50 font-semibold text-foreground h-10 border-border/70" 
              />
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>
                <Sparkles className="size-3.5 text-amber-500" />
                Cash Pabaon (Info Only)
              </Label>
              <CurrencyInput 
                value={contributionSettings.defaultCashPabaonContribution} 
                onChange={() => {}} 
                readOnly 
                disabled 
                className="bg-muted/50 font-semibold text-foreground h-10 border-border/70" 
              />
              <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1 mt-1">
                <Info className="size-3 shrink-0" />
                Posted from Deduction Types → Pabaon
                {typeof globalPabaonAmount === "number" ? ` (${formatCurrency(globalPabaonAmount)})` : ""}.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>Payment Method</Label>
              <CommandSelect
                className="w-full h-10 text-sm bg-background border-border hover:bg-accent/40 transition-all focus-visible:ring-primary/30"
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                options={DIRECT_METHODS.map((method) => ({ value: method, label: method }))}
                hideSearch
              />
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>
                Payment Date <span className="text-destructive font-bold">*</span>
              </Label>
              <Input 
                type="date" 
                value={paymentDate} 
                onChange={(event) => setPaymentDate(event.target.value)} 
                className="h-10 text-sm focus-visible:ring-primary/30" 
              />
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>
                Official Receipt Number <span className="text-destructive font-bold">*</span>
              </Label>
              <Input 
                placeholder="e.g. OR-2026-000123" 
                value={officialReceiptNumber} 
                onChange={(event) => setOfficialReceiptNumber(event.target.value)} 
                className="h-10 text-sm focus-visible:ring-primary/30 font-mono text-xs uppercase placeholder:normal-case placeholder:font-sans" 
              />
            </div>

            <div className="space-y-1.5 sm:col-span-3">
              <Label className={FIELD_LABEL}>Payroll Reference</Label>
              <Input 
                placeholder="e.g. PR-2026-07-001 (Optional)" 
                value={payrollReference} 
                onChange={(event) => setPayrollReference(event.target.value)} 
                className="h-10 text-sm focus-visible:ring-primary/30 font-mono text-xs" 
              />
            </div>

            <div className="space-y-1.5 sm:col-span-3">
              <Label className={FIELD_LABEL}>Remarks</Label>
              <Textarea 
                rows={2} 
                placeholder="Additional notes or walk-in payment instructions (optional)" 
                value={remarks} 
                onChange={(event) => setRemarks(event.target.value)} 
                className="text-sm bg-background resize-none focus-visible:ring-primary/30" 
              />
            </div>
          </div>
        </FormSection>
      )}

      {/* Step 2: Loan Payment Details */}
      {member && paymentType === "Loan Payment" && (
        <FormSection title="Step 2 · Loan Payment Details">
          {activeLoans.length === 0 && (
            <AlertBanner 
              tone="warning" 
              title="No payable loan found" 
              description="This member has no active or overdue loan with an outstanding balance." 
              className="mb-5 shadow-sm" 
            />
          )}
          {partiallyPaidInstallment && (
            <AlertBanner
              tone="warning"
              title={`Partially Paid — Installment #${partiallyPaidInstallment.installmentNumber} (${formatMonthYear(partiallyPaidInstallment.dueDate)})`}
              description={
                <div className="space-y-2 mt-1">
                  <p className="text-sm">This installment has a balance shortfall of <span className="font-semibold text-amber-700 dark:text-amber-400">{formatCurrency(shortfallAmount)}</span>.</p>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 w-fit">
                    <Checkbox checked={includeShortfall} onCheckedChange={(checked) => setIncludeShortfall(!!checked)} />
                    <span>Include this shortfall in suggested payment amount</span>
                  </label>
                  {!includeShortfall && (
                    <p className="text-[11px] text-muted-foreground">
                      Unchecked — the shortfall stays open and will be carried over to future collections.
                    </p>
                  )}
                </div>
              }
              className="mb-5 shadow-sm"
            />
          )}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className={FIELD_LABEL}>
                Loan Account <span className="text-destructive font-bold">*</span>
              </Label>
              <CommandSelect
                className="h-11 text-sm bg-background"
                value={loanId}
                onValueChange={(value) => {
                  setLoanId(value)
                  setIncludeShortfall(true)
                  if (!value) setAmount(0)
                }}
                options={activeLoans.map((loan) => ({
                  value: loan.id,
                  label: `${loan.applicationNumber} · ${loan.loanTypeName} · Balance ${formatCurrency(loan.outstandingBalance)}`,
                }))}
                placeholder="Select an active loan"
                disabled={activeLoans.length === 0}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>
                Payment Date <span className="text-destructive font-bold">*</span>
              </Label>
              <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="h-10 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>
                Amount Paid <span className="text-destructive font-bold">*</span>
              </Label>
              <CurrencyInput value={amount || undefined} onChange={(value) => setAmount(value ?? 0)} className="h-10 font-semibold text-primary" />
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>Penalty</Label>
              <CurrencyInput value={penalty} onChange={(value) => setPenalty(value ?? 0)} className="h-10" />
              <p className="text-[11px] text-muted-foreground mt-1">
                {selectedLoan?.status === "Overdue" 
                  ? `${loanSettings?.defaultPenaltyRate ?? 0}% penalty calculated for overdue loan.` 
                  : "No penalty applied (loan is not overdue)."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>Payment Method</Label>
              <CommandSelect 
                className="h-10 text-sm bg-background"
                value={paymentMethod} 
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)} 
                options={DIRECT_METHODS.map((method) => ({ value: method, label: method }))} 
                hideSearch 
              />
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>
                Official Receipt Number <span className="text-destructive font-bold">*</span>
              </Label>
              <Input 
                value={officialReceiptNumber} 
                onChange={(event) => setOfficialReceiptNumber(event.target.value)} 
                placeholder="e.g. OR-2026-000123" 
                className="h-10 text-sm font-mono text-xs uppercase" 
              />
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>Payroll Reference</Label>
              <Input 
                value={payrollReference} 
                onChange={(event) => setPayrollReference(event.target.value)} 
                placeholder="Optional payroll code" 
                className="h-10 text-sm font-mono text-xs" 
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className={FIELD_LABEL}>Remarks</Label>
              <Textarea rows={2} value={remarks} onChange={(event) => setRemarks(event.target.value)} className="text-sm bg-background resize-none" placeholder="Add loan payment notes..." />
            </div>
          </div>

          {selectedLoan && loanPrincipalPayment > selectedLoan.outstandingBalance && (
            <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              Payment excluding penalty cannot exceed the outstanding balance of {formatCurrency(selectedLoan.outstandingBalance)}.
            </div>
          )}
        </FormSection>
      )}

      {/* Step 2: Benefit Payment Details */}
      {member && paymentType === "Benefit Payment" && (
        <FormSection title="Step 2 · Benefit Payment Details">
          {memberApprovedBenefits.length === 0 && (
            <AlertBanner 
              tone="warning" 
              title="No payable benefit found" 
              description="This member has no benefit application awaiting release." 
              className="mb-5 shadow-sm" 
            />
          )}

          {/* Cash Pabaon Net Breakdown Card */}
          {isCashPabaonBenefit && (
            <div className="mb-5 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] via-background to-primary/[0.02] p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-3">
                <FileSpreadsheet className="size-4 text-primary" />
                <span>Cash Pabaon Settlement Ledger</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Approved Benefit Amount</span>
                  <span className="font-semibold text-foreground font-mono">{formatCurrency(benefitApprovedAmount)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Less: Total Cash Pabaon Contributed</span>
                  <span className="font-semibold text-destructive font-mono">− {formatCurrency(totalCashPabaonContributed)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 text-sm font-bold">
                  <span className="text-foreground">Net Payable Release</span>
                  <span className="text-primary font-mono text-base">{formatCurrency(defaultBenefitReleaseAmount)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className={FIELD_LABEL}>
                Benefit Application <span className="text-destructive font-bold">*</span>
              </Label>
              <CommandSelect
                className="h-11 text-sm bg-background"
                value={benefitId}
                onValueChange={setBenefitId}
                options={memberApprovedBenefits.map((b) => ({
                  value: b.id,
                  label: `${b.applicationNumber} · ${b.benefitTypeName} · Approved ${formatCurrency(b.approvedAmount ?? b.requestedAmount)}`,
                }))}
                placeholder="Select an approved benefit application"
                disabled={memberApprovedBenefits.length === 0}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>
                Amount Released <span className="text-destructive font-bold">*</span>
              </Label>
              <CurrencyInput value={amount || undefined} onChange={(value) => setAmount(value ?? 0)} className="h-10 font-semibold text-primary" />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className={FIELD_LABEL}>Remarks</Label>
              <Textarea rows={2} value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Optional remarks about the benefit release..." className="text-sm bg-background resize-none" />
            </div>
          </div>

          {selectedBenefit && amount > benefitApprovedAmount && (
            <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              Amount released cannot exceed the approved amount of {formatCurrency(benefitApprovedAmount)}.
            </div>
          )}
        </FormSection>
      )}

      {/* Step 2: Membership Fee Details */}
      {member && paymentType === "Membership Fee" && (
        <FormSection title="Step 2 · Membership Fee Details">
          {!member.membershipFeePayment ? (
            <AlertBanner tone="warning" title="No membership fee on record" description="This member has no membership registration fee record." />
          ) : membershipFeeAlreadyPosted ? (
            <AlertBanner
              tone="success"
              title="Already paid"
              description={`This member's membership fee (${member.membershipFeePayment.referenceNumber}) was already posted on ${member.membershipFeePayment.paymentDate}.`}
              className="shadow-sm"
            />
          ) : (
            <>
              <AlertBanner
                tone="warning"
                title="Registration fee unpaid"
                description="This member cannot contribute, apply for a loan, or claim a benefit until this fee is posted."
                className="mb-5 shadow-sm"
              />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className={FIELD_LABEL}>
                    Amount <span className="text-destructive font-bold">*</span>
                  </Label>
                  <CurrencyInput value={amount || undefined} onChange={(value) => setAmount(value ?? 0)} className="h-10 font-semibold" />
                </div>

                <div className="space-y-1.5">
                  <Label className={FIELD_LABEL}>
                    Payment Date <span className="text-destructive font-bold">*</span>
                  </Label>
                  <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="h-10 text-sm" />
                </div>

                <div className="space-y-1.5">
                  <Label className={FIELD_LABEL}>Payment Method</Label>
                  <CommandSelect 
                    className="h-10 text-sm bg-background"
                    value={paymentMethod} 
                    onValueChange={(value) => setPaymentMethod(value as PaymentMethod)} 
                    options={DIRECT_METHODS.map((method) => ({ value: method, label: method }))} 
                    hideSearch 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className={FIELD_LABEL}>Reference Number</Label>
                  <Input value={member.membershipFeePayment.referenceNumber} disabled className="bg-muted/50 h-10 font-mono text-xs" />
                </div>
              </div>
            </>
          )}
        </FormSection>
      )}

      {/* Save Action Bar */}
      {member && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button 
            onClick={handleSave} 
            disabled={!canSave || isSaving}
            size="lg"
            className="px-6 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all font-semibold active:scale-[0.99]"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
            {isSaving
              ? "Posting payment…"
              : paymentType === "Contribution"
                ? "Post Direct Payment"
                : paymentType === "Loan Payment"
                  ? "Record Loan Payment"
                  : paymentType === "Benefit Payment"
                    ? "Release Benefit"
                    : "Post Membership Fee"}
          </Button>
        </div>
      )}

      {/* Treasury Reminder Banner */}
      <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/5 via-primary/5 to-transparent p-4 text-xs text-muted-foreground shadow-sm">
        <div className="flex items-center gap-2 font-bold text-foreground text-sm mb-1">
          <ReceiptText className="size-4 text-blue-500 shrink-0" />
          <span>Treasury Audit & Ledger Notice</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Please double-check the transaction amount and Official Receipt (OR) Number before confirming. Direct payments are posted directly to the official member ledger and affect cash account balances immediately.
        </p>
      </div>
    </div>
  )
}