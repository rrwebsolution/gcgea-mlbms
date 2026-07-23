import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { FileText, HeartHandshake } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PrintButton } from "@/components/shared/PrintButton"
import { ApprovalTimeline } from "@/components/shared/ApprovalTimeline"
import { EmptyState } from "@/components/shared/EmptyState"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getBenefit, getBenefitApprovalHistory } from "@/services/benefits.service"
import { BENEFIT_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"

export default function BenefitDetailPage() {
  const { id = "" } = useParams()
  const { data: benefit, isLoading } = useQuery({ queryKey: ["benefits", id], queryFn: () => getBenefit(id) })
  const { data: history = [] } = useQuery({ queryKey: ["benefits", id, "history"], queryFn: () => getBenefitApprovalHistory(id) })

  useBreadcrumbExtra(benefit?.applicationNumber)

  if (isLoading) return <ProfileSkeleton cards={2} />
  if (!benefit) return <EmptyState icon={HeartHandshake} title="Benefit application not found" description="This benefit application may have been removed." />

  return (
    <div className="space-y-5">
      <PageHeader
        title={benefit.applicationNumber}
        description={`${benefit.memberName} · ${benefit.benefitTypeName}`}
        actions={
          <>
            <StatusBadge label={benefit.status} tone={BENEFIT_STATUS_TONE[benefit.status]} className="h-7 px-3 text-sm" />
            <PrintButton permission="benefits.print" label="Print Application" />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryStat label="Requested Amount" value={formatCurrency(benefit.requestedAmount)} />
        <SummaryStat label="Approved Amount" value={benefit.approvedAmount != null ? formatCurrency(benefit.approvedAmount) : "—"} />
        <SummaryStat label="Release Date" value={formatDateShort(benefit.releaseDate)} />
      </div>

      <Tabs defaultValue="summary">
        <TabsList className="flex-wrap">
          <TabsTrigger value="summary">Application Summary</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="approvals">Approval History</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Member & Application Information</h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Detail label="Member Number" value={benefit.memberNumber} />
              <Detail label="Office" value={benefit.officeName} />
              <Detail label="Application Date" value={formatDateShort(benefit.applicationDate)} />
              <Detail label="Incident Date" value={formatDateShort(benefit.incidentDate)} />
              <Detail label="Beneficiary / Recipient" value={benefit.beneficiaryOrRecipient} />
              <Detail label="Reason / Purpose" value={benefit.reason} />
            </dl>
          </div>
          {benefit.rejectionReason && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <h3 className="mb-1 text-sm font-semibold text-destructive">Rejection Reason</h3>
              <p className="text-sm text-foreground">{benefit.rejectionReason}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="requirements" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <ul className="space-y-2">
              {benefit.requirements.map((req) => (
                <li key={req.label} className="flex items-center gap-2 text-sm">
                  <span className={`flex size-5 items-center justify-center rounded-full text-xs ${req.completed ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    {req.completed ? "✓" : "—"}
                  </span>
                  {req.label}
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <ApprovalTimeline history={history} />
          </div>
        </TabsContent>
      </Tabs>

      <Link to="/benefits" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <FileText className="size-3.5" />
        Back to Benefit Applications
      </Link>
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </>
  )
}
