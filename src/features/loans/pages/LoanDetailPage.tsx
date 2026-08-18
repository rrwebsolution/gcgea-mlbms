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
  Eye,
} from "lucide-react"
import { DataTable } from "@/components/shared/DataTable"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { ApprovalTimeline } from "@/components/shared/ApprovalTimeline"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { EligibilityChecklist, type EligibilityResult } from "@/components/shared/EligibilityChecklist"
import { EmptyState } from "@/components/shared/EmptyState"
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { useAuth } from "@/contexts/AuthContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  getLoan,
  getLoanApprovalHistory,
  getLoanSchedule,
  getReloanEligibility,
} from "@/services/loans.service"
import { getAllLoanPayments } from "@/services/loan-payments.service"
import { getSettings } from "@/services/settings.service"
import { ReloanButton } from "@/features/loans/components/ReloanButton"
import { ReloanEligibilityCard } from "@/features/loans/components/ReloanEligibilityCard"
import { LOAN_STATUS_TONE, AMORTIZATION_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort, formatMonthYear } from "@/utils/format"
import { cn } from "@/lib/utils"
import type { AmortizationEntry, LoanStatus, PreviousObligationSettlementMethod } from "@/types"

const APPROVAL_PENDING_STATUSES: LoanStatus[] = ["Under Review", "For Approval", "Approved"]

const SETTLEMENT_METHOD_LABEL: Record<PreviousObligationSettlementMethod, string> = {
  full_payment_required: "Full Payment Required Before Release",
  deducted: "Deducted From New Loan Proceeds",
}

function buildAmortizationColumns(schedule: AmortizationEntry[]): ColumnDef<AmortizationEntry, unknown>[] {
  return [
    {
      accessorKey: "installmentNumber",
      header: "#",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-muted-foreground">
          {row.original.installmentNumber}
        </span>
      ),
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{formatDateShort(row.original.dueDate)}</span>
      ),
    },
    {
      accessorKey: "beginningBalance",
      header: "Beginning Balance",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{formatCurrency(row.original.beginningBalance)}</span>
      ),
    },
    {
      accessorKey: "principal",
      header: "Principal",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {formatCurrency(row.original.principal)}
        </span>
      ),
    },
    {
      accessorKey: "interest",
      header: "Interest",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{formatCurrency(row.original.interest)}</span>
      ),
    },
    {
      accessorKey: "penalty",
      header: "Penalty",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{formatCurrency(row.original.penalty)}</span>
      ),
    },
    {
      accessorKey: "amountDue",
      header: "Amount Due",
      cell: ({ row }) => {
        const index = schedule.findIndex((entry) => entry.installmentNumber === row.original.installmentNumber)
        const previous = index > 0 ? schedule[index - 1] : undefined
        const carriedShortfall =
          previous?.status === "Partially Paid" ? previous.amountDue - previous.amountPaid : 0
        return (
          <div>
            <span className="font-mono text-xs font-bold text-primary">
              {formatCurrency(row.original.amountDue)}
            </span>
            {carriedShortfall > 0 && (
              <div className="font-mono text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                + {formatCurrency(carriedShortfall)} shortfall (#{previous!.installmentNumber})
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "amountPaid",
      header: "Amount Paid",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(row.original.amountPaid)}
        </span>
      ),
    },
    {
      accessorKey: "remainingBalance",
      header: "Remaining Balance",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {formatCurrency(row.original.remainingBalance)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          label={row.original.status}
          tone={AMORTIZATION_STATUS_TONE[row.original.status]}
        />
      ),
    },
  ]
}

export default function LoanDetailPage() {
  const { id = "" } = useParams()
  const { hasPermission } = useAuth()
  const { data: loan, isLoading } = useQuery({ queryKey: ["loans", id], queryFn: () => getLoan(id) })
  const {
    data: schedule = [],
    isLoading: isLoadingSchedule,
    isError: isScheduleError,
    refetch: refetchSchedule,
  } = useQuery({ queryKey: ["loans", id, "schedule"], queryFn: () => getLoanSchedule(id) })
  const { data: history = [] } = useQuery({ queryKey: ["loans", id, "history"], queryFn: () => getLoanApprovalHistory(id) })
  const payments = getAllLoanPayments().filter((p) => p.loanApplicationId === id)

  const { data: reloanEligibility } = useQuery({
    queryKey: ["reloan-eligibility", id],
    queryFn: () => getReloanEligibility(id),
    enabled: !!id,
  })
  const reloanEligible = reloanEligibility?.eligible ?? false
  const reloanBlockedReason = reloanEligibility?.checks.find((c) => !c.passed)?.detail

  useBreadcrumbExtra(loan?.applicationNumber)

  if (isLoading) return <ProfileSkeleton cards={4} />
  if (!loan) {
    return (
      <EmptyState
        icon={Landmark}
        title="Loan application not found"
        description="This loan application may have been removed or deleted."
      />
    )
  }

  const hasReachedApproval = ["Approved", "Released", "Active", "Fully Paid", "Overdue", "Restructured"].includes(
    loan.status
  )
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
    <div className="space-y-6 pb-16 max-w-[1600px] mx-auto">
      {/* Back Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground active:scale-95"
          render={<Link to="/loans" />}
        >
          <ArrowLeft className="size-3.5" /> Back to Loan Applications
        </Button>
      </div>

      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/95 to-primary/5 p-6 shadow-xs backdrop-blur-xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-2xs">
              <Landmark className="size-7" strokeWidth={2.2} />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-mono text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {loan.applicationNumber}
                </h1>
                <StatusBadge label={loan.status} tone={LOAN_STATUS_TONE[loan.status]} />
                {loan.applicationType === "reloan" && (
                  <StatusBadge label={`Reloan #${loan.reloanSequence ?? 1}`} tone="gold" />
                )}
              </div>

              <p className="text-xs font-medium text-muted-foreground flex flex-wrap items-center gap-1.5">
                <Link
                  to={`/members/${loan.memberId}`}
                  className="font-heading font-semibold text-foreground hover:text-primary hover:underline"
                >
                  {loan.memberName}
                </Link>
                <span>·</span>
                <span className="font-mono text-muted-foreground">{loan.memberNumber}</span>
                <span>·</span>
                <span>{loan.loanTypeName}</span>
                <span>·</span>
                <span className="text-foreground/80 font-semibold">{loan.officeName}</span>
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {APPROVAL_PENDING_STATUSES.includes(loan.status) && (
              <PermissionButton
                permission={
                  loan.status === "Under Review"
                    ? "loans.review"
                    : loan.status === "For Approval"
                      ? "loans.approve"
                      : "loans.release"
                }
                size="sm"
                className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold shadow-xs active:scale-95 transition-all"
                render={<Link to={`/approvals/loans/${loan.id}`} />}
              >
                <Eye className="size-3.5" /> {loan.status === "Approved" ? "Process Release" : "Review"}
              </PermissionButton>
            )}

            {loan.status !== "Draft" && getSettings().reportTemplate.loanApplicationForm.enabled && (
              <PermissionButton
                permission="loans.print"
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-semibold shadow-2xs hover:bg-muted active:scale-95 transition-all"
                render={<Link to={`/loans/${loan.id}/application-form`} />}
              >
                <FileText className="size-3.5" /> View Form
              </PermissionButton>
            )}

            {loan.releaseDate && loan.releaseMethod === "Check" && (
              <PermissionButton
                permission="loans.print"
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-semibold shadow-2xs hover:bg-muted active:scale-95 transition-all"
                render={<Link to={`/loans/${loan.id}/check`} />}
              >
                <Printer className="size-3.5" /> Print Check
              </PermissionButton>
            )}

            {loan.releaseDate && (
              <PermissionButton
                permission="loans.print"
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-semibold shadow-2xs hover:bg-muted active:scale-95 transition-all"
                render={<Link to={`/loans/${loan.id}/disbursement-voucher`} />}
              >
                <Receipt className="size-3.5" /> Disbursement Voucher
              </PermissionButton>
            )}

            <ReloanButton loan={loan} eligible={reloanEligible} blockedReason={reloanBlockedReason} />

            {["Released", "Active", "Overdue", "Restructured"].includes(loan.status) &&
              loan.outstandingBalance > 0 && (
                <PermissionButton
                  permission="loan_payments.create"
                  size="sm"
                  className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold shadow-xs active:scale-95 transition-all"
                  render={
                    <Link
                      to={`/loan-payments/new?member=${loan.memberId}&loan=${loan.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <Wallet className="size-3.5" /> Record Payment
                </PermissionButton>
              )}

            {hasPermission("loans.print") && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-semibold shadow-2xs hover:bg-muted active:scale-95 transition-all print:hidden"
                onClick={() => window.print()}
              >
                <Printer className="size-3.5" /> Print
              </Button>
            )}
          </div>
        </div>

        {/* Status Notification Alerts */}
        <div className="mt-5 space-y-3">
          {loan.rejectionReason && (
            <AlertBanner tone="danger" title="This application was rejected." description={loan.rejectionReason} />
          )}
          {loan.cancellationReason && (
            <AlertBanner tone="warning" title="This application was cancelled." description={loan.cancellationReason} />
          )}
          {loan.eligibilityOverridden && (
            <AlertBanner
              tone="warning"
              title="Released under an administrative eligibility override."
              description={
                loan.eligibilityOverrideReason ||
                "One or more eligibility criteria failed, but an authorized override was sanctioned."
              }
            />
          )}
        </div>

        {/* Summary Metric Ribbon */}
        <div className="mt-6 grid grid-cols-2 gap-3.5 border-t border-border/50 pt-6 sm:grid-cols-4">
          <SummaryStat
            label="Requested Principal"
            value={formatCurrency(loan.requestedAmount)}
            icon={DollarSign}
          />
          <SummaryStat
            label="Approved Principal"
            value={approvedAmount != null ? formatCurrency(approvedAmount) : "—"}
            tone={approvedAmount != null ? "success" : undefined}
            icon={CheckCircle2}
          />
          <SummaryStat
            label="Monthly Amortization"
            value={formatCurrency(loan.monthlyAmortization)}
            tone="primary"
            icon={Calendar}
          />
          <SummaryStat
            label="Outstanding Balance"
            value={formatCurrency(loan.outstandingBalance)}
            tone={loan.outstandingBalance > 0 ? "warning" : undefined}
            icon={Banknote}
          />
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <TabsList className="inline-flex h-11 items-center gap-1 rounded-2xl border border-border/60 bg-muted/30 p-1 backdrop-blur-xs">
            <TabsTrigger value="overview" className="rounded-xl px-4 text-xs font-semibold gap-1.5">
              <LayoutGrid className="size-3.5 text-primary" /> Overview
            </TabsTrigger>
            <TabsTrigger value="computation" className="rounded-xl px-4 text-xs font-semibold gap-1.5">
              <Receipt className="size-3.5 text-primary" /> Computation Breakdown
            </TabsTrigger>
            <TabsTrigger value="schedule" className="rounded-xl px-4 text-xs font-semibold gap-1.5">
              <Calendar className="size-3.5 text-primary" /> Amortization Schedule
            </TabsTrigger>
            <TabsTrigger value="payments" className="rounded-xl px-4 text-xs font-semibold gap-1.5">
              <Banknote className="size-3.5 text-primary" /> Payment History
            </TabsTrigger>
            <TabsTrigger value="requirements" className="rounded-xl px-4 text-xs font-semibold gap-1.5">
              <ClipboardCheck className="size-3.5 text-primary" /> Requirements &amp; Reloan Hub
            </TabsTrigger>
            <TabsTrigger value="approvals" className="rounded-xl px-4 text-xs font-semibold gap-1.5">
              <Clock className="size-3.5 text-primary" /> Approval History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: Overview */}
        <TabsContent value="overview" className="mt-0 space-y-6">
          {loan.termMonths > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full max-w-sm space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground">
                      Repayment Progress ({paidMonths} of {loan.termMonths} months paid)
                    </span>
                    <span className="font-mono text-primary font-bold">{monthsProgressPercent.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60 p-[1px]">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500 shadow-2xs"
                      style={{ width: `${monthsProgressPercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {Math.max(0, loan.termMonths - paidMonths)} installment(s) remaining
                  </p>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs sm:justify-end">
                  <TimelineStat label="Applied" value={formatMonthYear(loan.applicationDate)} />
                  <TimelineStat label="First Due" value={formatDateShort(loan.firstDueDate)} />
                  <TimelineStat label="Maturity" value={formatDateShort(loan.maturityDate)} />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Application Details */}
            <Section icon={User} title="Application Parameters">
              <DetailGroup heading="Member Identification & Assignment">
                <DetailRow label="Member Number" value={loan.memberNumber} isMono />
                <DetailRow label="Office / Agency" value={loan.officeName} />
                <DetailRow label="Assigned Officer" value={loan.assignedOfficer} />
              </DetailGroup>
              <DetailGroup heading="Loan Terms">
                <DetailRow label="Loan Product" value={loan.loanTypeName || "Not specified"} />
                <DetailRow
                  label="Application Type"
                  value={
                    loan.applicationType === "reloan" ? `Reloan (#${loan.reloanSequence ?? 1})` : "New Loan"
                  }
                />
                <DetailRow label="Repayment Term" value={`${loan.termMonths} months`} isMono />
                <DetailRow label="Monthly Interest" value={`${loan.interestRate}% / month`} isMono />
                <DetailRow label="Payment Method" value={loan.paymentMethod} />
                <DetailRow label="Purpose" value={loan.purpose} />
              </DetailGroup>
            </Section>

            {/* Release Details */}
            <div className="space-y-6">
              {loan.releaseDate ? (
                <Section icon={Building2} title="Disbursement & Release Data" tone="success">
                  <DetailGroup>
                    <DetailRow label="Release Date" value={formatDateShort(loan.releaseDate)} />
                    <DetailRow label="Disbursement Reference" value={loan.releaseReferenceNumber ?? "—"} isMono />
                    <DetailRow label="Release Method" value={loan.releaseMethod ?? "—"} />
                    <DetailRow
                      label="Actual Released"
                      value={loan.actualReleasedAmount != null ? formatCurrency(loan.actualReleasedAmount) : "—"}
                      isMono
                    />
                    {loan.releaseRemarks && <DetailRow label="Release Remarks" value={loan.releaseRemarks} />}
                  </DetailGroup>
                </Section>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
                  This loan is pending release and disbursement.
                </div>
              )}
            </div>
          </div>

          {/* Reloan Lineage */}
          {loan.applicationType === "reloan" && (
            <Section icon={RotateCw} title="Reloan Lineage & Previous Balances" tone="gold">
              <DetailGroup>
                <DetailRow
                  label="Previous Loan Reference"
                  value={
                    loan.previousLoanId ? (
                      <Link
                        to={`/loans/${loan.previousLoanId}`}
                        className="font-mono font-bold text-primary hover:underline"
                      >
                        {loan.previousLoanReference ?? "View Previous Loan"}
                      </Link>
                    ) : (
                      loan.previousLoanReference ?? "—"
                    )
                  }
                />
                <DetailRow label="Reloan Sequence" value={`#${loan.reloanSequence ?? 1}`} isMono />
                {loan.currentNetTakeHomePay != null && (
                  <DetailRow
                    label="Net Take-Home Pay at Filing"
                    value={formatCurrency(loan.currentNetTakeHomePay)}
                    isMono
                  />
                )}
              </DetailGroup>

              {(loan.previousObligationAmount ?? 0) > 0 && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Previous Obligation Settle Status
                  </p>
                  <DetailGroup>
                    <DetailRow
                      label="Obligation Amount"
                      value={formatCurrency(loan.previousObligationAmount ?? 0)}
                      isMono
                    />
                    <DetailRow
                      label="Settlement Method"
                      value={
                        loan.previousObligationSettlementMethod
                          ? SETTLEMENT_METHOD_LABEL[loan.previousObligationSettlementMethod]
                          : "Not specified"
                      }
                    />
                    <DetailRow
                      label="Settlement Timestamp"
                      value={
                        loan.previousObligationSettledAt
                          ? formatDateShort(loan.previousObligationSettledAt)
                          : "Pending Settlement"
                      }
                    />
                  </DetailGroup>
                </div>
              )}
            </Section>
          )}
        </TabsContent>

        {/* TAB 2: Computation Breakdown */}
        <TabsContent value="computation" className="mt-0 space-y-6">
          <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs sm:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                  <Receipt className="size-4" strokeWidth={2.2} />
                </div>
                <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground">
                  Official Calculation Breakdown
                </h3>
              </div>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                Audited Matrix
              </span>
            </div>

            {/* Parameter Matrix */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ComputationDetail label="Loan Product" value={loan.loanTypeName || "Not specified"} />
              <ComputationDetail label="Repayment Term" value={`${loan.termMonths} month(s)`} isMono />
              <ComputationDetail label="Requested Amount" value={formatCurrency(loan.requestedAmount)} isMono />
              <ComputationDetail
                label="Approved Principal"
                value={approvedAmount != null ? formatCurrency(approvedAmount) : "Pending approval"}
                isMono
              />
              <ComputationDetail label="Computation Principal" value={formatCurrency(loan.principal)} isMono />
              <ComputationDetail label="Monthly Interest Rate" value={`${loan.interestRate}% / month`} isMono />
              <ComputationDetail label="Payment Method" value={loan.paymentMethod} />
              <ComputationDetail
                label="Maturity Range"
                value={`${formatDateShort(loan.firstDueDate)} – ${formatDateShort(loan.maturityDate)}`}
              />
            </div>

            {/* Interest & Amortization Calculations */}
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-5 space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Calculator className="size-3.5 text-primary" /> Interest &amp; Payable Schedule
              </h4>
              <div className="space-y-2 pt-1">
                <ComputationLine
                  label="Principal Amount"
                  formula="Base borrowed principal"
                  value={formatCurrency(loan.principal)}
                />
                <ComputationLine
                  label="Total Interest"
                  formula={`${loan.interestRate}% monthly rate across ${loan.termMonths} month(s)`}
                  value={`+ ${formatCurrency(loan.totalInterest)}`}
                  tone="positive"
                />
                <ComputationLine
                  label="Average Monthly Interest"
                  formula={`Total interest ÷ ${loan.termMonths || 1}`}
                  value={formatCurrency(averageMonthlyInterest)}
                />
                <ComputationLine
                  label="Effective Term Interest"
                  formula="Total interest ÷ principal × 100"
                  value={`${effectiveInterestPercent.toFixed(2)}%`}
                />
                <div className="border-t border-border/50 pt-2">
                  <ComputationLine
                    label="Total Amount Payable"
                    formula="Principal + total computed interest"
                    value={formatCurrency(loan.totalAmountPayable)}
                    strong
                  />
                </div>
                <ComputationLine
                  label="Monthly Amortization"
                  formula={`Scheduled amortization payable for ${loan.termMonths} month(s)`}
                  value={formatCurrency(loan.monthlyAmortization)}
                  strong
                />
              </div>
            </div>

            {/* Upfront Deductions & Net Proceeds */}
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-5 space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Banknote className="size-3.5 text-primary" /> Upfront Fees &amp; Net Proceeds
              </h4>
              <div className="space-y-2 pt-1">
                <ComputationLine
                  label="Principal Amount"
                  formula="Approved computation principal"
                  value={formatCurrency(loan.principal)}
                />
                <ComputationLine
                  label="Processing Fee"
                  formula="Administrative processing deduction"
                  value={`− ${formatCurrency(loan.processingFee)}`}
                  tone="negative"
                />
                {serviceCharge > 0 && (
                  <ComputationLine
                    label="Service Charge"
                    formula="Additional pre-release service deduction"
                    value={`− ${formatCurrency(serviceCharge)}`}
                    tone="negative"
                  />
                )}
                <ComputationLine
                  label="Total Deductions"
                  formula="Processing fee + service charges"
                  value={`− ${formatCurrency(totalDeductions)}`}
                  tone="negative"
                />
                <div className="border-t border-border/50 pt-2">
                  <ComputationLine
                    label="Net Proceeds"
                    formula="Principal − upfront deductions"
                    value={formatCurrency(loan.netProceeds)}
                    tone="positive"
                    strong
                  />
                </div>
                {loan.actualReleasedAmount != null && (
                  <ComputationLine
                    label="Actual Released Amount"
                    formula="Confirmed disbursement total"
                    value={formatCurrency(loan.actualReleasedAmount)}
                    strong
                  />
                )}
                {(loan.previousObligationAmount ?? 0) > 0 && (
                  <ComputationLine
                    label="Previous Obligation Deducted"
                    formula={`Settlement: ${
                      loan.previousObligationSettlementMethod
                        ? SETTLEMENT_METHOD_LABEL[loan.previousObligationSettlementMethod]
                        : "Not specified"
                    }`}
                    value={`− ${formatCurrency(loan.previousObligationAmount ?? 0)}`}
                    tone="negative"
                  />
                )}
              </div>
            </div>

            {/* Current Repayment Position */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                Current Repayment Position
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
                <ComputationDetail label="Total Payments Collected" value={formatCurrency(totalPaid)} isMono />
                <ComputationDetail label="Outstanding Principal" value={formatCurrency(loan.outstandingBalance)} isMono />
                <ComputationDetail label="Posted Installment Count" value={`${postedPayments.length}`} isMono />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: Amortization Schedule */}
        <TabsContent value="schedule" className="mt-0">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
            <DataTable
              columns={buildAmortizationColumns(schedule)}
              data={schedule}
              isLoading={isLoadingSchedule}
              isError={isScheduleError}
              onRetry={refetchSchedule}
              emptyTitle="No amortization schedule available"
              emptyDescription="The amortization schedule has not been generated for this loan."
              maxHeight="max-h-[min(80vh,82rem)]"
            />
          </div>
        </TabsContent>

        {/* TAB 4: Payment History */}
        <TabsContent value="payments" className="mt-0">
          {payments.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="No payments recorded"
              description="No payments have been posted for this loan application yet."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
              <Table>
                <TableHeader className="bg-muted/20 border-b border-border/40">
                  <TableRow>
                    <TableHead className="pl-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Reference #
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Payment Date
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Amount Paid
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Official Receipt #
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Received By
                    </TableHead>
                    <TableHead className="pr-5 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/30">
                  {payments.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="pl-5 font-mono text-xs font-semibold text-foreground">
                        {p.paymentReferenceNumber}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {formatDateShort(p.paymentDate)}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.amountPaid)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.officialReceiptNumber || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.receivedBy}</TableCell>
                      <TableCell className="pr-5 text-right">
                        <StatusBadge
                          label={p.status}
                          tone={p.status === "Posted" ? "success" : "danger"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* TAB 5: Requirements & Reloan Hub */}
        <TabsContent value="requirements" className="mt-0 space-y-6">
          {/* Dynamic ReLoan Evaluation Hub */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
            <div className="flex items-center gap-2.5 border-b border-border/40 bg-muted/15 px-6 py-4">
              <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                <ClipboardCheck className="size-4" strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
                  Automated ReLoan Evaluation Engine
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Evaluates eligibility parameters and thresholds in real-time.
                </p>
              </div>
            </div>
            <div className="p-6">
              <ReloanEligibilityCard loanId={id} />
            </div>
          </div>

          {/* Documentary Requirements & Eligibility Checks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xs space-y-4">
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
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        req.completed
                          ? "bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-muted-foreground/15 text-muted-foreground"
                      )}
                    >
                      {req.completed ? "✓" : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
                <ShieldCheck className="size-4 text-primary" />
                Eligibility Verification Matrix
              </h3>
              <EligibilityChecklist items={loan.eligibility} result={eligibilityResult} />
            </div>
          </div>
        </TabsContent>

        {/* TAB 6: Approval History */}
        <TabsContent value="approvals" className="mt-0">
          <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xs backdrop-blur-xs">
            <ApprovalTimeline history={history} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

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
    primary: "border-primary/20 bg-primary/10 text-primary",
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    gold: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  }[tone]

  return (
    <div className="rounded-2xl border border-border/60 bg-card/90 shadow-xs overflow-hidden backdrop-blur-xs">
      <div className="px-5 py-3.5 flex items-center gap-2.5 border-b border-border/40 bg-muted/15">
        <span className={cn("flex size-7 items-center justify-center rounded-lg border shadow-2xs", toneClasses)}>
          <Icon className="size-3.5" />
        </span>
        <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function TimelineStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono text-xs font-semibold text-foreground">{value}</p>
    </div>
  )
}

function DetailGroup({ heading, children }: { heading?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {heading && (
        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider pb-0.5">
          {heading}
        </div>
      )}
      <dl className="text-xs space-y-0">{children}</dl>
    </div>
  )
}

function DetailRow({
  label,
  value,
  isMono,
}: {
  label: string
  value: React.ReactNode
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

function ComputationDetail({
  label,
  value,
  isMono,
}: {
  label: string
  value: string
  isMono?: boolean
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1 shadow-2xs">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("text-xs font-bold text-foreground", isMono && "font-mono")}>{value}</p>
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
  const valueTone =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground"

  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <p className={strong ? "text-xs font-bold text-foreground" : "text-xs font-semibold text-foreground"}>
          {label}
        </p>
        <p className="text-[11px] text-muted-foreground">{formula}</p>
      </div>
      <span
        className={cn(
          "shrink-0 text-right font-mono",
          strong ? "text-sm font-bold" : "text-xs font-semibold",
          valueTone
        )}
      >
        {value}
      </span>
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
  tone?: "primary" | "success" | "warning"
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
          tone === "primary"
            ? "text-primary font-mono"
            : tone === "success"
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