import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Banknote,
  CheckSquare,
  CalendarDays,
  Wallet,
  Landmark,
  PiggyBank,
  Calculator,
  Clock,
  DollarSign,
  ShieldCheck,
  RotateCw,
  Printer,
  User,
  Wallet2,
  FileText,
} from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ApprovalTimeline } from "@/components/shared/ApprovalTimeline"
import { ReasonDialog } from "@/components/shared/ReasonDialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { EmptyState } from "@/components/shared/EmptyState"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { EligibilityChecklist, type EligibilityResult } from "@/components/shared/EligibilityChecklist"
import { DataTable } from "@/components/shared/DataTable"
import { DocumentCard } from "@/components/shared/DocumentCard"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LoanReleaseDialog } from "@/features/loans/components/LoanReleaseDialog"
import { useAuth } from "@/contexts/AuthContext"
import { getMember, approveMemberRegistration, rejectMemberRegistration } from "@/services/members.service"
import {
  getLoan,
  getLoanSchedule,
  reviewLoan,
  approveLoan,
  rejectLoan,
  returnLoanForRevision,
  releaseLoan,
  type ReleaseLoanInput,
} from "@/services/loans.service"
import {
  getBenefit,
  reviewBenefit,
  approveBenefit,
  rejectBenefit,
  returnBenefitForRevision,
  releaseBenefit,
} from "@/services/benefits.service"
import { actOnApproval, getApprovalHistory } from "@/services/approvals.service"
import { getAnnualBudgetById } from "@/services/annual-budgets.service"
import { getDisbursement } from "@/services/disbursements.service"
import { getSettings } from "@/services/settings.service"
import { listAllContributions } from "@/services/contributions.service"
import { listAllDeductions } from "@/services/deductions.service"
import { listDeductionTypes } from "@/services/deduction-types.service"
import { LOAN_STATUS_TONE, BENEFIT_STATUS_TONE, AMORTIZATION_STATUS_TONE, type StatusTone } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { CASH_PABAON_PROGRAM_NAME } from "@/utils/eligibility"
import { cn } from "@/lib/utils"
import type { AmortizationEntry, ApprovalSubjectType, BenefitApplication, LoanApplication, Member } from "@/types"

export default function ApprovalDetailPage() {
  const params = useParams<{ subjectType: string; id: string }>()
  const type = (params.subjectType ?? "loans") as ApprovalSubjectType
  const id = params.id ?? ""
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()

  const { data: loan } = useQuery({ queryKey: ["loans", id], queryFn: () => getLoan(id), enabled: type === "loans" && Boolean(id) })
  const { data: benefit } = useQuery({ queryKey: ["benefits", id], queryFn: () => getBenefit(id), enabled: type === "benefits" && Boolean(id) })
  const { data: member } = useQuery({ queryKey: ["members", id], queryFn: () => getMember(id), enabled: type === "members" && Boolean(id) })
  const { data: loanMember } = useQuery({
    queryKey: ["members", loan?.memberId],
    queryFn: () => getMember(loan!.memberId),
    enabled: type === "loans" && Boolean(loan?.memberId),
  })
  const { data: benefitMember } = useQuery({
    queryKey: ["members", benefit?.memberId],
    queryFn: () => getMember(benefit!.memberId),
    enabled: type === "benefits" && Boolean(benefit?.memberId),
  })
  const { data: loanSchedule = [], isLoading: isLoadingLoanSchedule } = useQuery({
    queryKey: ["loans", id, "schedule"],
    queryFn: () => getLoanSchedule(id),
    enabled: type === "loans" && Boolean(id),
  })
  const isCashPabaonBenefit = type === "benefits" && benefit?.benefitTypeName === CASH_PABAON_PROGRAM_NAME
  const { data: allContributions = [] } = useQuery({ queryKey: ["contributions", "all"], queryFn: listAllContributions, enabled: isCashPabaonBenefit })
  const { data: allDeductions = [] } = useQuery({ queryKey: ["deductions", "all"], queryFn: listAllDeductions, enabled: isCashPabaonBenefit })
  const { data: deductionTypes = [] } = useQuery({ queryKey: ["deduction-types"], queryFn: listDeductionTypes, enabled: isCashPabaonBenefit })
  const pabaonDeductionType = deductionTypes.find((deductionType) => deductionType.code.toLowerCase() === "pabaon")
  // Cash Pabaon Program benefit payout is net of what the member already contributed into
  // Cash Pabaon over their membership — the association only actually disburses the
  // difference. Same period-based de-dup as the Contribution Snapshot on the application
  // form (a payroll-deducted month is auto-mirrored into a matching Contribution record,
  // so summing both ledgers as-is would double-count it).
  const memberPosted = allContributions.filter((contribution) => contribution.memberId === benefit?.memberId && contribution.status === "Posted")
  const memberDirectPabaon = memberPosted.filter((contribution) => contribution.contributionType === "Cash Pabaon")
  const memberPabaonDeductions = allDeductions.filter((deduction) =>
    deduction.memberId === benefit?.memberId
    && deduction.status === "Posted"
    && (deduction.deductionTypeId === pabaonDeductionType?.id || deduction.deductionTypeCode?.toLowerCase() === "pabaon")
  )
  const pabaonPeriodsWithContribution = new Set(memberDirectPabaon.map((contribution) => contribution.contributionPeriod))
  const totalCashPabaonContributed = memberDirectPabaon.reduce((sum, contribution) => sum + contribution.amount, 0)
    + memberPabaonDeductions
        .filter((deduction) => !pabaonPeriodsWithContribution.has(deduction.period))
        .reduce((sum, deduction) => sum + deduction.amount, 0)
  const benefitApprovedAmount = benefit?.approvedAmount ?? benefit?.requestedAmount ?? 0
  const defaultReleaseAmount = isCashPabaonBenefit
    ? Math.max(0, benefitApprovedAmount - totalCashPabaonContributed)
    : benefitApprovedAmount
  const { data: annualBudget } = useQuery({ queryKey: ["annual-budgets", "id", id], queryFn: () => getAnnualBudgetById(id), enabled: type === "annual-budgets" && Boolean(id) })
  const { data: disbursement } = useQuery({ queryKey: ["disbursements", id], queryFn: () => getDisbursement(id), enabled: type === "disbursements" && Boolean(id) })
  const { data: history = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["approvals", type, id, "history"],
    queryFn: () => getApprovalHistory(type, id),
    enabled: Boolean(id),
  })

  const [rejectOpen, setRejectOpen] = React.useState(false)
  const [returnOpen, setReturnOpen] = React.useState(false)
  const [releaseOpen, setReleaseOpen] = React.useState(false)
  const [releaseRemarks, setReleaseRemarks] = React.useState("")
  const [releaseAmount, setReleaseAmount] = React.useState<number>()

  React.useEffect(() => {
    if (releaseOpen) setReleaseAmount(defaultReleaseAmount)
  }, [releaseOpen, defaultReleaseAmount])

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: [type, id] })
    if (type === "annual-budgets") {
      queryClient.invalidateQueries({ queryKey: ["annual-budgets"] })
    }
    queryClient.invalidateQueries({ queryKey: ["approvals", type, id, "history"] })
    queryClient.invalidateQueries({ queryKey: ["my-approvals"] })
  }

  function handleError(err: unknown, fallback: string) {
    toast.error(err instanceof Error ? err.message : fallback)
  }

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (type === "loans") await reviewLoan(id)
      else await reviewBenefit(id)
    },
    onSuccess: () => { toast.success("Marked as reviewed."); invalidate() },
    onError: (err) => handleError(err, "Unable to review this item."),
  })

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (type === "loans") await approveLoan(id)
      else if (type === "benefits") await approveBenefit(id)
      else if (type === "annual-budgets" || type === "disbursements") await actOnApproval(type, id, { action: "approve" })
      else await approveMemberRegistration(id)
    },
    onSuccess: () => { toast.success("Approved."); invalidate() },
    onError: (err) => handleError(err, "Unable to approve this item."),
  })

  const rejectMutation = useMutation({
    mutationFn: async (remarks: string) => {
      if (type === "loans") await rejectLoan(id, remarks)
      else if (type === "benefits") await rejectBenefit(id, remarks)
      else if (type === "annual-budgets" || type === "disbursements") await actOnApproval(type, id, { action: "reject", remarks })
      else await rejectMemberRegistration(id, remarks)
    },
    onSuccess: () => { toast.success("Rejected."); setRejectOpen(false); invalidate() },
    onError: (err) => handleError(err, "Unable to reject this item."),
  })

  const returnMutation = useMutation({
    mutationFn: async (remarks: string) => {
      if (type === "loans") await returnLoanForRevision(id, remarks)
      else if (type === "benefits") await returnBenefitForRevision(id, remarks)
      else await actOnApproval(type, id, { action: "return", remarks })
    },
    onSuccess: () => { toast.success("Returned for revision."); setReturnOpen(false); invalidate() },
    onError: (err) => handleError(err, "Unable to return this item."),
  })

  const releaseLoanMutation = useMutation({
    mutationFn: (input: ReleaseLoanInput) => releaseLoan(id, input),
    onSuccess: () => { toast.success("Loan released."); setReleaseOpen(false); invalidate() },
    onError: (err) => handleError(err, "Unable to release this loan."),
  })

  const releaseBenefitMutation = useMutation({
    mutationFn: () => releaseBenefit(id, releaseRemarks || undefined, releaseAmount),
    onSuccess: () => { toast.success("Benefit released."); setReleaseOpen(false); setReleaseRemarks(""); invalidate() },
    onError: (err) => handleError(err, "Unable to release this benefit."),
  })

  if (type === "loans") {
    if (!loan) return <ProfileSkeleton cards={3} />

    const canReview = loan.status === "Under Review" && hasPermission("loans.review")
    const canApprove = loan.status === "For Approval" && hasPermission("loans.approve")
    const canRelease = loan.status === "Approved" && hasPermission("loans.release")
    // Reject/Return are only valid at the loan's *current* stage — the backend authorizes
    // both against that stage's own permission (loans.review while Under Review, loans.approve
    // while For Approval), not a separate loans.reject permission. Matching that here means a
    // Loan Officer stops seeing these once the loan moves past their stage to Approving Officer.
    const canReject = canReview || canApprove
    const canReturn = canReview || canApprove
    // Print/Save as PDF only makes sense once the Approving Officer has acted — before that
    // the application isn't final and there's nothing official to hand out yet.
    const hasReachedApproval = ["Approved", "Released", "Active", "Fully Paid", "Overdue", "Restructured"].includes(loan.status)

    return (
      <div className="space-y-6 pb-12">
        <div className="print:hidden space-y-6">
          <PageHeader
            title={loan.applicationNumber}
            description={`${loan.memberName} · ${loan.loanTypeName} · ${formatCurrency(loan.requestedAmount)}`}
            actions={
              <div className="flex flex-wrap items-center gap-2.5">
                <ActionBar
                  status={loan.status}
                  tone={LOAN_STATUS_TONE[loan.status]}
                  canReview={canReview} canApprove={canApprove} canRelease={canRelease} canReject={canReject} canReturn={canReturn}
                  reviewPending={reviewMutation.isPending} approvePending={approveMutation.isPending}
                  onReview={() => reviewMutation.mutate()} onApprove={() => approveMutation.mutate()}
                  onRelease={() => setReleaseOpen(true)} onReturn={() => setReturnOpen(true)} onReject={() => setRejectOpen(true)}
                  reviewPermission="loans.review" approvePermission="loans.approve" releasePermission="loans.release" rejectPermission="loans.reject"
                />
                {hasReachedApproval && (
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-xl h-9 text-xs gap-1.5">
                    <Printer className="size-3.5" /> Print / Save as PDF
                  </Button>
                )}
              </div>
            }
          />
          <ApprovalRecordLinks detailPath={`/loans/${loan.id}`} />
          <LoanMemberProfileCard member={loanMember} />
          <LoanApplicationDetails loan={loan} />
          <LoanDocumentsCard documents={loan.documents ?? []} />
          <LoanAmortizationScheduleCard schedule={loanSchedule} isLoading={isLoadingLoanSchedule} />
          <DetailBody historyLoading={isLoadingHistory} history={history} detailPath={`/loans/${loan.id}`} showLinks={false} />
        </div>
        {hasReachedApproval && <LoanApprovalPrintSheet loan={loan} />}
        <ReasonDialog open={rejectOpen} onOpenChange={setRejectOpen} title="Reject Loan Application" reasonLabel="Rejection Reason" confirmLabel="Reject Loan" destructive isLoading={rejectMutation.isPending} onConfirm={(reason) => rejectMutation.mutate(reason)} />
        <ReasonDialog open={returnOpen} onOpenChange={setReturnOpen} title="Return for Revision" reasonLabel="Return Remarks" confirmLabel="Return Loan" isLoading={returnMutation.isPending} onConfirm={(reason) => returnMutation.mutate(reason)} />
        <LoanReleaseDialog open={releaseOpen} onOpenChange={setReleaseOpen} defaultAmount={loan.approvedAmount ?? loan.netProceeds} isLoading={releaseLoanMutation.isPending} onConfirm={(input) => releaseLoanMutation.mutate(input)} />
      </div>
    )
  }

  if (type === "benefits") {
    if (!benefit) return <ProfileSkeleton cards={2} />

    const canReview = benefit.status === "Under Review" && hasPermission("benefits.review")
    const canApprove = benefit.status === "For Approval" && hasPermission("benefits.approve")
    const canRelease = benefit.status === "Approved" && hasPermission("benefits.release")
    // Same fix as the loans branch above — reject/return follow the current stage's own
    // permission, not a separate benefits.reject permission.
    const canReject = canReview || canApprove
    const canReturn = canReview || canApprove

    return (
      <div className="space-y-6 pb-12">
        <PageHeader
          title={benefit.applicationNumber}
          description={`${benefit.memberName} · ${benefit.benefitTypeName} · ${formatCurrency(benefit.requestedAmount)}`}
          actions={<ActionBar
            status={benefit.status}
            tone={BENEFIT_STATUS_TONE[benefit.status]}
            canReview={canReview} canApprove={canApprove} canRelease={canRelease} canReject={canReject} canReturn={canReturn}
            reviewPending={reviewMutation.isPending} approvePending={approveMutation.isPending}
            onReview={() => reviewMutation.mutate()} onApprove={() => approveMutation.mutate()}
            onRelease={() => setReleaseOpen(true)} onReturn={() => setReturnOpen(true)} onReject={() => setRejectOpen(true)}
            reviewPermission="benefits.review" approvePermission="benefits.approve" releasePermission="benefits.release" rejectPermission="benefits.reject"
          />}
        />
        <ApprovalRecordLinks detailPath={`/benefits/${benefit.id}`} />
        <BenefitMemberProfileCard member={benefitMember} />
        <BenefitApplicationDetails benefit={benefit} />
        <BenefitDocumentsCard documents={benefit.documents ?? []} />
        <DetailBody historyLoading={isLoadingHistory} history={history} detailPath={`/benefits/${benefit.id}`} showLinks={false} />
        <ReasonDialog open={rejectOpen} onOpenChange={setRejectOpen} title="Reject Benefit Application" reasonLabel="Rejection Reason" confirmLabel="Reject Application" destructive isLoading={rejectMutation.isPending} onConfirm={(reason) => rejectMutation.mutate(reason)} />
        <ReasonDialog open={returnOpen} onOpenChange={setReturnOpen} title="Return for Revision" reasonLabel="Return Remarks" confirmLabel="Return Application" isLoading={returnMutation.isPending} onConfirm={(reason) => returnMutation.mutate(reason)} />
        <ConfirmDialog open={releaseOpen} onOpenChange={setReleaseOpen} title="Release Benefit" description="Confirm this benefit has been released to the member/beneficiary." confirmLabel="Release Benefit" isLoading={releaseBenefitMutation.isPending} onConfirm={() => releaseBenefitMutation.mutate()}>
          <div className="space-y-3">
            {isCashPabaonBenefit && (
              <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3 text-xs space-y-1">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Approved Amount</span><span className="font-semibold text-foreground">{formatCurrency(benefitApprovedAmount)}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Less: Total Cash Pabaon Contributed</span><span className="font-semibold text-destructive">− {formatCurrency(totalCashPabaonContributed)}</span></div>
                <div className="flex items-center justify-between border-t border-primary/15 pt-1"><span className="font-semibold text-foreground">Net Payable</span><span className="font-bold text-primary">{formatCurrency(defaultReleaseAmount)}</span></div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">Amount Released</Label>
              <CurrencyInput value={releaseAmount} onChange={setReleaseAmount} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">Remarks</Label>
              <Textarea value={releaseRemarks} onChange={(e) => setReleaseRemarks(e.target.value)} placeholder="Optional remarks about the release…" rows={2} className="rounded-xl text-sm" />
            </div>
          </div>
        </ConfirmDialog>
      </div>
    )
  }

  if (type === "annual-budgets") {
    if (!annualBudget) return <ProfileSkeleton cards={2} />

    const canApprove = annualBudget.status === "For Approval" && hasPermission("annual_budgets.approve")

    return (
      <div className="space-y-6 pb-12">
        <PageHeader
          title={`Annual Budget FY ${annualBudget.fiscalYear}`}
          description={`${formatCurrency(annualBudget.totalProposedBudget)} proposed from ${formatCurrency(annualBudget.estimatedRevenue)} estimated revenue`}
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge label={annualBudget.status} tone={annualBudget.status === "Approved" ? "success" : annualBudget.status === "Rejected" ? "danger" : "warning"} className="h-9 px-3 text-xs font-semibold rounded-xl" />
              {canApprove && (
                <>
                  <PermissionButton permission="annual_budgets.approve" size="sm" isLoading={approveMutation.isPending} loadingText="Approving…" onClick={() => approveMutation.mutate()} className="rounded-xl h-9 text-xs gap-1.5 shadow-2xs">
                    <CheckCircle2 className="size-3.5" /> Approve Budget
                  </PermissionButton>
                  <PermissionButton permission="annual_budgets.approve" variant="outline" size="sm" onClick={() => setReturnOpen(true)} className="rounded-xl h-9 text-xs gap-1.5">
                    <RotateCcw className="size-3.5" /> Return for Revision
                  </PermissionButton>
                  <PermissionButton permission="annual_budgets.approve" variant="destructive" size="sm" onClick={() => setRejectOpen(true)} className="rounded-xl h-9 text-xs gap-1.5">
                    <XCircle className="size-3.5" /> Reject Budget
                  </PermissionButton>
                </>
              )}
            </div>
          }
        />
        <ApprovalRecordLinks detailPath={`/financial/annual-budgets/${annualBudget.fiscalYear}`} />
        <AnnualBudgetDetails budget={annualBudget} />
        <DetailBody
          historyLoading={isLoadingHistory}
          history={history}
          detailPath={`/financial/annual-budgets/${annualBudget.fiscalYear}`}
          showLinks={false}
        />
        <ReasonDialog open={rejectOpen} onOpenChange={setRejectOpen} title="Reject Annual Budget" reasonLabel="Rejection Reason" confirmLabel="Reject Budget" destructive isLoading={rejectMutation.isPending} onConfirm={(reason) => rejectMutation.mutate(reason)} />
        <ReasonDialog open={returnOpen} onOpenChange={setReturnOpen} title="Return Annual Budget for Revision" reasonLabel="Return Remarks" confirmLabel="Return Budget" isLoading={returnMutation.isPending} onConfirm={(reason) => returnMutation.mutate(reason)} />
      </div>
    )
  }

  if (type === "disbursements") {
    if (!disbursement) return <ProfileSkeleton cards={2} />
    const canApprove = disbursement.status === "For Approval" && hasPermission("disbursements.approve")

    return (
      <div className="space-y-6 pb-12">
        <PageHeader
          title={disbursement.referenceNumber}
          description={`${disbursement.payee} · ${disbursement.accountTitle} · ${formatCurrency(disbursement.amount)}`}
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge label={disbursement.status} tone={disbursement.status === "Approved" || disbursement.status === "Paid" ? "success" : disbursement.status === "Rejected" ? "danger" : "warning"} className="h-9 px-3 text-xs font-semibold rounded-xl" />
              {canApprove && (
                <>
                  <PermissionButton permission="disbursements.approve" size="sm" isLoading={approveMutation.isPending} loadingText="Approving…" onClick={() => approveMutation.mutate()} className="rounded-xl h-9 text-xs gap-1.5 shadow-2xs">
                    <CheckCircle2 className="size-3.5" /> Approve Disbursement
                  </PermissionButton>
                  <PermissionButton permission="disbursements.approve" variant="outline" size="sm" onClick={() => setReturnOpen(true)} className="rounded-xl h-9 text-xs gap-1.5">
                    <RotateCcw className="size-3.5" /> Return for Revision
                  </PermissionButton>
                  <PermissionButton permission="disbursements.approve" variant="destructive" size="sm" onClick={() => setRejectOpen(true)} className="rounded-xl h-9 text-xs gap-1.5">
                    <XCircle className="size-3.5" /> Reject
                  </PermissionButton>
                </>
              )}
            </div>
          }
        />
        <DetailBody historyLoading={isLoadingHistory} history={history} detailPath={`/financial/disbursements/${disbursement.id}`} />
        <ReasonDialog open={rejectOpen} onOpenChange={setRejectOpen} title="Reject Disbursement" reasonLabel="Rejection Reason" confirmLabel="Reject Disbursement" destructive isLoading={rejectMutation.isPending} onConfirm={(reason) => rejectMutation.mutate(reason)} />
        <ReasonDialog open={returnOpen} onOpenChange={setReturnOpen} title="Return Disbursement for Revision" reasonLabel="Return Remarks" confirmLabel="Return Disbursement" isLoading={returnMutation.isPending} onConfirm={(reason) => returnMutation.mutate(reason)} />
      </div>
    )
  }

  if (!member) return <ProfileSkeleton cards={2} />

  const canApproveMember = member.approvalStatus === "pending" && hasPermission("members.approve")
  const canRejectMember = member.approvalStatus === "pending" && hasPermission("members.reject")

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={member.fullName}
        description={`${member.memberNumber} · ${member.officeName}`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {member.approvalStatus && <StatusBadge label={member.approvalStatus} tone={member.approvalStatus === "pending" ? "info" : member.approvalStatus === "approved" ? "success" : "danger"} className="h-9 px-3 text-xs font-semibold rounded-xl" />}
            {canApproveMember && (
              <PermissionButton permission="members.approve" size="sm" isLoading={approveMutation.isPending} loadingText="Approving…" onClick={() => approveMutation.mutate()} className="rounded-xl h-9 text-xs gap-1.5 shadow-2xs">
                <CheckCircle2 className="size-3.5" /> Approve Registration
              </PermissionButton>
            )}
            {canRejectMember && (
              <PermissionButton permission="members.reject" variant="destructive" size="sm" onClick={() => setRejectOpen(true)} className="rounded-xl h-9 text-xs gap-1.5">
                <XCircle className="size-3.5" /> Reject Registration
              </PermissionButton>
            )}
          </div>
        }
      />
      <DetailBody historyLoading={isLoadingHistory} history={history} detailPath={`/members/${member.id}`} />
      <ReasonDialog open={rejectOpen} onOpenChange={setRejectOpen} title="Reject Member Registration" reasonLabel="Rejection Reason" confirmLabel="Reject Registration" destructive isLoading={rejectMutation.isPending} onConfirm={(reason) => rejectMutation.mutate(reason)} />
    </div>
  )
}

function AnnualBudgetDetails({ budget }: { budget: import("@/services/annual-budgets.service").AnnualBudget }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <div className="border-b border-border/50 bg-muted/20 p-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground tracking-tight">Annual Budget Details</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Review the proposed expenditure program before approving, returning, or rejecting it.</p>
        </div>
        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-bold bg-primary/5 text-primary border-primary/20">
          FY {budget.fiscalYear}
        </Badge>
      </div>

      <div className="space-y-6 p-5">
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
          <BudgetMetric label="Fiscal Year" value={`FY ${budget.fiscalYear}`} icon={CalendarDays} />
          <BudgetMetric label="Estimated Revenue" value={formatCurrency(budget.estimatedRevenue)} icon={Wallet} />
          <BudgetMetric label="Proposed Budget" value={formatCurrency(budget.totalProposedBudget)} icon={Landmark} />
          <BudgetMetric label="Unallocated Balance" value={formatCurrency(budget.unallocatedBalance)} icon={PiggyBank} />
          <BudgetMetric label="Prepared By" value={budget.preparedBy || "Not recorded"} icon={Calculator} />
        </div>

        {(budget.notes || budget.rejectionReason) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {budget.notes && <BudgetText label="Treasurer’s Notes" value={budget.notes} />}
            {budget.rejectionReason && <BudgetText label="Previous Decision Remarks" value={budget.rejectionReason} isAlert />}
          </div>
        )}

        <Separator className="bg-border/50" />

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
              <Calculator className="size-4 text-primary" /> Expenditure Program Items
            </h3>
            <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full">
              {budget.items.length} account item{budget.items.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="px-4 py-3">Account Title</th>
                  <th className="px-4 py-3 text-right">Proposed Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {budget.items.map((item, index) => (
                  <tr key={item.id ?? `${item.accountTitle}-${index}`} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{item.accountTitle}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-foreground">{formatCurrency(item.proposedAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border/80 bg-muted/40 font-bold">
                <tr>
                  <td className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Total Proposed Expenditure</td>
                  <td className="px-4 py-3 text-right font-mono text-base font-bold text-primary">{formatCurrency(budget.totalProposedBudget)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

function BudgetMetric({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 p-3.5 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Icon className="size-3.5 text-primary" />
        {label}
      </p>
      <p className="text-sm font-bold text-foreground truncate">{value}</p>
    </div>
  )
}

function BudgetText({ label, value, isAlert = false }: { label: string; value: string; isAlert?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4 space-y-1", isAlert ? "border-destructive/30 bg-destructive/5" : "border-border/60 bg-muted/20")}>
      <p className={cn("text-xs font-bold uppercase tracking-wider", isAlert ? "text-destructive" : "text-muted-foreground")}>{label}</p>
      <p className="whitespace-pre-wrap text-xs text-foreground font-medium leading-relaxed">{value}</p>
    </div>
  )
}

const SETTLEMENT_METHOD_LABEL: Record<string, string> = {
  full_payment_required: "Full Payment Required Before Release",
  deducted: "Deducted From New Loan Proceeds",
}

/** Applicant snapshot — surfaced inline (especially net pay) since income is what most loan products' eligibility brackets are computed against. */
function LoanMemberProfileCard({ member }: { member?: Member }) {
  if (!member) return null

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <div className="border-b border-border/50 bg-muted/20 p-5 flex items-center gap-2.5">
        <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <User className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground tracking-tight">Member Profile</h2>
          <p className="text-xs text-muted-foreground mt-0.5">The applicant this loan belongs to.</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <BudgetMetric label="Net Pay / Salary" value={member.netPay != null ? formatCurrency(member.netPay) : "Not on file"} icon={Wallet2} />
          <BudgetMetric label="Membership Status" value={member.membershipStatus} icon={ShieldCheck} />
          <BudgetMetric label="Employment Status" value={member.employmentStatus || "—"} icon={User} />
          <BudgetMetric label="Retiree Status" value={member.retireeStatus} icon={User} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <BudgetText label="Full Name" value={member.fullName} />
          <BudgetText label="Member Number" value={member.memberNumber} />
          <BudgetText label="Office / Branch" value={member.officeName} />
          <BudgetText label="Position" value={member.position || "—"} />
          <BudgetText label="Membership Type" value={member.membershipType} />
          <BudgetText label="Cellphone Number" value={member.cellphoneNumber || "—"} />
        </div>
      </div>
    </section>
  )
}

/** Uploaded requirement documents for this application, so an approver can review what was actually submitted without leaving the page. */
function LoanDocumentsCard({ documents }: { documents: LoanApplication["documents"] }) {
  const items = documents ?? []

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <div className="border-b border-border/50 bg-muted/20 p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <FileText className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Submitted Documents</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Requirement files attached to this application.</p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
          {items.length} file{items.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="p-5">
        {items.length === 0 ? (
          <EmptyState icon={FileText} title="No documents uploaded" description="No requirement files have been attached to this application yet." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((doc) => (
              <DocumentCard
                key={doc.id}
                title={doc.requirementLabel}
                fileName={doc.fileName}
                fileUrl={doc.fileUrl}
                uploadedAt={formatDateShort(doc.uploadedAt)}
                uploadedBy={doc.uploadedBy}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

const amortizationColumns: ColumnDef<AmortizationEntry, unknown>[] = [
  { accessorKey: "installmentNumber", header: "#" },
  { accessorKey: "dueDate", header: "Due Date", cell: ({ row }) => formatDateShort(row.original.dueDate) },
  { accessorKey: "beginningBalance", header: "Beginning Balance", cell: ({ row }) => formatCurrency(row.original.beginningBalance) },
  { accessorKey: "principal", header: "Principal", cell: ({ row }) => formatCurrency(row.original.principal) },
  { accessorKey: "interest", header: "Interest", cell: ({ row }) => formatCurrency(row.original.interest) },
  { accessorKey: "penalty", header: "Penalty", cell: ({ row }) => formatCurrency(row.original.penalty) },
  { accessorKey: "amountDue", header: "Amount Due", cell: ({ row }) => formatCurrency(row.original.amountDue) },
  { accessorKey: "amountPaid", header: "Amount Paid", cell: ({ row }) => formatCurrency(row.original.amountPaid) },
  { accessorKey: "remainingBalance", header: "Remaining Balance", cell: ({ row }) => formatCurrency(row.original.remainingBalance) },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge label={row.original.status} tone={AMORTIZATION_STATUS_TONE[row.original.status]} />,
  },
]

/** Full repayment schedule, shown inline so an approver can see exactly what they're committing the association to before acting. */
function LoanAmortizationScheduleCard({ schedule, isLoading }: { schedule: AmortizationEntry[]; isLoading: boolean }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <div className="border-b border-border/50 bg-muted/20 p-5 flex items-center gap-2.5">
        <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <CalendarDays className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground tracking-tight">Amortization Schedule</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Full month-by-month repayment breakdown.</p>
        </div>
      </div>
      <DataTable
        columns={amortizationColumns}
        data={schedule}
        isLoading={isLoading}
        emptyTitle="No amortization schedule"
        emptyDescription="The amortization schedule has not been generated for this loan yet."
        maxHeight="max-h-[28rem]"
      />
    </section>
  )
}

/** Full application details shown inline on the approval screen, so an approver doesn't have to leave to the source record just to see what they're deciding on. */
function LoanApplicationDetails({ loan }: { loan: LoanApplication }) {
  const eligibilityAllPassed = loan.eligibility.every((item) => item.passed)
  const eligibilityResult: EligibilityResult = loan.eligibilityOverridden
    ? "Eligible with Warning"
    : eligibilityAllPassed
      ? "Eligible"
      : "Not Eligible"

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <div className="border-b border-border/50 bg-muted/20 p-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground tracking-tight">Loan Application Details</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Review the full application before reviewing, approving, or rejecting it.</p>
        </div>
        {loan.applicationType === "reloan" && (
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-bold bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20">
            Reloan #{loan.reloanSequence ?? 1}
          </Badge>
        )}
      </div>

      <div className="space-y-6 p-5">
        {loan.eligibilityOverridden && (
          <AlertBanner
            tone="warning"
            title="Submitted under an eligibility override."
            description={loan.eligibilityOverrideReason || "One or more eligibility checks failed but an authorized override was applied."}
          />
        )}
        {loan.rejectionReason && <AlertBanner tone="danger" title="This application was previously rejected." description={loan.rejectionReason} />}
        {loan.cancellationReason && <AlertBanner tone="warning" title="This application was cancelled." description={loan.cancellationReason} />}

        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <BudgetMetric label="Requested Amount" value={formatCurrency(loan.requestedAmount)} icon={DollarSign} />
          <BudgetMetric label="Term" value={`${loan.termMonths} month(s)`} icon={CalendarDays} />
          <BudgetMetric label="Interest Rate" value={`${loan.interestRate}% / month`} icon={Calculator} />
          <BudgetMetric label="Monthly Amortization" value={formatCurrency(loan.monthlyAmortization)} icon={Wallet} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <BudgetText label="Member" value={`${loan.memberName} (${loan.memberNumber}) · ${loan.officeName}`} />
          <BudgetText label="Assigned Officer" value={loan.assignedOfficer || "Not assigned"} />
          <BudgetText label="Loan Type" value={loan.loanTypeName || "Not specified"} />
          <BudgetText label="Payment Method" value={loan.paymentMethod} />
          <BudgetText label="Purpose" value={loan.purpose || "Not specified"} />
          <BudgetText label="Application Date" value={formatDateShort(loan.applicationDate)} />
        </div>

        {loan.applicationType === "reloan" && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.03] p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <RotateCw className="size-3.5" /> Reloan Lineage
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <BudgetText label="Previous Loan Reference" value={loan.previousLoanReference ?? "—"} />
              {(loan.previousObligationAmount ?? 0) > 0 && (
                <BudgetText
                  label="Previous Obligation"
                  value={`${formatCurrency(loan.previousObligationAmount ?? 0)} — ${loan.previousObligationSettlementMethod ? SETTLEMENT_METHOD_LABEL[loan.previousObligationSettlementMethod] : "Not specified"}`}
                />
              )}
            </div>
          </div>
        )}

        <Separator className="bg-border/50" />

        <div className="rounded-2xl border border-border/60 bg-muted/15 p-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Calculator className="size-3.5 text-primary" /> Computation Summary
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <BudgetMetric label="Principal" value={formatCurrency(loan.principal)} icon={Landmark} />
            <BudgetMetric label="Total Interest" value={formatCurrency(loan.totalInterest)} icon={Calculator} />
            <BudgetMetric label="Processing Fee" value={formatCurrency(loan.processingFee)} icon={Banknote} />
            <BudgetMetric label="Net Proceeds" value={formatCurrency(loan.netProceeds)} icon={PiggyBank} />
            <BudgetMetric label="Total Amount Payable" value={formatCurrency(loan.totalAmountPayable)} icon={Wallet} />
          </div>
        </div>

        <Separator className="bg-border/50" />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
              <CheckSquare className="size-4 text-primary" /> Documentary Requirements
            </h3>
            <ul className="space-y-2.5">
              {loan.requirements.map((req) => (
                <li
                  key={req.label}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-xl border text-xs transition-all duration-200",
                    req.completed ? "bg-emerald-500/[0.03] border-emerald-500/25 text-foreground" : "bg-muted/20 border-border/50 text-muted-foreground"
                  )}
                >
                  <span className={req.completed ? "font-semibold text-foreground" : "text-muted-foreground"}>{req.label}</span>
                  <span className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    req.completed ? "bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-muted-foreground/15 text-muted-foreground"
                  )}>
                    {req.completed ? "✓" : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
              <ShieldCheck className="size-4 text-primary" /> Eligibility Checklist
            </h3>
            <EligibilityChecklist items={loan.eligibility} result={eligibilityResult} />
          </div>
        </div>
      </div>
    </section>
  )
}

/** Applicant snapshot — same layout as the loan version, surfaced inline so an approver doesn't have to open the member's profile separately. */
function BenefitMemberProfileCard({ member }: { member?: Member }) {
  if (!member) return null

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <div className="border-b border-border/50 bg-muted/20 p-5 flex items-center gap-2.5">
        <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <User className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground tracking-tight">Member Profile</h2>
          <p className="text-xs text-muted-foreground mt-0.5">The applicant this benefit belongs to.</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <BudgetMetric label="Net Pay / Salary" value={member.netPay != null ? formatCurrency(member.netPay) : "Not on file"} icon={Wallet2} />
          <BudgetMetric label="Membership Status" value={member.membershipStatus} icon={ShieldCheck} />
          <BudgetMetric label="Employment Status" value={member.employmentStatus || "—"} icon={User} />
          <BudgetMetric label="Retiree Status" value={member.retireeStatus} icon={User} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <BudgetText label="Full Name" value={member.fullName} />
          <BudgetText label="Member Number" value={member.memberNumber} />
          <BudgetText label="Office / Branch" value={member.officeName} />
          <BudgetText label="Position" value={member.position || "—"} />
          <BudgetText label="Membership Type" value={member.membershipType} />
          <BudgetText label="Cellphone Number" value={member.cellphoneNumber || "—"} />
        </div>
      </div>
    </section>
  )
}

/** Uploaded requirement documents for this benefit application, so an approver can review what was actually submitted without leaving the page. */
function BenefitDocumentsCard({ documents }: { documents: BenefitApplication["documents"] }) {
  const items = documents ?? []

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <div className="border-b border-border/50 bg-muted/20 p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <FileText className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Submitted Documents</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Requirement files attached to this application.</p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
          {items.length} file{items.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="p-5">
        {items.length === 0 ? (
          <EmptyState icon={FileText} title="No documents uploaded" description="No requirement files have been attached to this application yet." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((doc) => (
              <DocumentCard
                key={doc.id}
                title={doc.fileName}
                fileName={doc.fileName}
                fileUrl={doc.fileUrl}
                fileSize={doc.fileSize}
                uploadedAt={formatDateShort(doc.uploadedAt)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/** Full benefit application details shown inline on the approval screen, so an approver doesn't have to leave to the source record just to see what they're deciding on. */
function BenefitApplicationDetails({ benefit }: { benefit: BenefitApplication }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <div className="border-b border-border/50 bg-muted/20 p-5">
        <h2 className="text-base font-bold text-foreground tracking-tight">Benefit Application Details</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Review the full application before reviewing, approving, or releasing it.</p>
      </div>

      <div className="space-y-6 p-5">
        {benefit.rejectionReason && <AlertBanner tone="danger" title="This application was previously rejected." description={benefit.rejectionReason} />}
        {benefit.cancellationReason && <AlertBanner tone="warning" title="This application was cancelled." description={benefit.cancellationReason} />}

        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <BudgetMetric label="Requested Amount" value={formatCurrency(benefit.requestedAmount)} icon={DollarSign} />
          <BudgetMetric label="Approved Amount" value={benefit.approvedAmount != null ? formatCurrency(benefit.approvedAmount) : "Pending"} icon={CheckCircle2} />
          <BudgetMetric label="Released Amount" value={benefit.actualReleasedAmount != null ? formatCurrency(benefit.actualReleasedAmount) : "Not yet released"} icon={Wallet} />
          <BudgetMetric label="Application Date" value={formatDateShort(benefit.applicationDate)} icon={CalendarDays} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <BudgetText label="Member" value={`${benefit.memberName} (${benefit.memberNumber}) · ${benefit.officeName}`} />
          <BudgetText label="Benefit Type" value={benefit.benefitTypeName} />
          <BudgetText label="Beneficiary / Recipient" value={benefit.beneficiaryOrRecipient || "—"} />
          <BudgetText label="Incident Date" value={benefit.incidentDate ? formatDateShort(benefit.incidentDate) : "—"} />
          <BudgetText label="Reason" value={benefit.reason || "Not specified"} />
          {benefit.remarks && <BudgetText label="Remarks" value={benefit.remarks} />}
        </div>

        {(benefit.releaseDate || benefit.releaseReferenceNumber) && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.03] p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Wallet className="size-3.5" /> Release Information
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <BudgetText label="Release Date" value={benefit.releaseDate ? formatDateShort(benefit.releaseDate) : "—"} />
              <BudgetText label="Release Reference" value={benefit.releaseReferenceNumber || "—"} />
              <BudgetText label="Released Amount" value={benefit.actualReleasedAmount != null ? formatCurrency(benefit.actualReleasedAmount) : "—"} />
            </div>
          </div>
        )}

        <Separator className="bg-border/50" />

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
            <CheckSquare className="size-4 text-primary" /> Documentary Requirements
          </h3>
          <ul className="space-y-2.5">
            {benefit.requirements.map((req) => (
              <li
                key={req.label}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-xl border text-xs transition-all duration-200",
                  req.completed ? "bg-emerald-500/[0.03] border-emerald-500/25 text-foreground" : "bg-muted/20 border-border/50 text-muted-foreground"
                )}
              >
                <span className={req.completed ? "font-semibold text-foreground" : "text-muted-foreground"}>{req.label}</span>
                <span className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  req.completed ? "bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-muted-foreground/15 text-muted-foreground"
                )}>
                  {req.completed ? "✓" : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/**
 * Official printout for an approved loan application — hidden on screen, shown only via
 * `window.print()`. Header mirrors the org's configured Report Template (Settings > Reports)
 * so it matches every other official document the system prints.
 */
function LoanApprovalPrintSheet({ loan }: { loan: LoanApplication }) {
  const template = getSettings().reportTemplate
  const approvedAmount = loan.approvedAmount ?? loan.requestedAmount

  const rows: [string, string][] = [
    ["Application Number", loan.applicationNumber],
    ["Status", loan.status],
    ["Application Date", formatDateShort(loan.applicationDate)],
    ["Application Type", loan.applicationType === "reloan" ? `Reloan (#${loan.reloanSequence ?? 1})` : "New Loan"],
    ["Member Name", loan.memberName],
    ["Member Number", loan.memberNumber],
    ["Office / Branch", loan.officeName],
    ["Assigned Officer", loan.assignedOfficer || "—"],
    ["Loan Type", loan.loanTypeName || "—"],
    ["Term", `${loan.termMonths} month(s)`],
    ["Interest Rate", `${loan.interestRate}% / month`],
    ["Payment Method", loan.paymentMethod],
    ["Purpose", loan.purpose || "—"],
    ["Requested Amount", formatCurrency(loan.requestedAmount)],
    ["Approved Amount", formatCurrency(approvedAmount)],
    ["Principal", formatCurrency(loan.principal)],
    ["Processing Fee", formatCurrency(loan.processingFee)],
    ["Total Interest", formatCurrency(loan.totalInterest)],
    ["Net Proceeds", formatCurrency(loan.netProceeds)],
    ["Total Amount Payable", formatCurrency(loan.totalAmountPayable)],
    ["Monthly Amortization", formatCurrency(loan.monthlyAmortization)],
    ["First Due Date", formatDateShort(loan.firstDueDate)],
    ["Maturity Date", formatDateShort(loan.maturityDate)],
  ]

  return (
    <div className="hidden print:block text-black">
      <div className="grid grid-cols-[80px_1fr_80px] items-center gap-4 text-center">
        <img src={template.leftLogo} alt="" className="mx-auto size-16 object-contain" />
        <div className="leading-tight">
          <p className="text-xs">{template.countryLine}</p>
          <p className="text-base font-bold">{template.organizationLine}</p>
          <p className="text-base font-bold">{template.acronymLine}</p>
          <p className="text-xs">{template.addressLine}</p>
        </div>
        <img src={template.rightLogo} alt="" className="mx-auto size-16 object-contain" />
      </div>

      <div className="mt-3 border-t-2 border-black pt-2 text-center">
        <h2 className="text-sm font-bold uppercase tracking-wide">Approved Loan Application</h2>
        <p className="text-xs">{loan.applicationNumber}</p>
      </div>

      <table className="mt-4 w-full border-collapse text-xs">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td className="w-1/3 border border-black px-2 py-1.5 font-semibold">{label}</td>
              <td className="border border-black px-2 py-1.5">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-10 grid grid-cols-2 gap-8 text-xs">
        <div className="text-center">
          <div className="border-t border-black pt-1">{loan.assignedOfficer || "Loan Officer"}</div>
          <p className="mt-0.5 text-[10px] text-gray-600">Loan Officer</p>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-1">&nbsp;</div>
          <p className="mt-0.5 text-[10px] text-gray-600">Approving Officer</p>
        </div>
      </div>

      {template.showGeneratedDate && (
        <p className="mt-6 text-[10px] text-gray-600">Generated on {formatDateShort(new Date().toISOString())}</p>
      )}
    </div>
  )
}

interface ActionBarProps {
  status: string
  tone: StatusTone
  canReview: boolean
  canApprove: boolean
  canRelease: boolean
  canReject: boolean
  canReturn: boolean
  reviewPending: boolean
  approvePending: boolean
  onReview: () => void
  onApprove: () => void
  onRelease: () => void
  onReturn: () => void
  onReject: () => void
  reviewPermission: "loans.review" | "benefits.review"
  approvePermission: "loans.approve" | "benefits.approve"
  releasePermission: "loans.release" | "benefits.release"
  rejectPermission: "loans.reject" | "benefits.reject"
}

function ActionBar({
  status, tone, canReview, canApprove, canRelease, canReject, canReturn,
  reviewPending, approvePending, onReview, onApprove, onRelease, onReturn, onReject,
  reviewPermission, approvePermission, releasePermission, rejectPermission,
}: ActionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <StatusBadge label={status} tone={tone} className="h-9 px-3.5 text-xs font-semibold rounded-xl" />
      {canReview && (
        <PermissionButton permission={reviewPermission} size="sm" isLoading={reviewPending} loadingText="Marking Reviewed…" onClick={onReview} className="rounded-xl h-9 text-xs gap-1.5 shadow-2xs">
          <CheckSquare className="size-3.5" /> Mark Reviewed
        </PermissionButton>
      )}
      {canApprove && (
        <PermissionButton permission={approvePermission} size="sm" isLoading={approvePending} loadingText="Approving…" onClick={onApprove} className="rounded-xl h-9 text-xs gap-1.5 shadow-2xs">
          <CheckCircle2 className="size-3.5" /> Approve
        </PermissionButton>
      )}
      {canRelease && (
        <PermissionButton permission={releasePermission} size="sm" onClick={onRelease} className="rounded-xl h-9 text-xs gap-1.5 shadow-2xs">
          <Banknote className="size-3.5" /> Release
        </PermissionButton>
      )}
      {canReturn && (
        <PermissionButton variant="outline" size="sm" onClick={onReturn} className="rounded-xl h-9 text-xs gap-1.5">
          <RotateCcw className="size-3.5" /> Return for Revision
        </PermissionButton>
      )}
      {canReject && (
        <PermissionButton permission={rejectPermission} variant="destructive" size="sm" onClick={onReject} className="rounded-xl h-9 text-xs gap-1.5">
          <XCircle className="size-3.5" /> Reject
        </PermissionButton>
      )}
    </div>
  )
}

function DetailBody({
  historyLoading,
  history,
  detailPath,
  showLinks = true,
}: {
  historyLoading: boolean
  history: import("@/types").ApprovalHistoryEntry[]
  detailPath: string
  showLinks?: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border/40">
          <Clock className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Approval Timeline & Audit History</h3>
        </div>
        {historyLoading ? (
          <EmptyState title="Loading approval history…" />
        ) : (
          <ApprovalTimeline history={history} />
        )}
      </div>

      {showLinks && <ApprovalRecordLinks detailPath={detailPath} />}
    </div>
  )
}

function ApprovalRecordLinks({ detailPath }: { detailPath: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button
        variant="outline"
        size="sm"
        render={<Link to="/my-approvals" />}
        className="h-9 gap-1.5 rounded-xl text-xs"
      >
        <ArrowLeft className="size-3.5" /> Back to Approval Inbox
      </Button>

      <Button
        variant="secondary"
        size="sm"
        render={<Link to={detailPath} />}
        className="h-9 gap-1.5 rounded-xl text-xs font-semibold"
      >
        <ExternalLink className="size-3.5" /> View Full Source Record
      </Button>
    </div>
  )
}
