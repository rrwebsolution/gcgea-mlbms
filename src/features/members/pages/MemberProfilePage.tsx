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
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getMember, profileCompleteness } from "@/services/members.service"
import { getAllContributions } from "@/services/contributions.service"
import { getAllLoans } from "@/services/loans.service"
import { getAllLoanPayments } from "@/services/loan-payments.service"
import { getAllBenefits } from "@/services/benefits.service"
import { MEMBERSHIP_STATUS_TONE, LOAN_STATUS_TONE, BENEFIT_STATUS_TONE, CONTRIBUTION_STATUS_TONE } from "@/constants/status"
import { calculateAge, calculateDurationLabel, formatCurrency, formatDateShort, initialsFromName } from "@/utils/format"

export default function MemberProfilePage() {
  const { id = "" } = useParams()
  const { data: member, isLoading } = useQuery({ queryKey: ["members", id], queryFn: () => getMember(id) })

  useBreadcrumbExtra(member?.fullName)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading member profile…</p>
  if (!member) return <EmptyState icon={UserRound} title="Member not found" description="This member record may have been archived or removed." />

  const contributions = getAllContributions().filter((c) => c.memberId === member.id)
  const loans = getAllLoans().filter((l) => l.memberId === member.id)
  const payments = getAllLoanPayments().filter((p) => p.memberId === member.id)
  const benefits = getAllBenefits().filter((b) => b.memberId === member.id)

  const outstandingBalance = loans.reduce((sum, l) => sum + l.outstandingBalance, 0)
  const totalContributions = contributions.filter((c) => c.status === "Posted").reduce((sum, c) => sum + c.amount, 0)
  const totalBenefits = benefits.filter((b) => b.status === "Released" || b.status === "Completed").reduce((sum, b) => sum + (b.approvedAmount ?? 0), 0)
  const completeness = profileCompleteness(member)

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar size="lg">
              <AvatarFallback className="bg-primary text-lg text-primary-foreground">{initialsFromName(member.fullName)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h1 className="font-heading text-lg font-semibold text-foreground sm:text-xl">{member.fullName}</h1>
              <p className="text-sm text-muted-foreground">{member.memberNumber} · {member.position} · {member.officeName}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusBadge label={member.membershipStatus} tone={MEMBERSHIP_STATUS_TONE[member.membershipStatus]} />
                {member.retireeStatus === "Retired" && <StatusBadge label="Retired" tone="gold" />}
                <ProfileCompleteness percentage={completeness} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <PermissionButton permission="members.update" variant="outline" size="sm" render={<Link to={`/members/${member.id}/edit`} />}>
              <PencilLine />
              Edit Profile
            </PermissionButton>
            <PermissionButton permission="members.print" variant="outline" size="sm">
              <PrinterIcon />
              Print Profile
            </PermissionButton>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-3">
          <SummaryStat label="Outstanding Loan Balance" value={formatCurrency(outstandingBalance)} tone={outstandingBalance > 0 ? "danger" : undefined} />
          <SummaryStat label="Total Contributions" value={formatCurrency(totalContributions)} />
          <SummaryStat label="Total Benefits Received" value={formatCurrency(totalBenefits)} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          <PermissionButton permission="contributions.create" variant="secondary" size="sm" render={<Link to={`/contributions/new?member=${member.id}`} />}>
            <Wallet />
            Record Contribution
          </PermissionButton>
          <PermissionButton permission="loans.create" variant="secondary" size="sm" render={<Link to={`/loans/new?member=${member.id}`} />}>
            <Landmark />
            Create Loan
          </PermissionButton>
          <PermissionButton permission="loan_payments.create" variant="secondary" size="sm" render={<Link to="/loan-payments" />}>
            <Banknote />
            Record Payment
          </PermissionButton>
          <PermissionButton permission="benefits.create" variant="secondary" size="sm" render={<Link to={`/benefits/new?member=${member.id}`} />}>
            <Plus />
            Create Benefit Request
          </PermissionButton>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="beneficiaries">Beneficiaries</TabsTrigger>
          <TabsTrigger value="contributions">Contributions</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="payments">Loan Payments</TabsTrigger>
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
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
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
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
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Relationship</TableHead>
                    <TableHead>Birthdate</TableHead>
                    <TableHead>Contact Number</TableHead>
                    <TableHead>Share %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.beneficiaries.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-foreground">{b.fullName}</TableCell>
                      <TableCell>{b.relationship}</TableCell>
                      <TableCell>{formatDateShort(b.birthdate)}</TableCell>
                      <TableCell>{b.contactNumber || "—"}</TableCell>
                      <TableCell>{b.sharePercentage != null ? `${b.sharePercentage}%` : "—"}</TableCell>
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
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference #</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contributions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-foreground">{c.referenceNumber}</TableCell>
                      <TableCell>{c.contributionPeriod}</TableCell>
                      <TableCell>{formatCurrency(c.amount)}</TableCell>
                      <TableCell>{formatDateShort(c.paymentDate)}</TableCell>
                      <TableCell><StatusBadge label={c.status} tone={CONTRIBUTION_STATUS_TONE[c.status]} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="loans" className="mt-4">
          {loans.length === 0 ? (
            <EmptyState title="No loan applications on record" />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application #</TableHead>
                    <TableHead>Loan Type</TableHead>
                    <TableHead>Requested Amount</TableHead>
                    <TableHead>Outstanding Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Link to={`/loans/${l.id}`} className="font-medium text-primary hover:underline">{l.applicationNumber}</Link>
                      </TableCell>
                      <TableCell>{l.loanTypeName}</TableCell>
                      <TableCell>{formatCurrency(l.requestedAmount)}</TableCell>
                      <TableCell>{formatCurrency(l.outstandingBalance)}</TableCell>
                      <TableCell><StatusBadge label={l.status} tone={LOAN_STATUS_TONE[l.status]} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          {payments.length === 0 ? (
            <EmptyState title="No loan payments on record" />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference #</TableHead>
                    <TableHead>Loan Application #</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-foreground">{p.paymentReferenceNumber}</TableCell>
                      <TableCell>{p.loanApplicationNumber}</TableCell>
                      <TableCell>{formatDateShort(p.paymentDate)}</TableCell>
                      <TableCell>{formatCurrency(p.amountPaid)}</TableCell>
                      <TableCell><StatusBadge label={p.status} tone={p.status === "Posted" ? "success" : "danger"} /></TableCell>
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
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application #</TableHead>
                    <TableHead>Benefit Type</TableHead>
                    <TableHead>Requested Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benefits.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <Link to={`/benefits/${b.id}`} className="font-medium text-primary hover:underline">{b.applicationNumber}</Link>
                      </TableCell>
                      <TableCell>{b.benefitTypeName}</TableCell>
                      <TableCell>{formatCurrency(b.requestedAmount)}</TableCell>
                      <TableCell><StatusBadge label={b.status} tone={BENEFIT_STATUS_TONE[b.status]} /></TableCell>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {member.documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground">{doc.category} · {doc.fileSize} · {formatDateShort(doc.uploadedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Detail label="Record Created" value={`${formatDateShort(member.createdAt)} by ${member.createdBy}`} />
              <Detail label="Last Updated" value={formatDateShort(member.updatedAt)} />
            </dl>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-heading text-base font-semibold ${tone === "danger" ? "text-destructive" : "text-foreground"}`}>{value}</p>
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
