import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  FileCheck,
  FileText,
  HeartHandshake,
  Printer,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Receipt,
  Gift,
  Coins,
  AlertTriangle,
} from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { getBenefit, getBenefitApprovalHistory } from "@/services/benefits.service"
import { BENEFIT_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { formatFileSize } from "@/lib/upload-validation"
import { cn } from "@/lib/utils"
import type { BenefitDocument } from "@/types"

export default function BenefitDetailPage() {
  const { id = "" } = useParams()
  const { data: benefit, isLoading } = useQuery({
    queryKey: ["benefits", id],
    queryFn: () => getBenefit(id),
  })
  const { data: history = [] } = useQuery({
    queryKey: ["benefits", id, "history"],
    queryFn: () => getBenefitApprovalHistory(id),
  })

  useBreadcrumbExtra(benefit?.applicationNumber)

  if (isLoading) return <ProfileSkeleton cards={2} />
  if (!benefit) {
    return (
      <EmptyState
        icon={HeartHandshake}
        title="Benefit application not found"
        description="This benefit application may have been removed or deleted."
      />
    )
  }

  const claimedAmount = benefit.approvedAmount ?? benefit.requestedAmount
  const paidAmount = benefit.actualReleasedAmount ?? 0
  const balanceAmount =
    benefit.status === "Released" ? Math.max(0, claimedAmount - paidAmount) : claimedAmount
  const paymentStatus =
    benefit.status !== "Released"
      ? "Not Yet Released"
      : balanceAmount > 0
        ? "Partially Released"
        : "Fully Released"

  return (
    <div className="space-y-6 pb-16 max-w-[1600px] mx-auto">
      {/* Top Back Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground active:scale-95"
          render={<Link to="/benefits" />}
        >
          <ArrowLeft className="size-3.5" /> Back to Benefit Applications
        </Button>
      </div>

      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/95 to-primary/5 p-6 shadow-xs backdrop-blur-xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-2xs">
              <Gift className="size-7" strokeWidth={2.2} />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-mono text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {benefit.applicationNumber}
                </h1>
                <StatusBadge
                  label={benefit.status}
                  tone={BENEFIT_STATUS_TONE[benefit.status]}
                />
              </div>

              <p className="text-xs font-medium text-muted-foreground flex flex-wrap items-center gap-1.5">
                <span className="font-heading font-semibold text-foreground/90">{benefit.memberName}</span>
                <span>·</span>
                <span className="font-mono text-muted-foreground">{benefit.memberNumber}</span>
                <span>·</span>
                <span>{benefit.benefitTypeName}</span>
                <span>·</span>
                <span className="text-foreground/80 font-semibold">{benefit.officeName}</span>
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {benefit.status === "Released" && (
              <PermissionButton
                permission="benefits.print"
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-semibold shadow-2xs hover:bg-muted active:scale-95 transition-all"
                render={<Link to={`/benefits/${benefit.id}/check`} />}
              >
                <Printer className="size-3.5" /> Print Check
              </PermissionButton>
            )}

            <PrintButton permission="benefits.print" label="Print Application" />
          </div>
        </div>

        {/* Rejection Alert */}
        {benefit.rejectionReason && (
          <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 space-y-1">
            <p className="font-heading text-xs font-bold uppercase tracking-wider text-destructive">
              Claim Rejected
            </p>
            <p className="text-xs text-foreground font-medium">{benefit.rejectionReason}</p>
          </div>
        )}

        {/* Summary Metric Ribbon */}
        <div className="mt-6 grid grid-cols-2 gap-3.5 border-t border-border/50 pt-6 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryStat
            label="Requested Aid"
            value={formatCurrency(benefit.requestedAmount)}
            icon={DollarSign}
          />
          <SummaryStat
            label="Approved Aid"
            value={benefit.approvedAmount != null ? formatCurrency(benefit.approvedAmount) : "—"}
            tone={benefit.approvedAmount != null ? "success" : undefined}
            icon={CheckCircle2}
          />
          <SummaryStat
            label="Released Aid"
            value={benefit.actualReleasedAmount != null ? formatCurrency(benefit.actualReleasedAmount) : "—"}
            tone="success"
            icon={Coins}
          />
          <SummaryStat
            label="Disbursement Date"
            value={benefit.releaseDate ? formatDateShort(benefit.releaseDate) : "Pending"}
            icon={Calendar}
          />
          <SummaryStat
            label="Release Reference"
            value={benefit.releaseReferenceNumber || "—"}
            icon={Receipt}
          />
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="summary" className="space-y-4">
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <TabsList className="inline-flex h-11 items-center gap-1 rounded-2xl border border-border/60 bg-muted/30 p-1 backdrop-blur-xs">
            <TabsTrigger value="summary" className="rounded-xl px-4 text-xs font-semibold gap-1.5">
              <FileText className="size-3.5 text-primary" /> Application Summary
            </TabsTrigger>
            <TabsTrigger value="payment" className="rounded-xl px-4 text-xs font-semibold gap-1.5">
              <Receipt className="size-3.5 text-primary" /> Payment &amp; Ledger
            </TabsTrigger>
            <TabsTrigger value="requirements" className="rounded-xl px-4 text-xs font-semibold gap-1.5">
              <FileCheck className="size-3.5 text-primary" /> Mandatory Credentials
            </TabsTrigger>
            <TabsTrigger value="approvals" className="rounded-xl px-4 text-xs font-semibold gap-1.5">
              <Clock className="size-3.5 text-primary" /> Approval History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: Summary */}
        <TabsContent value="summary" className="mt-0 space-y-6">
          <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs sm:p-6">
            <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground border-b border-border/40 pb-3 mb-4">
              Member &amp; Incident Particulars
            </h3>
            <dl className="grid grid-cols-1 gap-x-12 gap-y-3.5 text-sm md:grid-cols-2">
              <Detail label="Member ID" value={benefit.memberNumber} isMono />
              <Detail label="Office Agency" value={benefit.officeName} />
              <Detail label="Filing Date" value={formatDateShort(benefit.applicationDate)} isMono />
              <Detail label="Incident Date" value={formatDateShort(benefit.incidentDate)} isMono />
              <Detail label="Beneficiary / Recipient" value={benefit.beneficiaryOrRecipient} />
              <Detail label="Purpose / Justification" value={benefit.reason} />
            </dl>
          </div>
        </TabsContent>

        {/* TAB 2: Payment Status */}
        <TabsContent value="payment" className="mt-0 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
            <Table>
              <TableHeader className="bg-muted/20 border-b border-border/40">
                <TableRow>
                  <TableHead className="pl-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Claimed Aid
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Disbursed Total
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Remaining Balance
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Release Status
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Disbursement Date
                  </TableHead>
                  <TableHead className="pr-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Release Reference
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/30">
                <TableRow className="hover:bg-muted/20 transition-colors">
                  <TableCell className="pl-5 font-mono text-xs font-semibold text-foreground">
                    {formatCurrency(claimedAmount)}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(paidAmount)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "font-mono text-xs font-semibold",
                      balanceAmount > 0 ? "text-destructive" : "text-foreground"
                    )}
                  >
                    {formatCurrency(balanceAmount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={paymentStatus}
                      tone={
                        paymentStatus === "Fully Released"
                          ? "success"
                          : paymentStatus === "Partially Released"
                            ? "warning"
                            : "info"
                      }
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {benefit.releaseDate ? formatDateShort(benefit.releaseDate) : "—"}
                  </TableCell>
                  <TableCell className="pr-5 font-mono text-xs font-semibold text-foreground">
                    {benefit.releaseReferenceNumber || "—"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {paymentStatus === "Partially Released" && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-300">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>{formatCurrency(balanceAmount)}</strong> of the approved aid was withheld during final disbursement.
                Benefit claims are settled as one-time grants and cannot be released again automatically.
              </p>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: Requirements */}
        <TabsContent value="requirements" className="mt-0 space-y-6">
          <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs sm:p-6 space-y-5">
            <div>
              <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                <FileCheck className="size-4 text-primary" /> Submitted Supporting Credentials
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Physical and scanned documents verified for this mutual assistance claim.
              </p>
            </div>

            <ul className="space-y-3">
              {benefit.requirements.map((req) => (
                <li
                  key={req.label}
                  className={cn(
                    "rounded-2xl border p-4 transition-all duration-200",
                    req.completed
                      ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                      : "border-border/60 bg-card"
                  )}
                >
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-2.5 text-foreground">
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                          req.completed
                            ? "bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {req.completed ? "✓" : "—"}
                      </span>
                      {req.label}
                    </span>
                    <StatusBadge
                      label={req.completed ? "Submitted" : "Missing"}
                      tone={req.completed ? "success" : "warning"}
                    />
                  </div>

                  <div className="mt-3 space-y-2">
                    {(benefit.documents ?? [])
                      .filter((document) => document.requirementLabel === req.label)
                      .map((document) => (
                        <DocumentRow key={document.id} document={document} />
                      ))}
                    {req.completed &&
                      !(benefit.documents ?? []).some(
                        (document) => document.requirementLabel === req.label
                      ) && (
                        <p className="text-[11px] text-muted-foreground italic">
                          Document verification recorded prior to digital storage tracking.
                        </p>
                      )}
                  </div>
                </li>
              ))}
            </ul>

            {(benefit.documents ?? []).filter(
              (document) =>
                !benefit.requirements.some(
                  (requirement) => requirement.label === document.requirementLabel
                )
            ).length > 0 && (
              <div className="border-t border-border/40 pt-4 space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Additional Supporting Attachments
                </h4>
                <div className="space-y-2">
                  {(benefit.documents ?? [])
                    .filter(
                      (document) =>
                        !benefit.requirements.some(
                          (requirement) => requirement.label === document.requirementLabel
                        )
                    )
                    .map((document) => (
                      <DocumentRow key={document.id} document={document} />
                    ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 4: Approvals */}
        <TabsContent value="approvals" className="mt-0">
          <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xs backdrop-blur-xs">
            <ApprovalTimeline history={history} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DocumentRow({ document }: { document: BenefitDocument }) {
  return (
    <DocumentCard
      title={document.requirementLabel ?? "Submitted Document"}
      fileName={document.fileName}
      fileUrl={document.fileUrl}
      fileSize={
        document.fileSizeBytes != null ? formatFileSize(document.fileSizeBytes) : document.fileSize
      }
      uploadedAt={document.uploadedAt ? formatDateShort(document.uploadedAt) : undefined}
      uploadedBy={document.uploadedBy}
    />
  )
}

function SummaryStat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string
  value: string
  tone?: "success" | "warning"
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-2xs backdrop-blur-xs space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">{label}</p>
        {Icon && <Icon className="size-3.5 text-muted-foreground/60" />}
      </div>
      <p
        className={cn(
          "font-heading text-lg font-bold tracking-tight",
          tone === "success"
            ? "text-emerald-600 dark:text-emerald-400 font-mono"
            : tone === "warning"
              ? "text-amber-600 dark:text-amber-400 font-mono"
              : "text-foreground font-mono"
        )}
      >
        {value}
      </p>
    </div>
  )
}

function Detail({
  label,
  value,
  isMono,
}: {
  label: string
  value: string
  isMono?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 gap-4">
      <dt className="text-muted-foreground text-[11px] font-semibold shrink-0">{label}</dt>
      <dd
        className={cn(
          "font-bold text-foreground text-right text-xs truncate max-w-[240px]",
          isMono && "font-mono"
        )}
      >
        {value}
      </dd>
    </div>
  )
}