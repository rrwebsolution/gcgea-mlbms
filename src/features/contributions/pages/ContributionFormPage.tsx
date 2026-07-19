import * as React from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { MemberSelectionStep } from "@/components/shared/MemberSelectionStep"
import { MemberSummaryCard } from "@/components/shared/MemberSummaryCard"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getMember } from "@/services/members.service"
import { getAllContributions, getContribution, hasExistingContribution, createContribution, updateContribution } from "@/services/contributions.service"
import { getMemberLoans } from "@/services/loans.service"
import { formatCurrency } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"
import type { PaymentMethod } from "@/types"

const PAYMENT_METHODS: PaymentMethod[] = ["Payroll Deduction", "Cash", "Bank Transfer", "Check"]

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export default function ContributionFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const isEditMode = !!id

  const { data: existing, isLoading: isLoadingExisting } = useQuery({
    queryKey: ["contributions", id],
    queryFn: () => getContribution(id!),
    enabled: isEditMode,
  })

  useBreadcrumbExtra(isEditMode ? existing?.referenceNumber : undefined)

  const [memberId, setMemberId] = React.useState(searchParams.get("member") ?? "")
  const [contributionPeriod, setContributionPeriod] = React.useState(currentPeriod())
  const [amount, setAmount] = React.useState<number>()
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("Payroll Deduction")
  const [officialReceiptNumber, setOfficialReceiptNumber] = React.useState("")
  const [payrollReference, setPayrollReference] = React.useState("")
  const [paymentDate, setPaymentDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [remarks, setRemarks] = React.useState("")

  const [isSaving, setIsSaving] = React.useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false)
  const [successDialog, setSuccessDialog] = React.useState<{ id: string; referenceNumber: string } | null>(null)
  const [pendingAddAnother, setPendingAddAnother] = React.useState(false)

  React.useEffect(() => {
    if (!existing) return
    setMemberId(existing.memberId)
    setContributionPeriod(existing.contributionPeriod)
    setAmount(existing.amount)
    setPaymentMethod(existing.paymentMethod)
    setOfficialReceiptNumber(existing.officialReceiptNumber ?? "")
    setPayrollReference(existing.payrollReference ?? "")
    setPaymentDate(existing.paymentDate)
    setRemarks(existing.remarks ?? "")
  }, [existing])

  const { data: member } = useQuery({ queryKey: ["members", memberId], queryFn: () => getMember(memberId), enabled: !!memberId })

  const memberContributions = memberId ? getAllContributions().filter((c) => c.memberId === memberId && c.status === "Posted" && c.id !== id) : []
  const totalContributions = memberContributions.reduce((sum, c) => sum + c.amount, 0)
  const lastContribution = memberContributions.slice().sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))[0]
  const existingForPeriod = memberContributions.find((c) => c.contributionPeriod === contributionPeriod)
  const memberLoans = memberId ? getMemberLoans(memberId) : []
  const activeLoans = memberLoans.filter((l) => ["Active", "Overdue", "Released"].includes(l.status))
  const overdueLoans = memberLoans.filter((l) => l.status === "Overdue")
  const outstandingLoanBalance = activeLoans.reduce((sum, l) => sum + l.outstandingBalance, 0)

  const isDuplicate = !!memberId && !!contributionPeriod && hasExistingContribution(memberId, contributionPeriod) && (!isEditMode || existing?.contributionPeriod !== contributionPeriod)

  const canSave = !!member && !!contributionPeriod && !!amount && amount > 0 && !!paymentDate && !isDuplicate

  function resetForNewEntry() {
    setMemberId("")
    setContributionPeriod(currentPeriod())
    setAmount(undefined)
    setPaymentMethod("Payroll Deduction")
    setOfficialReceiptNumber("")
    setPayrollReference("")
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setRemarks("")
  }

  async function handleSave(addAnother: boolean) {
    if (!member || !amount || !user) return
    if (isDuplicate) {
      toast.error(`A posted contribution already exists for ${member.fullName} for period ${contributionPeriod}. Change the period or amount before saving.`)
      return
    }
    setIsSaving(true)
    setPendingAddAnother(addAnother)
    try {
      if (isEditMode && id) {
        const updated = await updateContribution(id, {
          contributionPeriod,
          amount,
          paymentMethod,
          officialReceiptNumber: officialReceiptNumber || undefined,
          payrollReference: payrollReference || undefined,
          paymentDate,
          remarks: remarks || undefined,
        })
        toast.success("Contribution record updated.")
        navigate(`/contributions/${updated.id}`)
        return
      }

      const created = await createContribution({
        memberId: member.id,
        memberNumber: member.memberNumber,
        memberName: member.fullName,
        officeName: member.officeName,
        contributionPeriod,
        amount,
        paymentMethod,
        officialReceiptNumber: officialReceiptNumber || undefined,
        payrollReference: payrollReference || undefined,
        paymentDate,
        remarks: remarks || undefined,
        encodedBy: user.fullName,
      })
      toast.success(`Contribution ${created.referenceNumber} recorded successfully.`)
      if (addAnother) {
        resetForNewEntry()
      } else {
        setSuccessDialog({ id: created.id, referenceNumber: created.referenceNumber })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save the contribution record.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditMode && isLoadingExisting) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center animate-pulse" role="status">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading contribution record</span>
      </div>
    )
  }
  if (isEditMode && !isLoadingExisting && !existing) {
    return <EmptyState icon={AlertTriangle} title="Contribution record not found" description="This record may have been removed." />
  }
  if (isEditMode && existing?.status === "Voided") {
    return (
      <AlertBanner
        tone="warning"
        title="This contribution has been voided"
        description="Voided records cannot be edited. View the record to see its void reason and history."
      />
    )
  }

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title={isEditMode ? "Edit Contribution" : "Add Contribution"}
        description={
          isEditMode
            ? "Update the payment details for this contribution record."
            : "Encode a single contribution payment for a member."
        }
      />

      {/* Step 1: Member Selection */}
      <FormSection title="Step 1 · Select Member">
        {isEditMode && member ? (
          <MemberSummaryCard
            member={member}
            totalContributions={totalContributions}
            outstandingLoanBalance={outstandingLoanBalance}
            activeLoanCount={activeLoans.length}
            overdueLoanCount={overdueLoans.length}
          />
        ) : (
          <MemberSelectionStep
            selectedMemberId={memberId || undefined}
            member={member}
            onSelect={setMemberId}
            totalContributions={totalContributions}
            outstandingLoanBalance={outstandingLoanBalance}
            activeLoanCount={activeLoans.length}
            overdueLoanCount={overdueLoans.length}
            extra={
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-border/40 bg-muted/10 p-4 text-xs sm:grid-cols-2 shadow-inner">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Last Contribution</p>
                  <p className="font-semibold text-foreground">
                    {lastContribution ? `${lastContribution.contributionPeriod} · ${formatCurrency(lastContribution.amount)}` : "No contributions on record"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Existing Contribution Selected Period ({contributionPeriod})</p>
                  <p className={`font-semibold ${existingForPeriod ? "text-amber-500" : "text-foreground"}`}>
                    {existingForPeriod ? `${formatCurrency(existingForPeriod.amount)} · already posted` : "None"}
                  </p>
                </div>
              </div>
            }
          />
        )}
      </FormSection>

      {/* Step 2: Contribution details form */}
      {member && (
        <FormSection title="Step 2 · Contribution Details">
          {isDuplicate && (
            <AlertBanner
              tone="danger"
              title="Duplicate contribution warning"
              description={`A posted contribution already exists for ${member.fullName} for period ${contributionPeriod}. This record cannot be saved until you change the period or amount.`}
              className="mb-4 animate-in fade-in slide-in-from-top-2 duration-200"
            />
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
                Contribution Period <span className="text-destructive font-bold">*</span>
              </Label>
              <Input type="month" value={contributionPeriod} onChange={(e) => setContributionPeriod(e.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
                Amount <span className="text-destructive font-bold">*</span>
              </Label>
              <CurrencyInput value={amount} onChange={setAmount} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod((v ?? "Payroll Deduction") as PaymentMethod)}>
                <SelectTrigger className="w-full h-10 text-sm bg-background border-border/80 hover:bg-accent/40 transition-all"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
                Payment Date <span className="text-destructive font-bold">*</span>
              </Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">Official Receipt Number</Label>
              <Input placeholder="e.g. OR-2026-004521" value={officialReceiptNumber} onChange={(e) => setOfficialReceiptNumber(e.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">Payroll Reference</Label>
              <Input placeholder="e.g. PR-2026-07-001" value={payrollReference} onChange={(e) => setPayrollReference(e.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">Remarks</Label>
              <Textarea rows={2} placeholder="Additional notes about this contribution (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="text-sm bg-background" />
            </div>
          </div>
          {!isEditMode && (
            <p className="mt-4 text-[11px] text-muted-foreground font-medium italic">
              * A reference number (e.g. GCGEA-CON-2026-000001) will be generated automatically when you save.
            </p>
          )}
        </FormSection>
      )}

      {/* Action tray */}
      <div className="sticky bottom-0 -mx-4 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/85 bg-background/80 backdrop-blur-md px-6 py-4 sm:mx-0 sm:rounded-xl sm:border sm:shadow-lg transition-all">
        <Button variant="outline" onClick={() => setShowCancelConfirm(true)} className="h-9 text-xs">Cancel</Button>
        <div className="flex flex-wrap gap-2">
          {!isEditMode && (
            <Button variant="secondary" onClick={() => handleSave(true)} disabled={!canSave || isSaving} className="h-9 text-xs gap-1.5 active:scale-97 transition-all">
              {isSaving && pendingAddAnother ? <Loader2 className="animate-spin size-3.5" /> : <Save className="size-3.5" />} Save & Add Another
            </Button>
          )}
          <Button onClick={() => handleSave(false)} disabled={!canSave || isSaving} className="h-9 text-xs gap-1.5 shadow-sm active:scale-97 transition-all">
            {isSaving && !pendingAddAnother ? <Loader2 className="animate-spin size-3.5" /> : <Save className="size-3.5" />} {isEditMode ? "Save Changes" : "Save"}
          </Button>
        </div>
      </div>

      {/* Discard changes dialog */}
      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Discard this contribution entry?"
        description="Any information entered so far will be lost."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setShowCancelConfirm(false)
          navigate("/contributions")
        }}
      />

      {/* Success Dialog overlay */}
      <Dialog open={!!successDialog} onOpenChange={(open) => !open && setSuccessDialog(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-6">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">Contribution Saved</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Reference <span className="font-bold text-foreground">{successDialog?.referenceNumber}</span> has been recorded successfully.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col mt-4">
            <Button className="w-full h-9 text-xs shadow-sm" onClick={() => successDialog && navigate(`/contributions/${successDialog.id}`)}>
              View Contribution Details
            </Button>
            <Button variant="outline" className="w-full h-9 text-xs" onClick={() => { setSuccessDialog(null); resetForNewEntry() }}>
              Add Another Contribution
            </Button>
            <Button variant="ghost" className="w-full h-9 text-xs text-muted-foreground" onClick={() => navigate("/contributions")}>
              Back to Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}