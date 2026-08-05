import * as React from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Banknote,
  FileText,
  Landmark,
  Calendar,
  DollarSign,
  Clock,
  User,
  CheckCircle2,
  ArrowLeft,
  Receipt,
  ClipboardCheck,
  Building2,
  Calculator,
  ShieldCheck,
  RotateCw,
  LayoutGrid,
  Wallet,
  Printer,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable } from "@/components/shared/DataTable"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { StatCard } from "@/components/shared/StatCard"
import { PrintButton } from "@/components/shared/PrintButton"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { ApprovalTimeline } from "@/components/shared/ApprovalTimeline"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { EligibilityChecklist, type EligibilityResult } from "@/components/shared/EligibilityChecklist"
import { EmptyState } from "@/components/shared/EmptyState"
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getLoan, getLoanApprovalHistory, getLoanSchedule, getReloanEligibility } from "@/services/loans.service"
import { getAllLoanPayments } from "@/services/loan-payments.service"
import { ReloanButton } from "@/features/loans/components/ReloanButton"
import { ReloanEligibilityCard } from "@/features/loans/components/ReloanEligibilityCard"
import { LOAN_STATUS_TONE, AMORTIZATION_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort, formatMonthYear } from "@/utils/format"
import { cn } from "@/lib/utils"
import type { AmortizationEntry, PreviousObligationSettlementMethod } from "@/types"

const SETTLEMENT_METHOD_LABEL: Record<PreviousObligationSettlementMethod, string> = {
  full_payment_required: "Full Payment Required Before Release",
  deducted: "Deducted From New Loan Proceeds",
}

/**
 * Built per-render from the full schedule (not a static array) so the "Amount Due"
 * column can look at the *previous* row — a Partially Paid installment's shortfall
 * carries forward and is collected from whatever payment comes in next (see
 * LoanPaymentPoster::applyPaymentToSchedule on the backend), so the row right after
 * it should visibly show that it owes more than its own scheduled amount.
 */
function buildAmortizationColumns(schedule: AmortizationEntry[]): ColumnDef<AmortizationEntry, unknown>[] {
  return [
    { accessorKey: "installmentNumber", header: "#" },
    { accessorKey: "dueDate", header: "Due Date", cell: ({ row }) => formatDateShort(row.original.dueDate) },
    { accessorKey: "beginningBalance", header: "Beginning Balance", cell: ({ row }) => formatCurrency(row.original.beginningBalance) },
    { accessorKey: "principal", header: "Principal", cell: ({ row }) => formatCurrency(row.original.principal) },
    { accessorKey: "interest", header: "Interest", cell: ({ row }) => formatCurrency(row.original.interest) },
    { accessorKey: "penalty", header: "Penalty", cell: ({ row }) => formatCurrency(row.original.penalty) },
    {
      accessorKey: "amountDue",
      header: "Amount Due",
      cell: ({ row }) => {
        const index = schedule.findIndex((entry) => entry.installmentNumber === row.original.installmentNumber)
        const previous = index > 0 ? schedule[index - 1] : undefined
        const carriedShortfall = previous?.status === "Partially Paid" ? previous.amountDue - previous.amountPaid : 0
        return (
          <div>
            {formatCurrency(row.original.amountDue)}
            {carriedShortfall > 0 && (
              <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                + {formatCurrency(carriedShortfall)} shortfall (#{previous!.installmentNumber})
              </div>
            )}
          </div>
        )
      },
    },
    { accessorKey: "amountPaid", header: "Amount Paid", cell: ({ row }) => formatCurrency(row.original.amountPaid) },
    { accessorKey: "remainingBalance", header: "Remaining Balance", cell: ({ row }) => formatCurrency(row.original.remainingBalance) },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge label={row.original.status} tone={AMORTIZATION_STATUS_TONE[row.original.status]} />,
    },
  ]
}

export default function LoanDetailPage() {
  const { id = "" } = useParams()
  const { data: loan, isLoading } = useQuery({ queryKey: ["loans", id], queryFn: () => getLoan(id) })
  const {
    data: schedule = [],
    isLoading: isLoadingSchedule,
    isError: isScheduleError,
    refetch: refetchSchedule,
  } = useQuery({ queryKey: ["loans", id, "schedule"], queryFn: () => getLoanSchedule(id) })
  const { data: history = [] } = useQuery({ queryKey: ["loans", id, "history"], queryFn: () => getLoanApprovalHistory(id) })
  const payments = getAllLoanPayments().filter((p) => p.loanApplicationId === id)

  // Fetched at page level (not just inside the Requirements tab) so the Reloan button in the header
  // always has a specific blockedReason ready, even if the user hasn't opened that tab yet.
  const { data: reloanEligibility } = useQuery({
    queryKey: ["reloan-eligibility", id],
    queryFn: () => getReloanEligibility(id),
    enabled: !!id,
  })
  const reloanEligible = reloanEligibility?.eligible ?? false
  const reloanBlockedReason = reloanEligibility?.checks.find((c) => !c.passed)?.detail

  useBreadcrumbExtra(loan?.applicationNumber)

  if (isLoading) return <ProfileSkeleton cards={4} />
  if (!loan) return <EmptyState icon={Landmark} title="Loan application not found" description="This loan application may have been removed or deleted." />

  const hasReachedApproval = ["Approved", "Released", "Active", "Fully Paid", "Overdue", "Restructured"].includes(loan.status)
  const approvedAmount = loan.approvedAmount ?? (hasReachedApproval ? loan.requestedAmount : undefined)
  const serviceCharge = Math.max(0, loan.principal - loan.processingFee - loan.netProceeds)
  const postedPayments = payments.filter((payment) => payment.status === "Posted")
  const totalPaid = postedPayments.reduce((sum, payment) => sum + payment.amountPaid, 0)
  const totalDeductions = loan.processingFee + serviceCharge
  const averageMonthlyInterest = loan.termMonths > 0 ? loan.totalInterest / loan.termMonths : 0
  const effectiveInterestPercent = loan.principal > 0 ? (loan.totalInterest / loan.principal) * 100 : 0

  const paidMonths = schedule.filter((entry) => entry.status === "Paid").length
  const monthsProgressPercent = loan.termMonths > 0 ? Math.min(100, (paidMonths / loan.termMonths) * 100) : 0

  const eligibilityAllPassed = loan.eligibility.every((item) => item.passed)
  const eligibilityResult: EligibilityResult = loan.eligibilityOverridden
    ? "Eligible with Warning"
    : eligibilityAllPassed
      ? "Eligible"
      : "Not Eligible"

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* Top Navigation Back Anchor */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/loans" className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
          <span>Back to Loan Applications</span>
        </Link>
      </div>

      {/* Header */}
      <PageHeader
        title={loan.applicationNumber}
        description={`${loan.memberName} · ${loan.loanTypeName}`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusBadge label={loan.status} tone={LOAN_STATUS_TONE[loan.status]} className="h-9 px-3.5 text-xs font-semibold rounded-xl" />
            {loan.applicationType === "reloan" && (
              <StatusBadge label={`Reloan #${loan.reloanSequence ?? 1}`} tone="gold" className="h-9 px-3.5 text-xs font-semibold rounded-xl" />
            )}
            {loan.releaseDate && loan.releaseMethod === "Check" && (
              <PermissionButton
                permission="loans.print"
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 rounded-xl text-xs"
                render={<Link to={`/loans/${loan.id}/check`} />}
              >
                <Printer className="size-3.5" /> Print Check
              </PermissionButton>
            )}
            <ReloanButton loan={loan} eligible={reloanEligible} blockedReason={reloanBlockedReason} />
            {["Released", "Active", "Overdue", "Restructured"].includes(loan.status) && loan.outstandingBalance > 0 && (
              <PermissionButton
                permission="loan_payments.create"
                size="sm"
                className="h-9 text-xs gap-1.5 rounded-xl"
                render={<Link to={`/loan-payments/new?member=${loan.memberId}&loan=${loan.id}`} target="_blank" rel="noopener noreferrer" />}
              >
                <Wallet className="size-3.5" /> Record Payment
              </PermissionButton>
            )}
            <PrintButton permission="loans.print" label="Print Application" />
          </div>
        }
      />

      {/* Always-visible status alerts — surfaced regardless of which tab is active */}
      {loan.rejectionReason && (
        <AlertBanner tone="danger" title="This application was rejected." description={loan.rejectionReason} />
      )}
      {loan.cancellationReason && (
        <AlertBanner tone="warning" title="This application was cancelled." description={loan.cancellationReason} />
      )}
      {loan.eligibilityOverridden && (
        <AlertBanner
          tone="warning"
          title="Released under an eligibility override."
          description={loan.eligibilityOverrideReason || "One or more eligibility checks failed but an authorized override was applied."}
        />
      )}

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Requested Amount" value={formatCurrency(loan.requestedAmount)} icon={DollarSign} tone="primary" />
        <StatCard
          label="Approved Amount"
          value={approvedAmount != null ? formatCurrency(approvedAmount) : "—"}
          icon={CheckCircle2}
          tone={approvedAmount != null ? "success" : "primary"}
        />
        <StatCard label="Monthly Amortization" value={formatCurrency(loan.monthlyAmortization)} icon={Calendar} tone="primary" />
        <StatCard
          label="Outstanding Balance"
          value={formatCurrency(loan.outstandingBalance)}
          icon={Banknote}
          tone={loan.outstandingBalance > 0 ? "warning" : "primary"}
        />
      </div>

      {/* Interactive Workspace Navigation Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1.5 bg-muted/50 p-1.5 w-full md:w-auto border border-border/50 rounded-2xl">
          <TabsTrigger value="overview" className="flex items-center gap-2 py-2 px-3.5 text-xs font-semibold rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs transition-all">
            <LayoutGrid className="size-3.5 text-primary" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="computation" className="flex items-center gap-2 py-2 px-3.5 text-xs font-semibold rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs transition-all">
            <Receipt className="size-3.5 text-primary" />
            Computation
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2 py-2 px-3.5 text-xs font-semibold rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs transition-all">
            <Calendar className="size-3.5 text-primary" />
            Amortization Schedule
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2 py-2 px-3.5 text-xs font-semibold rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs transition-all">
            <Banknote className="size-3.5 text-primary" />
            Payment History
          </TabsTrigger>
          <TabsTrigger value="requirements" className="flex items-center gap-2 py-2 px-3.5 text-xs font-semibold rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs transition-all">
            <ClipboardCheck className="size-3.5 text-primary" />
            Requirements &amp; Eligibility
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2 py-2 px-3.5 text-xs font-semibold rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs transition-all">
            <Clock className="size-3.5 text-primary" />
            Approval History
          </TabsTrigger>
        </TabsList>

        {/* TAB: Overview */}
        <TabsContent value="overview" className="mt-4 outline-none focus-visible:ring-0 space-y-6">
          {loan.termMonths > 0 && (
            <AlertBanner
              tone={paidMonths >= loan.termMonths ? "success" : "info"}
              title={`${paidMonths} of ${loan.termMonths} months paid`}
              description={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="w-full max-w-xs">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-current/15">
                      <div
                        className="h-full rounded-full bg-current transition-[width] duration-500"
                        style={{ width: `${monthsProgressPercent}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] font-semibold">
                      <span>{monthsProgressPercent.toFixed(0)}%</span>
                      <span>{Math.max(0, loan.termMonths - paidMonths)} left</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs sm:justify-end sm:text-right">
                    <TimelineStat label="Application" value={formatMonthYear(loan.applicationDate)} />
                    <TimelineStat label="First Due" value={formatDateShort(loan.firstDueDate)} />
                    <TimelineStat label="Maturity" value={formatDateShort(loan.maturityDate)} />
                  </div>
                </div>
              }
            />
          )}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Application Details */}
            <Section icon={User} title="Application Details">
              <DetailGroup heading="Member & Assignment">
                <DetailRow label="Member Number" value={loan.memberNumber} />
                <DetailRow label="Office / Branch" value={loan.officeName} />
                <DetailRow label="Assigned Officer" value={loan.assignedOfficer} />
              </DetailGroup>
              <DetailGroup heading="Loan Parameters">
                <DetailRow label="Loan Type" value={loan.loanTypeName || "Not specified"} />
                <DetailRow label="Application Type" value={loan.applicationType === "reloan" ? `Reloan (#${loan.reloanSequence ?? 1})` : "New Loan"} />
                <DetailRow label="Term" value={`${loan.termMonths} months`} />
                <DetailRow label="Interest Rate" value={`${loan.interestRate}% / month`} />
                <DetailRow label="Payment Method" value={loan.paymentMethod} />
                <DetailRow label="Purpose" value={loan.purpose} />
              </DetailGroup>
            </Section>

            {/* Release (Timeline now lives in the months-paid alert above) */}
            <div className="space-y-6">
              {loan.releaseDate && (
                <Section icon={Building2} title="Release Information" tone="success">
                  <DetailGroup>
                    <DetailRow label="Release Date" value={formatDateShort(loan.releaseDate)} />
                    <DetailRow label="Reference #" value={loan.releaseReferenceNumber ?? "—"} />
                    <DetailRow label="Release Method" value={loan.releaseMethod ?? "—"} />
                    <DetailRow label="Released Amount" value={loan.actualReleasedAmount != null ? formatCurrency(loan.actualReleasedAmount) : "—"} />
                    {loan.releaseRemarks && <DetailRow label="Remarks" value={loan.releaseRemarks} />}
                  </DetailGroup>
                </Section>
              )}
            </div>
          </div>

          {/* Reloan Lineage — only relevant when this application is itself a reloan */}
          {loan.applicationType === "reloan" && (
            <Section icon={RotateCw} title="Reloan Lineage" tone="gold">
              <DetailGroup>
                <DetailRow
                  label="Previous Loan"
                  value={loan.previousLoanId
                    ? <Link to={`/loans/${loan.previousLoanId}`} className="font-bold text-primary hover:underline">{loan.previousLoanReference ?? "View loan"}</Link>
                    : (loan.previousLoanReference ?? "—")}
                />
                <DetailRow label="Reloan Sequence" value={`#${loan.reloanSequence ?? 1}`} />
                {loan.currentNetTakeHomePay != null && <DetailRow label="Net Take-Home Pay at Filing" value={formatCurrency(loan.currentNetTakeHomePay)} />}
              </DetailGroup>
              {(loan.previousObligationAmount ?? 0) > 0 && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.03] p-3.5 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Previous Obligation</p>
                  <DetailGroup>
                    <DetailRow label="Amount" value={formatCurrency(loan.previousObligationAmount ?? 0)} />
                    <DetailRow label="Settlement Method" value={loan.previousObligationSettlementMethod ? SETTLEMENT_METHOD_LABEL[loan.previousObligationSettlementMethod] : "Not specified"} />
                    <DetailRow label="Settled" value={loan.previousObligationSettledAt ? formatDateShort(loan.previousObligationSettledAt) : "Not yet settled"} />
                  </DetailGroup>
                </div>
              )}
            </Section>
          )}
        </TabsContent>

        {/* TAB: Computation Breakdown */}
        <TabsContent value="computation" className="mt-4 outline-none focus-visible:ring-0">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
            <div className="border-b border-border/50 bg-muted/20 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Receipt className="size-4" />
                </span>
                <h3 className="text-sm font-bold text-foreground">Loan Computation Breakdown</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                Official Calculation
              </span>
            </div>

            <div className="space-y-6 p-6">
              {/* Parameter Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ComputationDetail label="Loan Type" value={loan.loanTypeName || "Not specified"} />
                <ComputationDetail label="Loan Term" value={`${loan.termMonths} month(s)`} />
                <ComputationDetail label="Requested Amount" value={formatCurrency(loan.requestedAmount)} />
                <ComputationDetail label="Approved Amount" value={approvedAmount != null ? formatCurrency(approvedAmount) : "Pending approval"} />
                <ComputationDetail label="Principal Used in Computation" value={formatCurrency(loan.principal)} />
                <ComputationDetail label="Interest Rate" value={`${loan.interestRate}% per month`} />
                <ComputationDetail label="Payment Method" value={loan.paymentMethod} />
                <ComputationDetail label="First Due / Maturity" value={`${formatDateShort(loan.firstDueDate)} – ${formatDateShort(loan.maturityDate)}`} />
              </div>

              {/* Interest Section */}
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Calculator className="size-3.5 text-primary" /> Interest &amp; Payable Schedule
                </h4>
                <div className="space-y-2 pt-1">
                  <ComputationLine label="Principal" formula="Base amount borrowed" value={formatCurrency(loan.principal)} />
                  <ComputationLine label="Total Interest" formula={`${loan.interestRate}% monthly rate over ${loan.termMonths} month(s)`} value={`+ ${formatCurrency(loan.totalInterest)}`} tone="positive" />
                  <ComputationLine label="Average Interest per Month" formula={`Total interest ÷ ${loan.termMonths || 1}`} value={formatCurrency(averageMonthlyInterest)} />
                  <ComputationLine label="Effective Interest over Full Term" formula="Total interest ÷ principal × 100" value={`${effectiveInterestPercent.toFixed(2)}%`} />
                  <div className="border-t border-border/50 pt-2">
                    <ComputationLine label="Total Amount Payable" formula="Principal + total interest" value={formatCurrency(loan.totalAmountPayable)} strong />
                  </div>
                  <ComputationLine label="Monthly Amortization" formula={`Scheduled payable amount for each of ${loan.termMonths} month(s)`} value={formatCurrency(loan.monthlyAmortization)} strong />
                </div>
              </div>

              {/* Release and Deductions Section */}
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Banknote className="size-3.5 text-primary" /> Upfront Deductions &amp; Net Proceeds
                </h4>
                <div className="space-y-2 pt-1">
                  <ComputationLine label="Principal" formula="Approved computation principal" value={formatCurrency(loan.principal)} />
                  <ComputationLine label="Processing Fee" formula="Deducted before release" value={`− ${formatCurrency(loan.processingFee)}`} tone="negative" />
                  {serviceCharge > 0 && <ComputationLine label="Service Charge" formula="Additional charge deducted before release" value={`− ${formatCurrency(serviceCharge)}`} tone="negative" />}
                  <ComputationLine label="Total Upfront Deductions" formula="Processing fee + service charge" value={`− ${formatCurrency(totalDeductions)}`} tone="negative" />
                  <div className="border-t border-border/50 pt-2">
                    <ComputationLine label="Net Proceeds" formula="Principal − upfront deductions" value={formatCurrency(loan.netProceeds)} tone="positive" strong />
                  </div>
                  {loan.actualReleasedAmount != null && <ComputationLine label="Actual Released Amount" formula="Amount confirmed during release" value={formatCurrency(loan.actualReleasedAmount)} strong />}
                  {(loan.previousObligationAmount ?? 0) > 0 && <ComputationLine label="Previous Obligation" formula={`Settlement: ${loan.previousObligationSettlementMethod ? SETTLEMENT_METHOD_LABEL[loan.previousObligationSettlementMethod] : "Not specified"}`} value={`− ${formatCurrency(loan.previousObligationAmount ?? 0)}`} tone="negative" />}
                </div>
              </div>

              {/* Current Position */}
              <div className="rounded-2xl border border-primary/20 bg-primary/[0.02] p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Current Repayment Position</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
                  <ComputationDetail label="Posted Payments" value={formatCurrency(totalPaid)} />
                  <ComputationDetail label="Outstanding Balance" value={formatCurrency(loan.outstandingBalance)} />
                  <ComputationDetail label="Installments Posted" value={`${postedPayments.length}`} />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB: Amortization Schedule */}
        <TabsContent value="schedule" className="mt-4 outline-none focus-visible:ring-0">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
            <DataTable
              columns={buildAmortizationColumns(schedule)}
              data={schedule}
              isLoading={isLoadingSchedule}
              isError={isScheduleError}
              onRetry={refetchSchedule}
              emptyTitle="No amortization schedule"
              emptyDescription="The amortization schedule has not been generated for this loan."
              maxHeight="max-h-[min(80vh,82rem)]"
            />
          </div>
        </TabsContent>

        {/* TAB: Payment History */}
        <TabsContent value="payments" className="mt-4 outline-none focus-visible:ring-0">
          {payments.length === 0 ? (
            <EmptyState icon={Banknote} title="No payments recorded" description="No payments have been posted for this loan yet." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
              <Table>
                <TableHeader className="bg-muted/40 border-b border-border/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reference #</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Date</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount Paid</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">O.R. Number</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Received By</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {payments.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="font-semibold text-foreground">{p.paymentReferenceNumber}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatDateShort(p.paymentDate)}</TableCell>
                      <TableCell className="font-mono font-semibold text-foreground">{formatCurrency(p.amountPaid)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.officialReceiptNumber}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{p.receivedBy}</TableCell>
                      <TableCell className="text-right">
                        <StatusBadge label={p.status} tone={p.status === "Posted" ? "success" : "danger"} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* TAB: Requirements & ReLoan Eligibility Hub */}
        <TabsContent value="requirements" className="mt-4 outline-none focus-visible:ring-0 space-y-6">
          {/* Dynamic ReLoan Evaluation */}
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-border/50 bg-muted/20 px-6 py-4">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <ClipboardCheck className="size-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">ReLoan Evaluation Engine</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Automated compliance evaluation tracking outstanding parameters.</p>
              </div>
            </div>
            <div className="bg-card p-6">
              <ReloanEligibilityCard loanId={id} />
            </div>
          </div>

          {/* Requirement Checklists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Documentary Requirements */}
            <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
                <FileText className="size-4 text-primary" />
                Documentary Requirements
              </h3>
              <ul className="space-y-2.5">
                {loan.requirements.map((req) => (
                  <li
                    key={req.label}
                    className={cn(
                      "flex items-center justify-between p-3.5 rounded-xl border text-xs transition-all duration-200",
                      req.completed
                        ? "bg-emerald-500/[0.03] border-emerald-500/25 text-foreground"
                        : "bg-muted/20 border-border/50 text-muted-foreground"
                    )}
                  >
                    <span className={req.completed ? "font-semibold text-foreground" : "text-muted-foreground"}>
                      {req.label}
                    </span>
                    <span className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      req.completed
                        ? "bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-muted-foreground/15 text-muted-foreground"
                    )}>
                      {req.completed ? "✓" : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Eligibility Checklist (as evaluated at submission/approval time) */}
            <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
                <ShieldCheck className="size-4 text-primary" />
                Eligibility Checklist
              </h3>
              <EligibilityChecklist items={loan.eligibility} result={eligibilityResult} />
            </div>
          </div>
        </TabsContent>

        {/* TAB: Approvals Timeline */}
        <TabsContent value="approvals" className="mt-4 outline-none focus-visible:ring-0">
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs">
            <ApprovalTimeline history={history} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* Local UI Helpers */

function Section({
  icon: Icon,
  title,
  tone = "primary",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  tone?: "primary" | "success" | "gold"
  children: React.ReactNode
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    gold: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  }[tone]

  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-2.5 border-b border-border/50 bg-muted/20">
        <span className={cn("p-1.5 rounded-lg", toneClasses)}>
          <Icon className="size-4" />
        </span>
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function TimelineStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-xs font-semibold">{value}</p>
    </div>
  )
}

function DetailGroup({ heading, children }: { heading?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {heading && <div className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">{heading}</div>}
      <dl className="text-xs space-y-0">{children}</dl>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0 gap-4 border-b border-border/30 last:border-0">
      <dt className="text-muted-foreground text-[11px] font-semibold shrink-0">{label}</dt>
      <dd className="font-bold text-foreground text-right text-xs truncate max-w-[220px]">{value}</dd>
    </div>
  )
}

function ComputationDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 p-3.5 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  )
}

function ComputationLine({
  label,
  formula,
  value,
  tone = "default",
  strong = false,
}: {
  label: string
  formula: string
  value: string
  tone?: "default" | "positive" | "negative"
  strong?: boolean
}) {
  const valueTone = tone === "positive"
    ? "text-emerald-600 dark:text-emerald-400"
    : tone === "negative"
      ? "text-destructive"
      : "text-foreground"

  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <p className={strong ? "text-sm font-bold text-foreground" : "text-sm font-semibold text-foreground"}>{label}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{formula}</p>
      </div>
      <span className={cn("shrink-0 text-right font-mono", strong ? "text-base font-bold" : "text-sm font-semibold", valueTone)}>{value}</span>
    </div>
  )
}
