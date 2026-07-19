import * as React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { MemberSelectionStep } from "@/components/shared/MemberSelectionStep"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getMember } from "@/services/members.service"
import { listAllLoans } from "@/services/loans.service"
import { createLoanPayment } from "@/services/loan-payments.service"
import { formatCurrency } from "@/utils/format"
import type { PaymentMethod } from "@/types"

const PAYMENT_METHODS: PaymentMethod[] = ["Payroll Deduction", "Cash", "Bank Transfer", "Check"]

export default function CreateLoanPaymentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [memberId, setMemberId] = React.useState(() => searchParams.get("member") ?? "")
  const [loanId, setLoanId] = React.useState("")
  const [paymentDate, setPaymentDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [amountPaid, setAmountPaid] = React.useState<number>()
  const [penalty, setPenalty] = React.useState<number>(0)
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("Payroll Deduction")
  const [officialReceiptNumber, setOfficialReceiptNumber] = React.useState("")
  const [payrollReference, setPayrollReference] = React.useState("")
  const [remarks, setRemarks] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  const { data: member } = useQuery({ queryKey: ["members", memberId], queryFn: () => getMember(memberId), enabled: !!memberId })
  const { data: loans = [] } = useQuery({ queryKey: ["loans", "all"], queryFn: listAllLoans })
  const activeLoans = loans.filter((loan) => loan.memberId === memberId && ["Released", "Active", "Overdue", "Restructured"].includes(loan.status) && loan.outstandingBalance > 0)
  const selectedLoan = activeLoans.find((loan) => loan.id === loanId)
  const totalOutstanding = activeLoans.reduce((sum, loan) => sum + loan.outstandingBalance, 0)
  const canSave = !!member && !!selectedLoan && !!amountPaid && amountPaid > 0 && amountPaid - penalty > 0 && amountPaid - penalty <= selectedLoan.outstandingBalance && !!paymentDate && !!officialReceiptNumber.trim()

  function selectMember(id: string) {
    setMemberId(id)
    setLoanId("")
    setAmountPaid(undefined)
  }

  async function handleSave() {
    if (!canSave || !amountPaid) return
    setIsSaving(true)
    try {
      const payment = await createLoanPayment({ memberId, loanApplicationId: loanId, paymentDate, amountPaid, penalty, paymentMethod, officialReceiptNumber: officialReceiptNumber.trim(), payrollReference: payrollReference.trim() || undefined, remarks: remarks.trim() || undefined })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["loan-payments"] }),
        queryClient.invalidateQueries({ queryKey: ["loans"] }),
      ])
      toast.success(`Payment ${payment.paymentReferenceNumber} recorded successfully.`)
      navigate("/loan-payments")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to record the loan payment.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5 pb-16">
      <PageHeader title="Record Payment" description="Post a payment against a member's active loan account." />
      <FormSection title="Step 1 · Select Member">
        <MemberSelectionStep selectedMemberId={memberId || undefined} member={member} onSelect={selectMember} totalContributions={0} outstandingLoanBalance={totalOutstanding} activeLoanCount={activeLoans.length} overdueLoanCount={activeLoans.filter((loan) => loan.status === "Overdue").length} />
      </FormSection>

      {member && (
        <FormSection title="Step 2 · Payment Details">
          {activeLoans.length === 0 && <AlertBanner tone="warning" title="No payable loan found" description="This member has no active loan with an outstanding balance." className="mb-4" />}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Loan Account <span className="text-destructive">*</span></Label>
              <Select value={loanId} onValueChange={(value) => { setLoanId(value ?? ""); const loan = activeLoans.find((item) => item.id === value); setAmountPaid(loan ? Math.min(loan.monthlyAmortization, loan.outstandingBalance) : undefined) }} disabled={!activeLoans.length}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select an active loan" /></SelectTrigger>
                <SelectContent>{activeLoans.map((loan) => <SelectItem key={loan.id} value={loan.id}>{loan.applicationNumber} · {loan.loanTypeName} · Balance {formatCurrency(loan.outstandingBalance)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Payment Date <span className="text-destructive">*</span></Label><Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></div>
            <div className="space-y-1.5"><Label>Amount Paid <span className="text-destructive">*</span></Label><CurrencyInput value={amountPaid} onChange={setAmountPaid} /></div>
            <div className="space-y-1.5"><Label>Penalty</Label><CurrencyInput value={penalty} onChange={(value) => setPenalty(value ?? 0)} /></div>
            <div className="space-y-1.5"><Label>Payment Method</Label><Select value={paymentMethod} onValueChange={(value) => setPaymentMethod((value ?? "Payroll Deduction") as PaymentMethod)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((method) => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Official Receipt Number <span className="text-destructive">*</span></Label><Input value={officialReceiptNumber} onChange={(event) => setOfficialReceiptNumber(event.target.value)} placeholder="e.g. OR-2026-000123" /></div>
            <div className="space-y-1.5"><Label>Payroll Reference</Label><Input value={payrollReference} onChange={(event) => setPayrollReference(event.target.value)} placeholder="Optional" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Remarks</Label><Textarea rows={2} value={remarks} onChange={(event) => setRemarks(event.target.value)} /></div>
          </div>
          {selectedLoan && amountPaid !== undefined && amountPaid - penalty > selectedLoan.outstandingBalance && <p className="mt-3 text-sm font-medium text-destructive">Payment excluding penalty cannot exceed the outstanding balance of {formatCurrency(selectedLoan.outstandingBalance)}.</p>}
        </FormSection>
      )}

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-border bg-card px-4 py-3 sm:mx-0 sm:rounded-xl sm:border sm:shadow-sm">
        <Button variant="outline" onClick={() => navigate(-1)} disabled={isSaving}>Cancel</Button>
        <Button onClick={handleSave} disabled={!canSave || isSaving} aria-busy={isSaving}>{isSaving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}{isSaving ? "Saving…" : "Record Payment"}</Button>
      </div>
    </div>
  )
}
