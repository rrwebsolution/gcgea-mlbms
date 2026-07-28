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
  Clock
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ApprovalTimeline } from "@/components/shared/ApprovalTimeline"
import { ReasonDialog } from "@/components/shared/ReasonDialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { EmptyState } from "@/components/shared/EmptyState"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LoanReleaseDialog } from "@/features/loans/components/LoanReleaseDialog"
import { useAuth } from "@/contexts/AuthContext"
import { getMember, approveMemberRegistration, rejectMemberRegistration } from "@/services/members.service"
import {
  getLoan,
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
import { LOAN_STATUS_TONE, BENEFIT_STATUS_TONE, type StatusTone } from "@/constants/status"
import { formatCurrency } from "@/utils/format"
import { cn } from "@/lib/utils"
import type { ApprovalSubjectType } from "@/types"

export default function ApprovalDetailPage() {
  const params = useParams<{ subjectType: string; id: string }>()
  const type = (params.subjectType ?? "loans") as ApprovalSubjectType
  const id = params.id ?? ""
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()

  const { data: loan } = useQuery({ queryKey: ["loans", id], queryFn: () => getLoan(id), enabled: type === "loans" && Boolean(id) })
  const { data: benefit } = useQuery({ queryKey: ["benefits", id], queryFn: () => getBenefit(id), enabled: type === "benefits" && Boolean(id) })
  const { data: member } = useQuery({ queryKey: ["members", id], queryFn: () => getMember(id), enabled: type === "members" && Boolean(id) })
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
    mutationFn: (remarks?: string) => releaseBenefit(id, remarks ?? ""),
    onSuccess: () => { toast.success("Benefit released."); setReleaseOpen(false); setReleaseRemarks(""); invalidate() },
    onError: (err) => handleError(err, "Unable to release this benefit."),
  })

  if (type === "loans") {
    if (!loan) return <ProfileSkeleton cards={3} />

    const canReview = loan.status === "Under Review" && hasPermission("loans.review")
    const canApprove = loan.status === "For Approval" && hasPermission("loans.approve")
    const canRelease = loan.status === "Approved" && hasPermission("loans.release")
    const canReject = ["Under Review", "For Approval"].includes(loan.status) && hasPermission("loans.reject")
    const canReturn = ["Under Review", "For Approval"].includes(loan.status) && (hasPermission("loans.review") || hasPermission("loans.approve"))

    return (
      <div className="space-y-6 pb-12">
        <PageHeader
          title={loan.applicationNumber}
          description={`${loan.memberName} · ${loan.loanTypeName} · ${formatCurrency(loan.requestedAmount)}`}
          actions={<ActionBar
            status={loan.status}
            tone={LOAN_STATUS_TONE[loan.status]}
            canReview={canReview} canApprove={canApprove} canRelease={canRelease} canReject={canReject} canReturn={canReturn}
            reviewPending={reviewMutation.isPending} approvePending={approveMutation.isPending}
            onReview={() => reviewMutation.mutate()} onApprove={() => approveMutation.mutate()}
            onRelease={() => setReleaseOpen(true)} onReturn={() => setReturnOpen(true)} onReject={() => setRejectOpen(true)}
            reviewPermission="loans.review" approvePermission="loans.approve" releasePermission="loans.release" rejectPermission="loans.reject"
          />}
        />
        <DetailBody historyLoading={isLoadingHistory} history={history} detailPath={`/loans/${loan.id}`} />
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
    const canReject = ["Under Review", "For Approval"].includes(benefit.status) && hasPermission("benefits.reject")
    const canReturn = ["Under Review", "For Approval"].includes(benefit.status) && (hasPermission("benefits.review") || hasPermission("benefits.approve"))

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
        <DetailBody historyLoading={isLoadingHistory} history={history} detailPath={`/benefits/${benefit.id}`} />
        <ReasonDialog open={rejectOpen} onOpenChange={setRejectOpen} title="Reject Benefit Application" reasonLabel="Rejection Reason" confirmLabel="Reject Application" destructive isLoading={rejectMutation.isPending} onConfirm={(reason) => rejectMutation.mutate(reason)} />
        <ReasonDialog open={returnOpen} onOpenChange={setReturnOpen} title="Return for Revision" reasonLabel="Return Remarks" confirmLabel="Return Application" isLoading={returnMutation.isPending} onConfirm={(reason) => returnMutation.mutate(reason)} />
        <ConfirmDialog open={releaseOpen} onOpenChange={setReleaseOpen} title="Release Benefit" description="Confirm this benefit has been released to the member/beneficiary." confirmLabel="Release Benefit" isLoading={releaseBenefitMutation.isPending} onConfirm={() => releaseBenefitMutation.mutate(releaseRemarks || undefined)}>
          <Textarea value={releaseRemarks} onChange={(e) => setReleaseRemarks(e.target.value)} placeholder="Optional remarks about the release…" rows={2} className="rounded-xl text-sm" />
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
        <ArrowLeft className="size-3.5" /> Back to My Approvals
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
