import * as React from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, Loader2, Save, User, Calendar, Coins, Receipt } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { MemberSelectionStep } from "@/components/shared/MemberSelectionStep"
import { MemberSummaryCard } from "@/components/shared/MemberSummaryCard"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { FormSkeleton } from "@/components/shared/loaders/FormSkeleton"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getMember } from "@/services/members.service"
import { getAllContributions, getContribution, hasExistingContribution, createContribution, updateContribution, defaultContributionAmountForType } from "@/services/contributions.service"
import { getMemberLoans } from "@/services/loans.service"
import { formatCurrency } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import type { Contribution, ContributionType, PaymentMethod } from "@/types"

const PAYMENT_METHODS: PaymentMethod[] = ["Payroll Deduction", "Cash", "Bank Transfer", "Check"]
function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

interface ContributionEntry {
  key: string
  contributionType: ContributionType
  contributionPeriod: string
  amount: number | undefined
  paymentMethod: PaymentMethod
  officialReceiptNumber: string
  payrollReference: string
  paymentDate: string
  remarks: string
}

let entryCounter = 0
function makeEntry(overrides?: Partial<ContributionEntry>): ContributionEntry {
  entryCounter += 1
  const contributionType = overrides?.contributionType ?? "Monthly Dues"
  return {
    key: `entry-${entryCounter}`,
    contributionType,
    contributionPeriod: currentPeriod(),
    amount: defaultContributionAmountForType(contributionType),
    paymentMethod: "Payroll Deduction",
    officialReceiptNumber: "",
    payrollReference: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    remarks: "",
    ...overrides,
  }
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

  React.useEffect(() => {
    const paramMemberId = searchParams.get("member")
    if (paramMemberId && paramMemberId !== memberId && !isEditMode) {
      setMemberId(paramMemberId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Edit mode operates on exactly one existing record — kept as flat fields.
  const [editPeriod, setEditPeriod] = React.useState("")
  const [editType, setEditType] = React.useState<ContributionType>("Monthly Dues")
  const [editAmount, setEditAmount] = React.useState<number>()
  const [editPaymentMethod, setEditPaymentMethod] = React.useState<PaymentMethod>("Payroll Deduction")
  const [editOfficialReceiptNumber, setEditOfficialReceiptNumber] = React.useState("")
  const [editPayrollReference, setEditPayrollReference] = React.useState("")
  const [editPaymentDate, setEditPaymentDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [editRemarks, setEditRemarks] = React.useState("")

  // Contribution types are fixed to Monthly Dues; Cash Pabaon belongs to deductions.
  const [entries, setEntries] = React.useState<ContributionEntry[]>(() => [makeEntry()])

  const [isSaving, setIsSaving] = React.useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false)
  const [successDialog, setSuccessDialog] = React.useState<{ created: Contribution[] } | null>(null)
  const [pendingAddAnother, setPendingAddAnother] = React.useState(false)

  React.useEffect(() => {
    if (!existing) return
    setMemberId(existing.memberId)
    setEditPeriod(existing.contributionPeriod)
    setEditType(existing.contributionType)
    setEditAmount(existing.amount)
    setEditPaymentMethod(existing.paymentMethod)
    setEditOfficialReceiptNumber(existing.officialReceiptNumber ?? "")
    setEditPayrollReference(existing.payrollReference ?? "")
    setEditPaymentDate(existing.paymentDate)
    setEditRemarks(existing.remarks ?? "")
  }, [existing])

  const { data: member } = useQuery({ queryKey: ["members", memberId], queryFn: () => getMember(memberId), enabled: !!memberId })

  const memberContributions = memberId ? getAllContributions().filter((c) => c.memberId === memberId && c.status === "Posted" && c.id !== id) : []
  const totalContributions = memberContributions.reduce((sum, c) => sum + c.amount, 0)
  const lastContribution = memberContributions.slice().sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))[0]
  const memberLoans = memberId ? getMemberLoans(memberId) : []
  const activeLoans = memberLoans.filter((l) => ["Active", "Overdue", "Released"].includes(l.status))
  const overdueLoans = memberLoans.filter((l) => l.status === "Overdue")
  const outstandingLoanBalance = activeLoans.reduce((sum, l) => sum + l.outstandingBalance, 0)

  // --- Edit mode duplicate/validity ---
  const isEditDuplicate =
    !!memberId &&
    !!editPeriod &&
    hasExistingContribution(memberId, editPeriod, editType) &&
    (existing?.contributionPeriod !== editPeriod || existing?.contributionType !== editType)
  const canSaveEdit = !!member && !!editPeriod && !!editAmount && editAmount > 0 && !!editPaymentDate && !isEditDuplicate

  // --- Create mode: per-entry duplicate check (against posted records AND other entries in this same form) ---
  function isEntryDuplicate(entry: ContributionEntry): boolean {
    if (!memberId || !entry.contributionPeriod) return false
    const dupWithinForm = entries.some(
      (e) => e.key !== entry.key && e.contributionPeriod === entry.contributionPeriod && e.contributionType === entry.contributionType
    )
    return dupWithinForm || hasExistingContribution(memberId, entry.contributionPeriod, entry.contributionType)
  }
  const entryDuplicates = entries.filter(isEntryDuplicate)
  const canSaveEntries =
    !!member &&
    entries.length > 0 &&
    entries.every((e) => !!e.contributionPeriod && !!e.amount && e.amount > 0 && !!e.paymentDate) &&
    entryDuplicates.length === 0

  const canSave = isEditMode ? canSaveEdit : canSaveEntries

  function updateEntry(key: string, patch: Partial<ContributionEntry>) {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)))
  }

  function resetForNewEntry() {
    setMemberId("")
    setEntries([makeEntry()])
  }

  async function handleSave(addAnother: boolean) {
    if (!member || !user) return

    setIsSaving(true)
    setPendingAddAnother(addAnother)
    try {
      if (isEditMode && id) {
        if (!editAmount) return
        const updated = await updateContribution(id, {
          contributionPeriod: editPeriod,
          contributionType: editType,
          amount: editAmount,
          paymentMethod: editPaymentMethod,
          officialReceiptNumber: editOfficialReceiptNumber || undefined,
          payrollReference: editPayrollReference || undefined,
          paymentDate: editPaymentDate,
          remarks: editRemarks || undefined,
        })
        toast.success("Contribution record updated.")
        navigate(`/contributions/${updated.id}`)
        return
      }

      const created: Contribution[] = []
      for (const entry of entries) {
        if (!entry.amount) continue
        const result = await createContribution({
          memberId: member.id,
          memberNumber: member.memberNumber,
          memberName: member.fullName,
          officeName: member.officeName,
          contributionPeriod: entry.contributionPeriod,
          contributionType: entry.contributionType,
          amount: entry.amount,
          paymentMethod: entry.paymentMethod,
          officialReceiptNumber: entry.officialReceiptNumber || undefined,
          payrollReference: entry.payrollReference || undefined,
          paymentDate: entry.paymentDate,
          remarks: entry.remarks || undefined,
          encodedBy: user.fullName,
        })
        created.push(result)
      }

      toast.success(
        created.length > 1
          ? `${created.length} contributions recorded successfully.`
          : `Contribution ${created[0]?.referenceNumber} recorded successfully.`
      )
      if (addAnother) {
        resetForNewEntry()
      } else {
        setSuccessDialog({ created })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save the contribution record(s).")
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditMode && isLoadingExisting) {
    return <FormSkeleton fields={["text", "date", "select", "select"]} columns={2} />
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
    <div className="space-y-6 pb-20 mx-auto px-4 md:px-0">
      <PageHeader
        title={isEditMode ? "Edit Contribution" : "Add Contribution"}
        description={
          isEditMode
            ? "Update the payment details for this contribution record."
            : "Encode a Monthly Dues contribution payment for a member."
        }
      />

      {/* Step 1: Member Selection */}
      <FormSection 
        title={
          <span className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-background border border-border/60 shadow-xs">
              <User className="size-4 text-primary" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">Step 1 · Select Member</span>
          </span>
        }
      >
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
              /* Styled KPI-like Sub-card for last contribution status */
              <div className="rounded-xl border border-border/40 bg-muted/20 p-4 text-xs shadow-inner flex items-center gap-3">
                <div className="p-2 rounded-lg bg-background border border-border/60">
                  <Calendar className="size-4 text-primary animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Last Recorded Contribution</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {lastContribution 
                      ? `${lastContribution.contributionType} · ${lastContribution.contributionPeriod} · ${formatCurrency(lastContribution.amount)}` 
                      : "No contributions on record"}
                  </p>
                </div>
              </div>
            }
          />
        )}
      </FormSection>

      {/* Step 2: Contribution details form (EDIT MODE) */}
      {member && isEditMode && (
        <FormSection 
          title={
            <span className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-background border border-border/60 shadow-xs">
                <Coins className="size-4 text-primary" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">Step 2 · Contribution Details</span>
            </span>
          }
        >
          {isEditDuplicate && (
            <AlertBanner
              tone="danger"
              title="Duplicate contribution warning"
              description={`A posted ${editType} contribution already exists for ${member.fullName} for period ${editPeriod}. Change the period, type, or amount to proceed.`}
              className="mb-4 animate-in fade-in slide-in-from-top-2 duration-200"
            />
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Contribution Period <span className="text-destructive font-bold">*</span>
              </Label>
              <Input type="month" value={editPeriod} onChange={(e) => setEditPeriod(e.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Amount <span className="text-destructive font-bold">*</span>
              </Label>
              <CurrencyInput value={editAmount} onChange={setEditAmount} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Payment Method</Label>
              <CommandSelect
                className="w-full h-10 text-sm bg-background border-border hover:bg-accent/40 transition-all"
                value={editPaymentMethod}
                onValueChange={(v) => setEditPaymentMethod((v ?? "Payroll Deduction") as PaymentMethod)}
                options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
                hideSearch
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Payment Date <span className="text-destructive font-bold">*</span>
              </Label>
              <Input type="date" value={editPaymentDate} onChange={(e) => setEditPaymentDate(e.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Official Receipt Number</Label>
              <Input placeholder="e.g. OR-2026-004521" value={editOfficialReceiptNumber} onChange={(e) => setEditOfficialReceiptNumber(e.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Payroll Reference</Label>
              <Input placeholder="e.g. PR-2026-07-001" value={editPayrollReference} onChange={(e) => setEditPayrollReference(e.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Remarks</Label>
              <Textarea rows={2} placeholder="Additional notes about this contribution (optional)" value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} className="text-sm bg-background resize-none" />
            </div>
          </div>
        </FormSection>
      )}

      {/* Step 2: Contribution details form (CREATE MODE - Ledger style cards) */}
      {member && !isEditMode && (
        <FormSection
          title={
            <span className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-background border border-border/60 shadow-xs">
                <Receipt className="size-4 text-primary" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">Step 2 · Contribution Details</span>
            </span>
          }
          description="Contribution type is automatically recorded as Monthly Dues. Cash Pabaon is configured and posted under Deduction Types."
        >
          <div className="space-y-6">
            {entries.map((entry, index) => {
              const duplicate = isEntryDuplicate(entry)
              return (
                <div 
                  key={entry.key} 
                  className={cn(
                    "rounded-2xl border bg-muted/5 p-5 shadow-sm space-y-4 transition-all duration-200 hover:bg-muted/10",
                    duplicate ? "border-destructive/30 bg-destructive/[0.01]" : "border-border/60"
                  )}
                >
                  <div className="border-b border-border/45 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {index + 1}
                      </span>
                      <p className="text-xs font-bold text-foreground/95 tracking-wide uppercase">Monthly Dues</p>
                    </div>
                  </div>

                  {duplicate && (
                    <AlertBanner
                      tone="danger"
                      title="Duplicate contribution warning"
                      description={`A posted ${entry.contributionType} contribution already exists for ${member.fullName} for period ${entry.contributionPeriod} (or it is repeated in another entry below). Change the period or type before saving.`}
                      className="animate-in fade-in slide-in-from-top-2 duration-200"
                    />
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        Contribution Period <span className="text-destructive font-bold">*</span>
                      </Label>
                      <Input type="month" value={entry.contributionPeriod} onChange={(e) => updateEntry(entry.key, { contributionPeriod: e.target.value })} className="h-10 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        Amount <span className="text-destructive font-bold">*</span>
                      </Label>
                      <CurrencyInput value={entry.amount} onChange={(v) => updateEntry(entry.key, { amount: v })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Payment Method</Label>
                      <CommandSelect
                        className="w-full h-10 text-sm bg-background border-border hover:bg-accent/45 transition-all"
                        value={entry.paymentMethod}
                        onValueChange={(v) => updateEntry(entry.key, { paymentMethod: (v ?? "Payroll Deduction") as PaymentMethod })}
                        options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
                        hideSearch
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        Payment Date <span className="text-destructive font-bold">*</span>
                      </Label>
                      <Input type="date" value={entry.paymentDate} onChange={(e) => updateEntry(entry.key, { paymentDate: e.target.value })} className="h-10 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Official Receipt Number</Label>
                      <Input placeholder="e.g. OR-2026-004521" value={entry.officialReceiptNumber} onChange={(e) => updateEntry(entry.key, { officialReceiptNumber: e.target.value })} className="h-10 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Payroll Reference</Label>
                      <Input placeholder="e.g. PR-2026-07-001" value={entry.payrollReference} onChange={(e) => updateEntry(entry.key, { payrollReference: e.target.value })} className="h-10 text-sm" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Remarks</Label>
                      <Textarea rows={2} placeholder="Additional notes about this contribution (optional)" value={entry.remarks} onChange={(e) => updateEntry(entry.key, { remarks: e.target.value })} className="text-sm bg-background resize-none" />
                    </div>
                  </div>
                </div>
              )
            })}

            <p className="text-[11px] text-muted-foreground font-medium italic pl-1">
              * A reference number (e.g. GCGEA-CON-2026-000001) will be generated automatically per entry when you save.
            </p>
          </div>
        </FormSection>
      )}

      {/* Sticky Action Footer */}
      <div className="sticky bottom-4 z-15 flex flex-wrap items-center justify-between gap-3 border border-border/65 bg-background/80 backdrop-blur-md px-6 py-4 shadow-lg transition-all duration-200">
        <Button variant="outline" onClick={() => setShowCancelConfirm(true)} className="h-9 text-xs">Cancel</Button>
        <div className="flex flex-wrap gap-2">
          {!isEditMode && (
            <Button variant="secondary" onClick={() => handleSave(true)} disabled={!canSave || isSaving} className="h-9 text-xs gap-1.5 active:scale-97 transition-all">
              {isSaving && pendingAddAnother ? <Loader2 className="animate-spin size-3.5" /> : <Save className="size-3.5" />} Save &amp; Add Another
            </Button>
          )}
          <Button onClick={() => handleSave(false)} disabled={!canSave || isSaving} className="h-9 text-xs gap-1.5 shadow-sm active:scale-97 transition-all">
            {isSaving && !pendingAddAnother ? <Loader2 className="animate-spin size-3.5" /> : <Save className="size-3.5" />} {isEditMode ? "Save Changes" : entries.length > 1 ? `Save ${entries.length} Entries` : "Save"}
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
            <DialogTitle className="text-center text-lg font-bold">
              {successDialog && successDialog.created.length > 1 ? "Contributions Saved" : "Contribution Saved"}
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              {successDialog?.created.map((c) => (
                <span key={c.id} className="block mt-0.5">
                  <span className="font-bold text-foreground">{c.referenceNumber}</span> ({c.contributionType})
                </span>
              ))}
              {" "}has been recorded successfully.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col mt-4">
            {successDialog && successDialog.created.length === 1 && (
              <Button className="w-full h-9 text-xs shadow-sm" onClick={() => navigate(`/contributions/${successDialog.created[0].id}`)}>
                View Contribution Details
              </Button>
            )}
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