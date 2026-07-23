import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Banknote, CalendarDays, CheckCircle2, Landmark, Loader2, ReceiptText, UserRound } from "lucide-react"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "@/components/shared/PageHeader"
import { MemberSearchSelect } from "@/components/shared/MemberSearchSelect"
import { OfficeCommandSelect } from "@/components/shared/OfficeCommandSelect"
import { WizardStepIndicator } from "@/components/shared/WizardStepIndicator"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/shared/loaders/LoadingButton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { usePermission } from "@/hooks/usePermission"
import { getManualPayrollMemberContext, getNextManualPayrollReference, postManualPayrollDeduction, saveManualPayrollDraft } from "@/services/manual-payroll.service"
import { formatCurrency } from "@/utils/format"
import { listDeductionTypes } from "@/services/deduction-types.service"
import type { ManualPayrollContext, ManualPayrollDeduction } from "@/types/manual-payroll"

const STEPS = ["Payroll Information", "Select Member", "Payroll Deductions"]
const today = new Date().toISOString().slice(0, 10)

export default function ManualPayrollEntryPage() {
  const navigate = useNavigate()
  const { hasPermission } = usePermission()
  const canOverride = hasPermission("payroll.manual.override")
  const { data: deductionTypes = [] } = useQuery({ queryKey: ["deduction-types"], queryFn: listDeductionTypes })
  const [step, setStep] = React.useState(1)
  const [reference, setReference] = React.useState("")
  const [period, setPeriod] = React.useState("")
  const [payrollDate, setPayrollDate] = React.useState(today)
  const [officeId, setOfficeId] = React.useState("")
  const [remarks, setRemarks] = React.useState("")
  const [memberId, setMemberId] = React.useState("")
  const [context, setContext] = React.useState<ManualPayrollContext | null>(null)
  const [monthlyDues, setMonthlyDues] = React.useState(100)
  const [cashPabaon, setCashPabaon] = React.useState(200)
  const [loanDeduction, setLoanDeduction] = React.useState(0)
  const [isLoadingMember, setIsLoadingMember] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [draft, setDraft] = React.useState<ManualPayrollDeduction | null>(null)
  const [showConfirm, setShowConfirm] = React.useState(false)

  React.useEffect(() => {
    const configuredPabaon = deductionTypes.find((type) => type.code === "pabaon" && type.isActive)
    setCashPabaon(configuredPabaon?.defaultAmount ?? 0)
  }, [deductionTypes])

  React.useEffect(() => {
    getNextManualPayrollReference().then(setReference).catch(() => toast.error("Could not generate a payroll reference."))
  }, [])

  const total = monthlyDues + cashPabaon + loanDeduction

  async function selectMember(id: string) {
    setMemberId(id)
    setIsLoadingMember(true)
    try {
      const result = await getManualPayrollMemberContext(id)
      setContext(result)
      setOfficeId((current) => current || result.member.officeId)
      setLoanDeduction(result.activeLoan?.monthlyAmortization ?? 0)
    } catch (error) {
      setContext(null)
      toast.error(error instanceof Error ? error.message : "Member is not eligible for payroll entry.")
    } finally {
      setIsLoadingMember(false)
    }
  }

  function payload() {
    return { payrollReference: reference, payrollPeriod: period, payrollDate, officeId, remarks: remarks || undefined, memberId, monthlyDues, cashPabaon, loanDeduction }
  }

  async function saveDraft(): Promise<ManualPayrollDeduction | null> {
    setIsSaving(true)
    try {
      const saved = await saveManualPayrollDraft(payload())
      setDraft(saved)
      toast.success("Payroll deduction saved as draft. No ledger records were created.")
      return saved
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Draft could not be saved.")
      return null
    } finally {
      setIsSaving(false)
    }
  }

  async function postPayroll() {
    if (!draft) return
    setIsSaving(true)
    try {
      const posted = await postManualPayrollDeduction(draft.id)
      setDraft(posted)
      setShowConfirm(false)
      toast.success("Payroll deduction posted and ledgers updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Posting failed. No records were changed.")
    } finally {
      setIsSaving(false)
    }
  }

  const validStep1 = Boolean(reference && period && payrollDate && officeId)
  const validStep2 = Boolean(context && memberId)
  const validAmounts = monthlyDues >= 0 && cashPabaon >= 0 && loanDeduction >= 0 && loanDeduction <= (context?.activeLoan?.remainingBalance ?? 0)

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Manual Payroll Deduction Entry"
        description="Create a payroll deduction manually for a single approved and active member without uploading an Excel or CSV file."
        actions={
          <>
            <LoadingButton
              variant="outline"
              disabled={step !== 3 || !validAmounts || draft?.status === "Posted"}
              isLoading={isSaving}
              loadingText="Saving…"
              onClick={saveDraft}
            >
              Save Draft
            </LoadingButton>
            <LoadingButton
              disabled={step !== 3 || !validAmounts || draft?.status === "Posted"}
              isLoading={isSaving}
              loadingText="Posting…"
              onClick={async () => {
                if (!draft) {
                  const saved = await saveDraft()
                  if (saved) setShowConfirm(true)
                } else {
                  setShowConfirm(true)
                }
              }}
            >
              Post Payroll Deduction
            </LoadingButton>
            <Button variant="ghost" onClick={() => navigate("/payroll-deductions/history")}>
              Cancel
            </Button>
          </>
        }
      />
      <div className="rounded-xl border bg-card p-4 shadow-sm"><WizardStepIndicator steps={STEPS} currentStep={step} /></div>

      {step === 1 && <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><CalendarDays className="size-5 text-primary" /> Step 1 · Payroll Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Payroll Reference</Label><Input value={reference} readOnly /></div>
          <div className="space-y-1.5"><Label>Payroll Period</Label><Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Payroll Date</Label><Input type="date" value={payrollDate} onChange={(e) => setPayrollDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Office</Label><OfficeCommandSelect value={officeId} onValueChange={setOfficeId} valueField="id" placeholder="Select active office" /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Remarks</Label><Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional posting notes" /></div>
        </div>
        <div className="mt-5 flex justify-end"><Button disabled={!validStep1} onClick={() => setStep(2)}>Continue</Button></div>
      </section>}

      {step === 2 && <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><UserRound className="size-5 text-primary" /> Step 2 · Select Member</h2>
        <MemberSearchSelect value={memberId} onSelect={selectMember} membershipStatus="Active" selectedMember={context?.member} placeholder="Search member number, employee number, name, office, or position…" />
        {isLoadingMember && <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading scheduled deductions…</p>}
        {context && <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border p-4"><h3 className="mb-3 font-medium">Member Information</h3><dl className="grid grid-cols-2 gap-2 text-sm"><dt className="text-muted-foreground">Member Number</dt><dd>{context.member.memberNumber}</dd><dt className="text-muted-foreground">Employee Number</dt><dd>{context.member.employeeNumber}</dd><dt className="text-muted-foreground">Full Name</dt><dd>{context.member.fullName}</dd><dt className="text-muted-foreground">Office / Position</dt><dd>{context.member.officeName} · {context.member.position}</dd><dt className="text-muted-foreground">Membership Date</dt><dd>{context.member.membershipDate}</dd><dt className="text-muted-foreground">Status</dt><dd><Badge variant="secondary">{context.member.membershipStatus}</Badge> <Badge variant="outline">{context.member.approvalStatus ?? "Approved"}</Badge></dd></dl></div>
          <div className="rounded-lg border p-4"><h3 className="mb-3 flex items-center gap-2 font-medium"><Landmark className="size-4" /> Active Cash Assistance Loan</h3>{context.activeLoan ? <dl className="grid grid-cols-2 gap-2 text-sm"><dt className="text-muted-foreground">Loan Number</dt><dd>{context.activeLoan.loanNumber}</dd><dt className="text-muted-foreground">Status / Release</dt><dd>{context.activeLoan.status} · {context.activeLoan.releaseDate ?? "—"}</dd><dt className="text-muted-foreground">Principal</dt><dd>{formatCurrency(context.activeLoan.principalAmount)}</dd><dt className="text-muted-foreground">Outstanding Principal</dt><dd>{formatCurrency(context.activeLoan.outstandingPrincipal)}</dd><dt className="text-muted-foreground">Outstanding Interest</dt><dd>{formatCurrency(context.activeLoan.outstandingInterest)}</dd><dt className="font-medium">Remaining Balance</dt><dd className="font-medium">{formatCurrency(context.activeLoan.remainingBalance)}</dd><dt className="text-muted-foreground">Monthly Amortization</dt><dd>{formatCurrency(context.activeLoan.monthlyAmortization)}</dd></dl> : <p className="text-sm text-muted-foreground">No Active Cash Assistance Loan</p>}</div>
        </div>}
        <div className="mt-5 flex justify-between"><Button variant="outline" onClick={() => setStep(1)}>Back</Button><Button disabled={!validStep2} onClick={() => setStep(3)}>Continue</Button></div>
      </section>}

      {step === 3 && context && <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><ReceiptText className="size-5 text-primary" /> Step 3 · Payroll Deductions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[{ label: "Monthly Dues", value: monthlyDues, set: setMonthlyDues, disabled: !canOverride }, { label: "Cash Pabaon", value: cashPabaon, set: setCashPabaon, disabled: !canOverride }, { label: "Cash Assistance Loan Deduction", value: loanDeduction, set: setLoanDeduction, disabled: !context.activeLoan }].map((item) => <div key={item.label} className="rounded-xl border p-4"><Label>{item.label}</Label><div className="relative mt-3"><span className="absolute left-3 top-2 text-sm text-muted-foreground">₱</span><Input className="pl-7" type="number" min="0" step="0.01" value={item.value} disabled={item.disabled} onChange={(e) => item.set(Number(e.target.value))} /></div>{item.disabled && item.label !== "Cash Assistance Loan Deduction" && <p className="mt-2 text-xs text-muted-foreground">Requires payroll.manual.override</p>}</div>)}
        </div>
        <div className="mt-5 ml-auto max-w-md rounded-xl border border-primary/20 bg-primary/5 p-5"><h3 className="mb-3 flex items-center gap-2 font-semibold"><Banknote className="size-5 text-primary" /> Deduction Summary</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Monthly Dues</span><span>{formatCurrency(monthlyDues)}</span></div><div className="flex justify-between"><span>Cash Pabaon</span><span>{formatCurrency(cashPabaon)}</span></div><div className="flex justify-between"><span>Loan Deduction</span><span>{formatCurrency(loanDeduction)}</span></div><div className="mt-3 flex justify-between border-t pt-3 text-lg font-bold"><span>TOTAL</span><span>{formatCurrency(total)}</span></div></div></div>
        {draft?.status === "Posted" && <div className="mt-5 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-700"><CheckCircle2 className="size-5" /> Posted successfully as {draft.payrollReference}.</div>}
        <div className="mt-5 flex justify-start"><Button variant="outline" onClick={() => setStep(2)}>Back</Button></div>
      </section>}

      <ConfirmDialog open={showConfirm} onOpenChange={setShowConfirm} title="Confirm Payroll Posting" confirmLabel="Confirm Posting" confirmingLabel="Posting…" isLoading={isSaving} onConfirm={postPayroll}><div className="space-y-2 rounded-lg border p-4 text-sm"><p><strong>Payroll Period:</strong> {period}</p><p><strong>Member:</strong> {context?.member.fullName}</p><div className="border-t pt-2"><div className="flex justify-between"><span>Monthly Dues</span><span>{formatCurrency(monthlyDues)}</span></div><div className="flex justify-between"><span>Cash Pabaon</span><span>{formatCurrency(cashPabaon)}</span></div><div className="flex justify-between"><span>Loan Deduction</span><span>{formatCurrency(loanDeduction)}</span></div><div className="mt-2 flex justify-between border-t pt-2 font-bold"><span>TOTAL</span><span>{formatCurrency(total)}</span></div></div></div></ConfirmDialog>
    </div>
  )
}
