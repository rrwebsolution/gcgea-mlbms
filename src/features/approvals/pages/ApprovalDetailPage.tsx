import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ApprovalTimeline } from "@/components/shared/ApprovalTimeline"
import { ReasonDialog } from "@/components/shared/ReasonDialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { EmptyState } from "@/components/shared/EmptyState"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { Textarea } from "@/components/ui/textarea"
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
import { getApprovalHistory } from "@/services/approvals.service"
import { LOAN_STATUS_TONE, BENEFIT_STATUS_TONE, type StatusTone } from "@/constants/status"
import { formatCurrency } from "@/utils/format"
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
      else await approveMemberRegistration(id)
    },
    onSuccess: () => { toast.success("Approved."); invalidate() },
    onError: (err) => handleError(err, "Unable to approve this item."),
  })
  const rejectMutation = useMutation({
    mutationFn: async (remarks: string) => {
      if (type === "loans") await rejectLoan(id, remarks)
      else if (type === "benefits") await rejectBenefit(id, remarks)
      else await rejectMemberRegistration(id, remarks)
    },
    onSuccess: () => { toast.success("Rejected."); setRejectOpen(false); invalidate() },
    onError: (err) => handleError(err, "Unable to reject this item."),
  })
  const returnMutation = useMutation({
    mutationFn: async (remarks: string) => {
      if (type === "loans") await returnLoanForRevision(id, remarks)
      else await returnBenefitForRevision(id, remarks)
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
      <div className="space-y-5">
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
      <div className="space-y-5">
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
          <Textarea value={releaseRemarks} onChange={(e) => setReleaseRemarks(e.target.value)} placeholder="Optional remarks about the release…" rows={2} />
        </ConfirmDialog>
      </div>
    )
  }

  if (!member) return <ProfileSkeleton cards={2} />

  const canApproveMember = member.approvalStatus === "pending" && hasPermission("members.approve")
  const canRejectMember = member.approvalStatus === "pending" && hasPermission("members.reject")

  return (
    <div className="space-y-5">
      <PageHeader
        title={member.fullName}
        description={`${member.memberNumber} · ${member.officeName}`}
        actions={
          <>
            {member.approvalStatus && <StatusBadge label={member.approvalStatus} tone={member.approvalStatus === "pending" ? "info" : member.approvalStatus === "approved" ? "success" : "danger"} className="h-7 px-3 text-sm" />}
            {canApproveMember && (
              <PermissionButton permission="members.approve" size="sm" isLoading={approveMutation.isPending} loadingText="Approving…" onClick={() => approveMutation.mutate()}>
                Approve Registration
              </PermissionButton>
            )}
            {canRejectMember && (
              <PermissionButton permission="members.reject" variant="destructive" size="sm" onClick={() => setRejectOpen(true)}>
                Reject Registration
              </PermissionButton>
            )}
          </>
        }
      />
      <DetailBody historyLoading={isLoadingHistory} history={history} detailPath={`/members/${member.id}`} />
      <ReasonDialog open={rejectOpen} onOpenChange={setRejectOpen} title="Reject Member Registration" reasonLabel="Rejection Reason" confirmLabel="Reject Registration" destructive isLoading={rejectMutation.isPending} onConfirm={(reason) => rejectMutation.mutate(reason)} />
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
    <>
      <StatusBadge label={status} tone={tone} className="h-7 px-3 text-sm" />
      {canReview && (
        <PermissionButton permission={reviewPermission} size="sm" isLoading={reviewPending} loadingText="Marking Reviewed…" onClick={onReview}>
          Mark Reviewed
        </PermissionButton>
      )}
      {canApprove && (
        <PermissionButton permission={approvePermission} size="sm" isLoading={approvePending} loadingText="Approving…" onClick={onApprove}>
          Approve
        </PermissionButton>
      )}
      {canRelease && (
        <PermissionButton permission={releasePermission} size="sm" onClick={onRelease}>
          Release
        </PermissionButton>
      )}
      {canReturn && (
        <PermissionButton variant="outline" size="sm" onClick={onReturn}>
          Return for Revision
        </PermissionButton>
      )}
      {canReject && (
        <PermissionButton permission={rejectPermission} variant="destructive" size="sm" onClick={onReject}>
          Reject
        </PermissionButton>
      )}
    </>
  )
}

function DetailBody({
  historyLoading,
  history,
  detailPath,
}: {
  historyLoading: boolean
  history: import("@/types").ApprovalHistoryEntry[]
  detailPath: string
}) {
  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Approval Timeline</h3>
        {historyLoading ? (
          <EmptyState title="Loading history…" />
        ) : (
          <ApprovalTimeline history={history} />
        )}
      </div>
      <div className="flex items-center gap-4">
        <Link to="/my-approvals" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="size-3.5" />
          Back to My Approvals
        </Link>
        <Link to={detailPath} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ExternalLink className="size-3.5" />
          Open Full Record
        </Link>
      </div>
    </>
  )
}
