import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { FileCheck, FileText, HeartHandshake, Printer } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PrintButton } from "@/components/shared/PrintButton"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { ApprovalTimeline } from "@/components/shared/ApprovalTimeline"
import { EmptyState } from "@/components/shared/EmptyState"
import { DocumentCard } from "@/components/shared/DocumentCard"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getBenefit, getBenefitApprovalHistory } from "@/services/benefits.service"
import { BENEFIT_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { formatFileSize } from "@/lib/upload-validation"
import type { BenefitDocument } from "@/types"

export default function BenefitDetailPage() {
  const { id = "" } = useParams()
  const { data: benefit, isLoading } = useQuery({ queryKey: ["benefits", id], queryFn: () => getBenefit(id) })
  const { data: history = [] } = useQuery({ queryKey: ["benefits", id, "history"], queryFn: () => getBenefitApprovalHistory(id) })

  useBreadcrumbExtra(benefit?.applicationNumber)

  if (isLoading) return <ProfileSkeleton cards={2} />
  if (!benefit) return <EmptyState icon={HeartHandshake} title="Benefit application not found" description="This benefit application may have been removed." />

  // Benefits are a one-time lump-sum release (not installment-based like loans), so this is a
  // single-row ledger — but it still needs its own "how much is left" view: a Treasurer can
  // release less than the approved amount (see Approvals → Release Benefit / Treasury → Payments),
  // leaving a balance that isn't tracked or paid automatically anywhere else.
  const claimedAmount = benefit.approvedAmount ?? benefit.requestedAmount
  const paidAmount = benefit.actualReleasedAmount ?? 0
  const balanceAmount = benefit.status === "Released" ? Math.max(0, claimedAmount - paidAmount) : claimedAmount
  const paymentStatus = benefit.status !== "Released" ? "Not Yet Released" : balanceAmount > 0 ? "Partially Released" : "Fully Released"

  return (
    <div className="space-y-5">
      <PageHeader
        title={benefit.applicationNumber}
        description={`${benefit.memberName} · ${benefit.benefitTypeName}`}
        actions={
          <>
            <StatusBadge label={benefit.status} tone={BENEFIT_STATUS_TONE[benefit.status]} className="h-7 px-3 text-sm" />
            {benefit.status === "Released" && (
              <PermissionButton permission="benefits.print" size="sm" variant="outline" render={<Link to={`/benefits/${benefit.id}/check`} />}>
                <Printer className="size-3.5" /> Print Check
              </PermissionButton>
            )}
            <PrintButton permission="benefits.print" label="Print Application" />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryStat label="Requested Amount" value={formatCurrency(benefit.requestedAmount)} />
        <SummaryStat label="Approved Amount" value={benefit.approvedAmount != null ? formatCurrency(benefit.approvedAmount) : "—"} />
        <SummaryStat label="Released Amount" value={benefit.actualReleasedAmount != null ? formatCurrency(benefit.actualReleasedAmount) : "—"} />
        <SummaryStat label="Release Date" value={formatDateShort(benefit.releaseDate)} />
        <SummaryStat label="Release Reference" value={benefit.releaseReferenceNumber || "—"} />
      </div>

      <Tabs defaultValue="summary">
        <TabsList className="flex-wrap">
          <TabsTrigger value="summary">Application Summary</TabsTrigger>
          <TabsTrigger value="payment">Payment Status</TabsTrigger>
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

        <TabsContent value="payment" className="mt-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claimed</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Release Date</TableHead>
                  <TableHead>Release Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold">{formatCurrency(claimedAmount)}</TableCell>
                  <TableCell className="font-semibold text-success">{formatCurrency(paidAmount)}</TableCell>
                  <TableCell className={balanceAmount > 0 ? "font-semibold text-destructive" : "font-semibold"}>{formatCurrency(balanceAmount)}</TableCell>
                  <TableCell><StatusBadge label={paymentStatus} tone={paymentStatus === "Fully Released" ? "success" : paymentStatus === "Partially Released" ? "warning" : "info"} /></TableCell>
                  <TableCell>{benefit.releaseDate ? formatDateShort(benefit.releaseDate) : "—"}</TableCell>
                  <TableCell>{benefit.releaseReferenceNumber || "—"}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          {paymentStatus === "Partially Released" && (
            <p className="mt-3 text-xs text-destructive">
              {formatCurrency(balanceAmount)} of the approved amount was not released. This benefit's approval is already complete, so there is currently no way to release the remaining balance for this application — releasing again is not supported once a benefit is Released. If this wasn't intentional, contact your system administrator.
            </p>
          )}
        </TabsContent>

        <TabsContent value="requirements" className="mt-4">
          <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold"><FileCheck className="size-4 text-primary" /> Submitted Requirements</h3>
              <p className="mt-1 text-xs text-muted-foreground">Documents uploaded with this benefit application.</p>
            </div>
            <ul className="space-y-3">
              {benefit.requirements.map((req) => (
                <li key={req.label} className="rounded-xl border border-border/70 p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-semibold"><span className={`flex size-5 items-center justify-center rounded-full text-xs ${req.completed ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{req.completed ? "✓" : "—"}</span>{req.label}</span>
                    <StatusBadge label={req.completed ? "Submitted" : "Missing"} tone={req.completed ? "success" : "warning"} />
                  </div>
                  <div className="mt-2 space-y-2">
                    {(benefit.documents ?? []).filter((document) => document.requirementLabel === req.label).map((document) => <DocumentRow key={document.id} document={document} />)}
                    {req.completed && !(benefit.documents ?? []).some((document) => document.requirementLabel === req.label) && <p className="text-xs text-muted-foreground">Checklist completed before document storage tracking was enabled.</p>}
                  </div>
                </li>
              ))}
            </ul>
            {(benefit.documents ?? []).filter((document) => !benefit.requirements.some((requirement) => requirement.label === document.requirementLabel)).length > 0 && (
              <div className="border-t pt-4"><h4 className="mb-2 text-xs font-bold uppercase text-muted-foreground">Additional Documents</h4><div className="space-y-2">{(benefit.documents ?? []).filter((document) => !benefit.requirements.some((requirement) => requirement.label === document.requirementLabel)).map((document) => <DocumentRow key={document.id} document={document} />)}</div></div>
            )}
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

function DocumentRow({ document }: { document: BenefitDocument }) {
  return <DocumentCard
    title={document.requirementLabel ?? "Submitted Document"}
    fileName={document.fileName}
    fileUrl={document.fileUrl}
    fileSize={document.fileSizeBytes != null ? formatFileSize(document.fileSizeBytes) : document.fileSize}
    uploadedAt={document.uploadedAt ? formatDateShort(document.uploadedAt) : undefined}
    uploadedBy={document.uploadedBy}
  />
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
