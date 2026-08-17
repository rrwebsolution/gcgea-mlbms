import * as React from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Ban,
  Pencil,
  PlusCircle,
  Wallet,
  Receipt,
  Calendar,
  User,
  CreditCard,
  ArrowLeft,
  Coins,
  Link2,
} from "lucide-react"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PrintButton } from "@/components/shared/PrintButton"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { VoidTransactionDialog } from "@/components/shared/VoidTransactionDialog"
import { ActivityTimeline, type TimelineEntry } from "@/components/shared/ActivityTimeline"
import { EmptyState } from "@/components/shared/EmptyState"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getContribution, getAllContributions, voidContribution } from "@/services/contributions.service"
import { getMember } from "@/services/members.service"
import { listAllDeductions } from "@/services/deductions.service"
import { listDeductionTypes } from "@/services/deduction-types.service"
import { CONTRIBUTION_STATUS_TONE, MEMBERSHIP_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort, initialsFromName } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"

export default function ContributionDetailPage() {
  const { id = "" } = useParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data: contribution, isLoading } = useQuery({
    queryKey: ["contributions", id],
    queryFn: () => getContribution(id),
  })
  const { data: member } = useQuery({
    queryKey: ["members", contribution?.memberId],
    queryFn: () => getMember(contribution!.memberId),
    enabled: !!contribution,
  })
  const { data: allDeductions = [] } = useQuery({
    queryKey: ["deductions", "all"],
    queryFn: listAllDeductions,
  })
  const { data: deductionTypes = [] } = useQuery({
    queryKey: ["deduction-types"],
    queryFn: listDeductionTypes,
  })

  const [showVoidDialog, setShowVoidDialog] = React.useState(false)
  const [isVoiding, setIsVoiding] = React.useState(false)
  const [historyPeriod, setHistoryPeriod] = React.useState("")
  const [historyDateFrom, setHistoryDateFrom] = React.useState("")
  const [historyDateTo, setHistoryDateTo] = React.useState("")

  useBreadcrumbExtra(contribution?.referenceNumber)

  const memberContributionHistory = contribution
    ? getAllContributions()
        .filter((c) => c.memberId === contribution.memberId && c.id !== contribution.id)
        .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
    : []

  const filteredMemberContributionHistory = memberContributionHistory.filter((item) => {
    if (historyPeriod && item.contributionPeriod !== historyPeriod) return false
    if (historyDateFrom && item.paymentDate < historyDateFrom) return false
    if (historyDateTo && item.paymentDate > historyDateTo) return false
    return true
  })
  const hasHistoryFilters = Boolean(historyPeriod || historyDateFrom || historyDateTo)

  function clearHistoryFilters() {
    setHistoryPeriod("")
    setHistoryDateFrom("")
    setHistoryDateTo("")
  }

  const pabaonDeductionType = deductionTypes.find((deductionType) => deductionType.code === "pabaon")
  const linkedPabaonDeduction =
    contribution && pabaonDeductionType
      ? allDeductions.find(
          (deduction) =>
            deduction.memberId === contribution.memberId &&
            deduction.deductionTypeId === pabaonDeductionType.id &&
            deduction.period === contribution.contributionPeriod
        )
      : undefined

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
  if (!contribution) {
    return (
      <EmptyState
        icon={Wallet}
        title="Contribution record not found"
        description="This contribution record may have been voided or removed."
      />
    )
  }

  const timelineEntries: TimelineEntry[] = [
    {
      id: "created",
      title: "Contribution Posted",
      description: `Recorded by ${contribution.encodedBy}`,
      timestamp: contribution.createdAt,
      actor: contribution.encodedBy,
      icon: PlusCircle,
      tone: "success",
    },
  ]
  if (
    contribution.updatedAt &&
    contribution.updatedAt !== contribution.createdAt &&
    contribution.status !== "Voided"
  ) {
    timelineEntries.push({
      id: "updated",
      title: "Contribution Updated",
      timestamp: contribution.updatedAt,
      icon: Pencil,
      tone: "info",
    })
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
  const fundAllocations = contribution.fundAllocations ?? []
  const totalFundAllocation = fundAllocations.reduce((sum, allocation) => sum + allocation.allocatedAmount, 0)

  return (
    <div className="space-y-6 pb-16">
      {/* Back navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground active:scale-95"
          render={<Link to="/contributions" />}
        >
          <ArrowLeft className="size-3.5" /> Back to Contribution Records
        </Button>
      </div>

      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/95 to-primary/5 p-6 shadow-xs backdrop-blur-xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-2xs">
              <Receipt className="size-7" strokeWidth={2.2} />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-mono text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {contribution.referenceNumber}
                </h1>
                <StatusBadge
                  label={contribution.status}
                  tone={CONTRIBUTION_STATUS_TONE[contribution.status]}
                />
              </div>

              <p className="text-xs font-medium text-muted-foreground flex flex-wrap items-center gap-1.5">
                <span className="font-heading font-semibold text-foreground/90">{contribution.memberName}</span>
                <span>·</span>
                <span className="font-mono">{contribution.contributionPeriod}</span>
                <span>·</span>
                <span>{contribution.contributionType}</span>
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-2">
            <PrintButton permission="contributions.print" label="Print Receipt" />

            {contribution.status === "Posted" && (
              <PermissionButton
                permission="contributions.update"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-xl text-xs font-semibold shadow-2xs hover:bg-muted active:scale-95 transition-all"
                render={<Link to={`/contributions/${contribution.id}/edit`} />}
              >
                <Pencil className="size-3.5" /> Edit Record
              </PermissionButton>
            )}

            {contribution.status === "Posted" && (
              <PermissionButton
                permission="contributions.void"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive active:scale-95 shadow-2xs transition-all"
                onClick={() => setShowVoidDialog(true)}
              >
                <Ban className="size-3.5" /> Void Transaction
              </PermissionButton>
            )}
          </div>
        </div>

        {/* Void Alert Banner */}
        {contribution.status === "Voided" && (
          <div className="mt-5">
            <AlertBanner
              tone="danger"
              title="This contribution transaction has been voided."
              description={
                <div className="space-y-1">
                  <p className="font-medium text-destructive">{contribution.voidReason}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Voided by {contribution.voidedBy} on {formatDateShort(contribution.voidedAt)}
                  </p>
                </div>
              }
              actions={
                contribution.contributionType === "Monthly Dues" ? (
                  <PermissionButton
                    permission="contributions.create"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-semibold rounded-lg"
                    render={
                      <Link
                        to={`/contributions/new?member=${contribution.memberId}&period=${contribution.contributionPeriod}`}
                      />
                    }
                  >
                    <PlusCircle className="size-3.5" /> Re-contribute for This Month
                  </PermissionButton>
                ) : undefined
              }
            />
          </div>
        )}

        {/* Top Summary Metrics Strip */}
        <div className="mt-6 grid grid-cols-2 gap-3.5 border-t border-border/50 pt-6 sm:grid-cols-4">
          <SummaryStat
            label="Total Amount"
            value={formatCurrency(contribution.amount)}
            tone="success"
            icon={Coins}
          />
          <SummaryStat
            label="Payment Method"
            value={contribution.paymentMethod}
            icon={CreditCard}
          />
          <SummaryStat
            label="Payment Date"
            value={formatDateShort(contribution.paymentDate)}
            icon={Calendar}
          />
          <SummaryStat
            label="Encoded By"
            value={contribution.encodedBy}
            icon={User}
          />
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <TabsList className="inline-flex h-11 items-center gap-1 rounded-2xl border border-border/60 bg-muted/30 p-1 backdrop-blur-xs">
            <TabsTrigger value="overview" className="rounded-xl px-4 text-xs font-semibold">
              Overview
            </TabsTrigger>
            <TabsTrigger value="member" className="rounded-xl px-4 text-xs font-semibold">
              Member Profile
            </TabsTrigger>
            <TabsTrigger value="payment" className="rounded-xl px-4 text-xs font-semibold">
              Payment Data
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl px-4 text-xs font-semibold">
              Audit Timestamps
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-xl px-4 text-xs font-semibold">
              Activity History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: Overview */}
        <TabsContent value="overview" className="mt-0 space-y-5">
          <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs sm:p-6">
            <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground border-b border-border/40 pb-3 mb-4">
              Contribution Details
            </h3>
            <dl className="grid grid-cols-1 gap-x-12 gap-y-3.5 text-sm md:grid-cols-2">
              <Detail label="Reference No." value={contribution.referenceNumber} isMono />
              <Detail label="Contribution Period" value={contribution.contributionPeriod} isMono />
              <Detail label="Contribution Type" value={contribution.contributionType} />
              <Detail label="Amount Paid" value={formatCurrency(contribution.amount)} isMono />
              <Detail label="Payment Method" value={contribution.paymentMethod} />
              <Detail label="Status" value={contribution.status} />
              <Detail label="Encoded By" value={contribution.encodedBy} />
              <Detail label="Payment Date" value={formatDateShort(contribution.paymentDate)} />
              <Detail label="Remarks / Notes" value={contribution.remarks || "—"} />
            </dl>
          </div>

          {/* Fund Allocation Card */}
          {contribution.contributionType === "Monthly Dues" && (
            <div className="rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-border/40 bg-muted/15 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground">
                    Fund Allocations Breakdown
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Distribution of this contribution across configured association reserve funds.
                  </p>
                </div>
                {fundAllocations.length > 0 && (
                  <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-left sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Total Allocated</p>
                    <p className="font-mono text-sm font-bold text-primary">
                      {formatCurrency(totalFundAllocation)}
                    </p>
                  </div>
                )}
              </div>

              {fundAllocations.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
                  {fundAllocations.map((allocation) => (
                    <div
                      key={allocation.fundId}
                      className="rounded-xl border border-border/60 bg-muted/20 p-3.5 shadow-2xs"
                    >
                      <p className="text-[11px] font-semibold text-muted-foreground truncate" title={allocation.fundName}>
                        {allocation.fundName}
                      </p>
                      <p className="mt-1 font-mono text-base font-bold tracking-tight text-foreground">
                        {formatCurrency(allocation.allocatedAmount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No automated fund allocation records found for this entry.
                </div>
              )}
            </div>
          )}

          {/* Linked Cash Pabaon Deduction */}
          {linkedPabaonDeduction && (
            <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Link2 className="size-3.5" />
                  </div>
                  <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground">
                    Linked Cash Pabaon Deduction
                  </h3>
                </div>
                <StatusBadge label={linkedPabaonDeduction.status} tone="success" />
              </div>

              <dl className="grid grid-cols-1 gap-x-12 gap-y-3.5 text-sm md:grid-cols-2">
                <Detail label="Deduction Reference" value={linkedPabaonDeduction.referenceNumber} isMono />
                <Detail label="Period" value={linkedPabaonDeduction.period} isMono />
                <Detail label="Amount" value={formatCurrency(linkedPabaonDeduction.amount)} isMono />
                <Detail label="Payment Date" value={formatDateShort(linkedPabaonDeduction.paymentDate)} />
              </dl>
              <p className="text-[11px] text-muted-foreground italic">
                * Auto-synchronized to the deduction ledger alongside this Monthly Dues payment.
              </p>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Member Profile */}
        <TabsContent value="member" className="mt-0 space-y-5">
          {member ? (
            <>
              <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs sm:p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="size-14 rounded-2xl border border-border/70 shadow-2xs">
                    <AvatarFallback className="bg-primary/10 font-heading text-base font-bold text-primary">
                      {initialsFromName(member.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <Link
                      to={`/members/${member.id}`}
                      className="font-heading text-base font-bold text-foreground transition-colors hover:text-primary hover:underline"
                    >
                      {member.fullName}
                    </Link>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="font-mono font-semibold">{member.memberNumber}</span>
                      <span>·</span>
                      <span>{member.position}</span>
                    </p>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border/50 pt-5 sm:grid-cols-4">
                  <div className="space-y-0.5">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Member Number</dt>
                    <dd className="font-mono text-xs font-semibold text-foreground">{member.memberNumber}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Office</dt>
                    <dd className="text-xs font-semibold text-foreground">{member.officeName}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Position</dt>
                    <dd className="text-xs font-semibold text-foreground">{member.position}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</dt>
                    <dd>
                      <StatusBadge
                        label={member.membershipStatus}
                        tone={MEMBERSHIP_STATUS_TONE[member.membershipStatus]}
                      />
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Historical Contribution Table */}
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
                <div className="flex flex-col gap-3 border-b border-border/40 bg-muted/15 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
                  <h3 className="shrink-0 font-heading text-sm font-semibold tracking-tight text-foreground">
                    Member Contribution History
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="month"
                      className="h-9 w-40 bg-background text-xs"
                      value={historyPeriod}
                      onChange={(event) => setHistoryPeriod(event.target.value)}
                      aria-label="Contribution period"
                    />
                    <div className="flex h-9 items-center gap-1 rounded-lg border border-border/85 bg-background px-2.5 shadow-sm">
                      <Input
                        type="date"
                        className="h-7 w-32 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                        value={historyDateFrom}
                        onChange={(event) => setHistoryDateFrom(event.target.value)}
                        aria-label="Payment date from"
                      />
                      <span className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">to</span>
                      <Input
                        type="date"
                        className="h-7 w-32 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                        value={historyDateTo}
                        onChange={(event) => setHistoryDateTo(event.target.value)}
                        aria-label="Payment date to"
                      />
                    </div>
                    {hasHistoryFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={clearHistoryFilters}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>

                {filteredMemberContributionHistory.length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      className="border-0"
                      icon={Wallet}
                      title={hasHistoryFilters ? "No matching contributions" : "No other contributions"}
                      description={
                        hasHistoryFilters
                          ? "Try adjusting or clearing the period and payment date filters."
                          : "This member has no additional historical contribution records."
                      }
                    />
                  </div>
                ) : (
                  <Table containerClassName="data-table-scrollbar max-h-96 overflow-y-auto">
                    <TableHeader className="sticky top-0 z-10 border-b border-border/40 bg-background/95 backdrop-blur-md">
                      <TableRow>
                        <TableHead className="pl-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Reference #</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Period</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Payment Date</TableHead>
                        <TableHead className="pr-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/30">
                      {filteredMemberContributionHistory.map((c) => (
                        <TableRow key={c.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="pl-5">
                            <Link
                              to={`/contributions/${c.id}`}
                              className="font-mono text-xs font-semibold text-primary hover:underline"
                            >
                              {c.referenceNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-foreground/80">{c.contributionPeriod}</TableCell>
                          <TableCell className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(c.amount)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDateShort(c.paymentDate)}</TableCell>
                          <TableCell className="pr-5">
                            <StatusBadge label={c.status} tone={CONTRIBUTION_STATUS_TONE[c.status]} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Loading member information…</p>
          )}
        </TabsContent>

        {/* TAB 3: Payment Data */}
        <TabsContent value="payment" className="mt-0">
          <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs sm:p-6">
            <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground border-b border-border/40 pb-3 mb-4">
              Payment & Official Receipt Metadata
            </h3>
            <dl className="grid grid-cols-1 gap-x-12 gap-y-3.5 text-sm md:grid-cols-2">
              <Detail label="Total Amount Paid" value={formatCurrency(contribution.amount)} isMono />
              <Detail label="Payment Method" value={contribution.paymentMethod} />
              <Detail label="Official Receipt #" value={contribution.officialReceiptNumber || "—"} isMono />
              <Detail label="Payroll Reference #" value={contribution.payrollReference || "—"} isMono />
              <Detail label="Payment Date" value={formatDateShort(contribution.paymentDate)} />
              <Detail label="Contribution Period" value={contribution.contributionPeriod} isMono />
            </dl>
          </div>
        </TabsContent>

        {/* TAB 4: Audit History */}
        <TabsContent value="history" className="mt-0">
          <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs sm:p-6">
            <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground border-b border-border/40 pb-3 mb-4">
              Timestamp & Modification Records
            </h3>
            <dl className="grid grid-cols-1 gap-x-12 gap-y-3.5 text-sm md:grid-cols-2">
              <Detail label="Date Created" value={formatDateShort(contribution.createdAt)} />
              <Detail
                label="Last Updated"
                value={contribution.updatedAt ? formatDateShort(contribution.updatedAt) : "—"}
              />
              <Detail
                label="Date Voided"
                value={contribution.voidedAt ? formatDateShort(contribution.voidedAt) : "—"}
              />
              <Detail
                label="Last Modified By"
                value={contribution.voidedBy ?? contribution.encodedBy}
              />
            </dl>
          </div>
        </TabsContent>

        {/* TAB 5: Activity Logs */}
        <TabsContent value="activity" className="mt-0">
          <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs sm:p-6">
            <ActivityTimeline entries={timelineEntries} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Transaction Void Confirmation Dialog */}
      <VoidTransactionDialog
        open={showVoidDialog}
        onOpenChange={setShowVoidDialog}
        transactionLabel={`Contribution ${contribution.referenceNumber}`}
        description={
          contribution.contributionType === "Monthly Dues"
            ? "This is a grouped payment. Voiding the Monthly Dues will also void the linked Cash Pabaon for the same member and period. Both records will preserve their audit trail."
            : undefined
        }
        isLoading={isVoiding}
        onConfirm={handleVoid}
      />
    </div>
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
  tone?: "success" | "danger"
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
            : tone === "danger"
              ? "text-destructive font-mono"
              : "text-foreground"
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
    <div className="flex flex-col gap-1 border-b border-border/30 pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
        {label}
      </dt>
      <dd
        className={cn(
          "max-w-md truncate text-left text-sm font-medium text-foreground sm:text-right",
          isMono && "font-mono text-xs"
        )}
      >
        {value}
      </dd>
    </div>
  )
}
