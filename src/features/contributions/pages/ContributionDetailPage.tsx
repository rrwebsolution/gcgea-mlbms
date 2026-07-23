import * as React from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Ban, FileText, Pencil, PlusCircle, Wallet } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PrintButton } from "@/components/shared/PrintButton"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { VoidTransactionDialog } from "@/components/shared/VoidTransactionDialog"
import { ActivityTimeline, type TimelineEntry } from "@/components/shared/ActivityTimeline"
import { EmptyState } from "@/components/shared/EmptyState"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getContribution, getAllContributions, voidContribution } from "@/services/contributions.service"
import { getMember } from "@/services/members.service"
import { CONTRIBUTION_STATUS_TONE, MEMBERSHIP_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort, initialsFromName } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"

export default function ContributionDetailPage() {
  const { id = "" } = useParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data: contribution, isLoading } = useQuery({ queryKey: ["contributions", id], queryFn: () => getContribution(id) })
  const { data: member } = useQuery({
    queryKey: ["members", contribution?.memberId],
    queryFn: () => getMember(contribution!.memberId),
    enabled: !!contribution,
  })

  const [showVoidDialog, setShowVoidDialog] = React.useState(false)
  const [isVoiding, setIsVoiding] = React.useState(false)

  useBreadcrumbExtra(contribution?.referenceNumber)

  const memberContributionHistory = contribution
    ? getAllContributions().filter((c) => c.memberId === contribution.memberId && c.id !== contribution.id).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
    : []

  async function handleVoid(reason: string) {
    if (!contribution || !user) return
    setIsVoiding(true)
    try {
      await voidContribution(contribution.id, reason)
      await queryClient.invalidateQueries({ queryKey: ["contributions"] })
      toast.success("Contribution voided.")
      setShowVoidDialog(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to void this contribution.")
    } finally {
      setIsVoiding(false)
    }
  }

  if (isLoading) return <ProfileSkeleton cards={1} showTabs={false} />
  if (!contribution) return <EmptyState icon={Wallet} title="Contribution record not found" description="This contribution record may have been removed." />

  const timelineEntries: TimelineEntry[] = [
    { id: "created", title: "Contribution Posted", description: `Recorded by ${contribution.encodedBy}`, timestamp: contribution.createdAt, actor: contribution.encodedBy, icon: PlusCircle, tone: "success" },
  ]
  if (contribution.updatedAt && contribution.updatedAt !== contribution.createdAt && contribution.status !== "Voided") {
    timelineEntries.push({ id: "updated", title: "Contribution Updated", timestamp: contribution.updatedAt, icon: Pencil, tone: "info" })
  }
  if (contribution.status === "Voided" && contribution.voidedAt) {
    timelineEntries.push({
      id: "voided",
      title: "Contribution Voided",
      description: contribution.voidReason,
      timestamp: contribution.voidedAt,
      actor: contribution.voidedBy,
      icon: Ban,
      tone: "danger",
    })
  }
  timelineEntries.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  return (
    <div className="space-y-5">
      <PageHeader
        title={contribution.referenceNumber}
        description={`${contribution.memberName} · ${contribution.contributionPeriod}`}
        actions={
          <>
            <StatusBadge label={contribution.status} tone={CONTRIBUTION_STATUS_TONE[contribution.status]} className="h-7 px-3 text-sm" />
            <PrintButton permission="contributions.print" label="Print Receipt" />
            {contribution.status === "Posted" && (
              <PermissionButton permission="contributions.update" variant="outline" render={<Link to={`/contributions/${contribution.id}/edit`} />}>
                <Pencil /> Edit
              </PermissionButton>
            )}
            {contribution.status === "Posted" && (
              <PermissionButton permission="contributions.void" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setShowVoidDialog(true)}>
                <Ban /> Void
              </PermissionButton>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="Amount" value={formatCurrency(contribution.amount)} />
        <SummaryStat label="Payment Method" value={contribution.paymentMethod} />
        <SummaryStat label="Payment Date" value={formatDateShort(contribution.paymentDate)} />
        <SummaryStat label="Encoded By" value={contribution.encodedBy} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="member">Member</TabsTrigger>
          <TabsTrigger value="payment">Payment Information</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="activity">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Contribution Details</h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Detail label="Reference No." value={contribution.referenceNumber} />
              <Detail label="Contribution Period" value={contribution.contributionPeriod} />
              <Detail label="Amount" value={formatCurrency(contribution.amount)} />
              <Detail label="Payment Method" value={contribution.paymentMethod} />
              <Detail label="Status" value={contribution.status} />
              <Detail label="Encoded By" value={contribution.encodedBy} />
              <Detail label="Payment Date" value={formatDateShort(contribution.paymentDate)} />
              <Detail label="Remarks" value={contribution.remarks || "—"} />
            </dl>
          </div>
          {contribution.status === "Voided" && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <h3 className="mb-1 text-sm font-semibold text-destructive">Void Reason</h3>
              <p className="text-sm text-foreground">{contribution.voidReason}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Voided by {contribution.voidedBy} on {formatDateShort(contribution.voidedAt)}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="member" className="mt-4 space-y-4">
          {member ? (
            <>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Avatar size="lg">
                    <AvatarFallback className="bg-primary text-primary-foreground">{initialsFromName(member.fullName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Link to={`/members/${member.id}`} className="font-heading text-base font-semibold text-foreground hover:text-primary hover:underline">
                      {member.fullName}
                    </Link>
                    <p className="text-sm text-muted-foreground">{member.memberNumber} · {member.position}</p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">Member Number</dt>
                    <dd className="text-sm font-medium text-foreground">{member.memberNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Office</dt>
                    <dd className="text-sm font-medium text-foreground">{member.officeName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Position</dt>
                    <dd className="text-sm font-medium text-foreground">{member.position}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Membership Status</dt>
                    <dd><StatusBadge label={member.membershipStatus} tone={MEMBERSHIP_STATUS_TONE[member.membershipStatus]} /></dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-border bg-card shadow-sm">
                <h3 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">Contribution History</h3>
                {memberContributionHistory.length === 0 ? (
                  <EmptyState className="border-0" icon={Wallet} title="No other contributions" description="This member has no other contribution records." />
                ) : (
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
                      {memberContributionHistory.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-foreground">
                            <Link to={`/contributions/${c.id}`} className="hover:text-primary hover:underline">{c.referenceNumber}</Link>
                          </TableCell>
                          <TableCell>{c.contributionPeriod}</TableCell>
                          <TableCell>{formatCurrency(c.amount)}</TableCell>
                          <TableCell>{formatDateShort(c.paymentDate)}</TableCell>
                          <TableCell><StatusBadge label={c.status} tone={CONTRIBUTION_STATUS_TONE[c.status]} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Loading member information…</p>
          )}
        </TabsContent>

        <TabsContent value="payment" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Detail label="Amount" value={formatCurrency(contribution.amount)} />
              <Detail label="Payment Method" value={contribution.paymentMethod} />
              <Detail label="Official Receipt Number" value={contribution.officialReceiptNumber || "—"} />
              <Detail label="Payroll Reference" value={contribution.payrollReference || "—"} />
              <Detail label="Payment Date" value={formatDateShort(contribution.paymentDate)} />
              <Detail label="Contribution Period" value={contribution.contributionPeriod} />
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Detail label="Created" value={formatDateShort(contribution.createdAt)} />
              <Detail label="Updated" value={contribution.updatedAt ? formatDateShort(contribution.updatedAt) : "—"} />
              <Detail label="Voided" value={contribution.voidedAt ? formatDateShort(contribution.voidedAt) : "—"} />
              <Detail label="Modified By" value={contribution.voidedBy ?? contribution.encodedBy} />
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <ActivityTimeline entries={timelineEntries} />
          </div>
        </TabsContent>
      </Tabs>

      <Link to="/contributions" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <FileText className="size-3.5" />
        Back to Contribution Records
      </Link>

      <VoidTransactionDialog
        open={showVoidDialog}
        onOpenChange={setShowVoidDialog}
        transactionLabel={`Contribution ${contribution.referenceNumber}`}
        isLoading={isVoiding}
        onConfirm={handleVoid}
      />
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
