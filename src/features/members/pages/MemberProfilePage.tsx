import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Banknote,
  FileText,
  Landmark,
  PencilLine,
  Plus,
  PrinterIcon,
  UserRound,
  Wallet,
} from "lucide-react"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ProfileCompleteness } from "@/components/shared/ProfileCompleteness"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { EmptyState } from "@/components/shared/EmptyState"
import { DocumentCard } from "@/components/shared/DocumentCard"
import { DocumentGallery, type DocumentGalleryItem } from "@/components/shared/DocumentGallery"
import { ImagePreviewDialog } from "@/components/shared/ImagePreviewDialog"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { IndeterminateBar } from "@/components/shared/loaders/IndeterminateBar"
import { Skeleton } from "@/components/ui/skeleton"
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ReloanButton } from "@/features/loans/components/ReloanButton"
import { getMember, profileCompleteness } from "@/services/members.service"
import { getAllContributions } from "@/services/contributions.service"
import { listAllLoans } from "@/services/loans.service"
import { listAllLoanPayments } from "@/services/loan-payments.service"
import { listAllDeductions } from "@/services/deductions.service"
import { listDeductionTypes } from "@/services/deduction-types.service"
import { getAllBenefits } from "@/services/benefits.service"
import { MEMBERSHIP_STATUS_TONE, LOAN_STATUS_TONE, BENEFIT_STATUS_TONE, CONTRIBUTION_STATUS_TONE } from "@/constants/status"
import { calculateAge, calculateDurationLabel, formatCurrency, formatDateShort, initialsFromName } from "@/utils/format"

export default function MemberProfilePage() {
  const { id = "" } = useParams()
  const { data: member, isLoading } = useQuery({ queryKey: ["members", id], queryFn: () => getMember(id) })
  const { data: allPayments = [], isLoading: isLoadingPayments } = useQuery({ queryKey: ["loan-payments", "all"], queryFn: listAllLoanPayments })
  const { data: allLoans = [] } = useQuery({ queryKey: ["loans", "all"], queryFn: listAllLoans })
  const { data: allDeductions = [] } = useQuery({ queryKey: ["deductions", "all"], queryFn: listAllDeductions })
  const { data: deductionTypes = [] } = useQuery({ queryKey: ["deduction-types"], queryFn: listDeductionTypes })
  const [photoPreviewOpen, setPhotoPreviewOpen] = React.useState(false)

  useBreadcrumbExtra(member?.fullName)

  if (isLoading) return <ProfileSkeleton cards={2} />
  if (!member) return <EmptyState icon={UserRound} title="Member not found" description="This member record may have been archived or removed." />

  const contributions = getAllContributions().filter((c) => c.memberId === member.id)
  const loans = allLoans.filter((l) => l.memberId === member.id)
  const payments = allPayments.filter((p) => p.memberId === member.id)
  const benefits = getAllBenefits().filter((b) => b.memberId === member.id)
  const memberDeductions = allDeductions.filter((deduction) => deduction.memberId === member.id)

  const outstandingBalance = loans.reduce((sum, l) => sum + l.outstandingBalance, 0)
  const totalContributions = contributions.filter((c) => c.status === "Posted").reduce((sum, c) => sum + c.amount, 0)
  const totalBenefits = benefits.filter((b) => b.status === "Released" || b.status === "Completed").reduce((sum, b) => sum + (b.approvedAmount ?? 0), 0)
  const completeness = profileCompleteness(member)

  return (
    <div className="space-y-6 pb-12">
      
      {/* Premium Profile Heading Card */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/90 p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => member.profilePhotoUrl && setPhotoPreviewOpen(true)}
              className={`shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring transition-transform duration-300 hover:scale-[1.02] hover:shadow-md ${member.profilePhotoUrl ? "cursor-zoom-in" : "cursor-default"}`}
              aria-label={member.profilePhotoUrl ? "View profile photo" : undefined}
            >
              <Avatar size="lg">
                {member.profilePhotoUrl && <AvatarImage src={member.profilePhotoUrl} alt={member.fullName} />}
                <AvatarFallback className="bg-primary text-lg text-primary-foreground font-semibold">{initialsFromName(member.fullName)}</AvatarFallback>
              </Avatar>
            </button>
            <div className="space-y-1">
              <h1 className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-2xl">{member.fullName}</h1>
              <p className="text-sm font-medium text-muted-foreground">{member.memberNumber} · {member.position} · {member.officeName}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                <StatusBadge label={member.membershipStatus} tone={MEMBERSHIP_STATUS_TONE[member.membershipStatus]} />
                {member.retireeStatus === "Retired" && <StatusBadge label="Retired" tone="gold" />}
                <ProfileCompleteness percentage={completeness} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <PermissionButton
              permission="members.update"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs hover:bg-accent/80 active:scale-97 transition-all"
              render={<Link to={`/members/${member.id}/edit`} />}
            >
              <PencilLine className="size-3.5" /> Edit Profile
            </PermissionButton>
            <PermissionButton
              permission="members.print"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs hover:bg-accent/80 active:scale-97 transition-all"
            >
              <PrinterIcon className="size-3.5" /> Print Profile
            </PermissionButton>
          </div>
        </div>

        {/* Structured summary metrics widget panels */}
        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border/60 pt-5 sm:grid-cols-3">
          <SummaryStat label="Outstanding Loan Balance" value={formatCurrency(outstandingBalance)} tone={outstandingBalance > 0 ? "danger" : undefined} />
          <SummaryStat label="Total Contributions" value={formatCurrency(totalContributions)} />
          <SummaryStat label="Total Benefits Received" value={formatCurrency(totalBenefits)} />
        </div>

        {/* Quick Action Button tray */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border/60 pt-5">
          <PermissionButton 
            permission="contributions.create" 
            variant="secondary" 
            size="sm" 
            className="h-8 gap-1.5 text-xs active:scale-97 transition-all"
            render={<Link to={`/contributions/new?member=${member.id}`} />}
          >
            <Wallet className="size-3.5 text-muted-foreground" /> Record Contribution
          </PermissionButton>
          <PermissionButton 
            permission="loans.create" 
            variant="secondary" 
            size="sm" 
            className="h-8 gap-1.5 text-xs active:scale-97 transition-all"
            render={<Link to={`/loans/new?member=${member.id}`} />}
          >
            <Landmark className="size-3.5 text-muted-foreground" /> Create Loan
          </PermissionButton>
          <PermissionButton 
            permission="loan_payments.create" 
            variant="secondary" 
            size="sm" 
            className="h-8 gap-1.5 text-xs active:scale-97 transition-all"
            render={<Link to={`/loan-payments/new?member=${member.id}`} />}
          >
            <Banknote className="size-3.5 text-muted-foreground" /> Record Payment
          </PermissionButton>
          <PermissionButton 
            permission="benefits.create" 
            variant="secondary" 
            size="sm" 
            className="h-8 gap-1.5 text-xs active:scale-97 transition-all"
            render={<Link to={`/benefits/new?member=${member.id}`} />}
          >
            <Plus className="size-3.5 text-muted-foreground" /> Create Benefit Request
          </PermissionButton>
        </div>
      </div>

      {/* Tabs list navigation panel */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap bg-muted/30 border border-border/40 p-1 rounded-xl">
          <TabsTrigger value="overview" className="text-xs font-semibold">Overview</TabsTrigger>
          <TabsTrigger value="employment" className="text-xs font-semibold">Employment</TabsTrigger>
          <TabsTrigger value="beneficiaries" className="text-xs font-semibold">Beneficiaries</TabsTrigger>
          <TabsTrigger value="contributions" className="text-xs font-semibold">Contributions</TabsTrigger>
          {deductionTypes.filter((deductionType) => deductionType.isActive).map((deductionType) => (
            <TabsTrigger key={deductionType.id} value={`deduction-${deductionType.id}`} className="text-xs font-semibold">
              {deductionType.name}
            </TabsTrigger>
          ))}
          <TabsTrigger value="loans" className="text-xs font-semibold">Loans</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs font-semibold">Loan Payments</TabsTrigger>
          <TabsTrigger value="benefits" className="text-xs font-semibold">Benefits</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs font-semibold">Documents</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs font-semibold">Activity History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <dl className="grid grid-cols-1 gap-x-12 gap-y-3 text-sm md:grid-cols-2">
              <Detail label="Sex" value={member.sex} />
              <Detail label="Birthdate" value={`${formatDateShort(member.birthdate)} (${calculateAge(member.birthdate)} years old)`} />
              <Detail label="Civil Status" value={member.civilStatus} />
              <Detail label="Name of Spouse" value={member.nameOfSpouse || "—"} />
              <Detail label="Cellphone Number" value={member.cellphoneNumber} />
              <Detail label="Email Address" value={member.email || "—"} />
              <Detail label="Permanent Address" value={member.permanentAddress} />
              <Detail label="Membership Type" value={member.membershipType} />
              <Detail label="Membership Date" value={`${formatDateShort(member.membershipDate)} (${calculateDurationLabel(member.membershipDate)})`} />
              <Detail label="Remarks" value={member.remarks || "—"} />
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="employment" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <dl className="grid grid-cols-1 gap-x-12 gap-y-3.5 text-sm md:grid-cols-2">
              <Detail label="Present Office" value={member.officeName} />
              <Detail label="Position" value={member.position} />
              <Detail label="Date of Regular Appointment" value={formatDateShort(member.dateOfRegularAppointment)} />
              <Detail label="Length of Government Service" value={calculateDurationLabel(member.dateOfRegularAppointment)} />
              <Detail label="Employment Status" value={member.employmentStatus} />
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="beneficiaries" className="mt-4">
          {member.beneficiaries.length === 0 ? (
            <EmptyState title="No beneficiaries on record" description="Add beneficiaries when editing this member's profile." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Full Name</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Relationship</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Birthdate</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Contact Number</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Share %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.beneficiaries.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-semibold text-foreground py-3">{b.fullName}</TableCell>
                      <TableCell className="py-3">{b.relationship}</TableCell>
                      <TableCell className="py-3">{formatDateShort(b.birthdate)}</TableCell>
                      <TableCell className="py-3">{b.contactNumber || "—"}</TableCell>
                      <TableCell className="font-medium py-3">{b.sharePercentage != null ? `${b.sharePercentage}%` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="contributions" className="mt-4">
          {contributions.length === 0 ? (
            <EmptyState title="No contributions on record" />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Reference #</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Period</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Amount</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Payment Date</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contributions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold text-foreground py-3">{c.referenceNumber}</TableCell>
                      <TableCell className="py-3">{c.contributionPeriod}</TableCell>
                      <TableCell className="py-3">{formatCurrency(c.amount)}</TableCell>
                      <TableCell className="py-3">{formatDateShort(c.paymentDate)}</TableCell>
                      <TableCell className="py-3"><StatusBadge label={c.status} tone={CONTRIBUTION_STATUS_TONE[c.status]} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {deductionTypes.filter((deductionType) => deductionType.isActive).map((deductionType) => {
          const records = memberDeductions.filter((deduction) => deduction.deductionTypeId === deductionType.id)
          return (
            <TabsContent key={deductionType.id} value={`deduction-${deductionType.id}`} className="mt-4">
              {records.length === 0 ? (
                <EmptyState title={`No ${deductionType.name} deductions on record`} />
              ) : (
                <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Reference #</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Period</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Amount</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Payment Date</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Payroll Reference</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((deduction) => (
                        <TableRow key={deduction.id}>
                          <TableCell className="font-semibold text-foreground py-3">{deduction.referenceNumber}</TableCell>
                          <TableCell className="py-3">{deduction.period}</TableCell>
                          <TableCell className="py-3">{formatCurrency(deduction.amount)}</TableCell>
                          <TableCell className="py-3">{formatDateShort(deduction.paymentDate)}</TableCell>
                          <TableCell className="py-3">{deduction.payrollReference || "—"}</TableCell>
                          <TableCell className="py-3">
                            <StatusBadge label={deduction.status} tone={deduction.status === "Posted" ? "success" : "neutral"} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          )
        })}

        <TabsContent value="loans" className="mt-4">
          {loans.length === 0 ? (
            <EmptyState title="No loan applications on record" />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Application #</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Loan Type</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Requested Amount</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Outstanding Balance</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Status</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="py-3">
                        <Link to={`/loans/${l.id}`} className="font-semibold text-primary hover:underline">{l.applicationNumber}</Link>
                        {l.applicationType === "reloan" && <span className="ml-1.5 text-xs text-muted-foreground">(Reloan #{l.reloanSequence ?? 1})</span>}
                      </TableCell>
                      <TableCell className="py-3">{l.loanTypeName}</TableCell>
                      <TableCell className="py-3">{formatCurrency(l.requestedAmount)}</TableCell>
                      <TableCell className="py-3">{formatCurrency(l.outstandingBalance)}</TableCell>
                      <TableCell className="py-3"><StatusBadge label={l.status} tone={LOAN_STATUS_TONE[l.status]} /></TableCell>
                      <TableCell className="py-3 text-right">
                        <ReloanButton loan={l} eligible={["Fully Paid", "Active", "Released"].includes(l.status)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          {isLoadingPayments ? (
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
              <IndeterminateBar className="rounded-none" />
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            </div>
          ) : payments.length === 0 ? (
            <EmptyState title="No loan payments on record" />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Reference #</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Loan Application #</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Payment Date</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Amount Paid</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold text-foreground py-3">{p.paymentReferenceNumber}</TableCell>
                      <TableCell className="py-3">{p.loanApplicationNumber}</TableCell>
                      <TableCell className="py-3">{formatDateShort(p.paymentDate)}</TableCell>
                      <TableCell className="py-3">{formatCurrency(p.amountPaid)}</TableCell>
                      <TableCell className="py-3"><StatusBadge label={p.status} tone={p.status === "Posted" ? "success" : "danger"} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="benefits" className="mt-4">
          {benefits.length === 0 ? (
            <EmptyState title="No benefit applications on record" />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Application #</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Benefit Type</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Requested Amount</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benefits.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="py-3">
                        <Link to={`/benefits/${b.id}`} className="font-semibold text-primary hover:underline">{b.applicationNumber}</Link>
                      </TableCell>
                      <TableCell className="py-3">{b.benefitTypeName}</TableCell>
                      <TableCell className="py-3">{formatCurrency(b.requestedAmount)}</TableCell>
                      <TableCell className="py-3"><StatusBadge label={b.status} tone={BENEFIT_STATUS_TONE[b.status]} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          {member.documents.length === 0 ? (
            <EmptyState icon={FileText} title="No documents uploaded" description="Documents can be uploaded when editing this member's profile." />
          ) : (
            <DocumentGallery
              items={member.documents.map(
                (doc): DocumentGalleryItem => ({
                  key: doc.id,
                  category: doc.category,
                  node: (
                    <DocumentCard
                      title={doc.category}
                      fileName={doc.fileName}
                      fileUrl={doc.fileUrl}
                      fileSize={doc.fileSize}
                      uploadedAt={formatDateShort(doc.uploadedAt)}
                      uploadedBy={doc.uploadedBy}
                    />
                  ),
                })
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <dl className="grid grid-cols-1 gap-x-12 gap-y-3.5 text-sm md:grid-cols-2">
              <Detail label="Record Created" value={`${formatDateShort(member.createdAt)} by ${member.createdBy}`} />
              <Detail label="Last Updated" value={formatDateShort(member.updatedAt)} />
            </dl>
          </div>
        </TabsContent>
      </Tabs>

      {member.profilePhotoUrl && (
        <ImagePreviewDialog
          open={photoPreviewOpen}
          onOpenChange={setPhotoPreviewOpen}
          images={[{ url: member.profilePhotoUrl, name: `${member.fullName} — Profile Photo` }]}
        />
      )}
    </div>
  )
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/10 px-4 py-3 shadow-inner">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">{label}</p>
      <p className={`font-heading text-lg font-bold tracking-tight mt-1 ${tone === "danger" ? "text-destructive" : "text-foreground"}`}>{value}</p>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/30 pb-2.5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/85 shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-foreground text-left sm:text-right truncate max-w-md">{value}</dd>
    </div>
  )
}
