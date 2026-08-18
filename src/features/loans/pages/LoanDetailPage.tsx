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
  Eye,
  Check,
  TrendingUp,
  Sparkles,
  Layers,
  ArrowUpRight,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
        <div className="flex size-6 items-center justify-center rounded-md bg-muted/60 font-mono text-xs font-bold text-muted-foreground">
          {row.original.installmentNumber}
        </div>
      ),
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium text-foreground">{formatDateShort(row.original.dueDate)}</span>
      ),
    },
    {
      accessorKey: "beginningBalance",
      header: "Beginning Bal.",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{formatCurrency(row.original.beginningBalance)}</span>
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
        <span className={cn("font-mono text-xs", row.original.penalty > 0 ? "font-semibold text-destructive" : "text-muted-foreground")}>
          {formatCurrency(row.original.penalty)}
        </span>
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
          <div className="space-y-0.5">
            <span className="font-mono text-xs font-bold text-primary">
              {formatCurrency(row.original.amountDue)}
            </span>
            {carriedShortfall > 0 && (
              <div className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-600 dark:text-amber-400">
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
      header: "Ending Balance",
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
    <div className="space-y-6 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 rounded-xl px-3 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground border border-transparent hover:border-border/60 transition-all shadow-2xs"
          render={<Link to="/loans" />}
        >
          <ArrowLeft className="size-3.5" /> Back to Loan Applications
        </Button>
      </div>

      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card/95 to-card/70 p-6 sm:p-8 shadow-sm backdrop-blur-md">
        {/* Subtle Ambient Decorative Lighting */}
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 -bottom-24 size-64 rounded-full bg-emerald-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="flex size-14 sm:size-16 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary shadow-sm ring-4 ring-primary/5">
              <Landmark className="size-7 sm:size-8" strokeWidth={2.2} />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {loan.applicationNumber}
                </h1>
                <StatusBadge label={loan.status} tone={LOAN_STATUS_TONE[loan.status]} />
                {loan.applicationType === "reloan" && (
                  <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-xs">
                    <RotateCw className="size-3" /> Reloan #{loan.reloanSequence ?? 1}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                <Link
                  to={`/members/${loan.memberId}`}
                  className="group inline-flex items-center gap-1.5 rounded-md font-semibold text-foreground hover:text-primary transition-colors"
                >
                  <User className="size-3.5 text-primary" />
                  <span className="group-hover:underline">{loan.memberName}</span>
                </Link>
                <span>•</span>
                <span className="font-mono rounded bg-muted/60 px-1.5 py-0.5 text-foreground/80">{loan.memberNumber}</span>
                <span>•</span>
                <span className="font-medium text-foreground">{loan.loanTypeName}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Building2 className="size-3" /> {loan.officeName}
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
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
                className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold shadow-xs hover:shadow-sm active:scale-95 transition-all"
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
                className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-medium bg-card/80 shadow-2xs hover:bg-muted active:scale-95 transition-all"
                render={<Link to={`/loans/${loan.id}/application-form`} />}
              >
                <FileText className="size-3.5" /> Form
              </PermissionButton>
            )}

            {loan.releaseDate && (
              <PermissionButton
                permission="loans.print"
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-medium bg-card/80 shadow-2xs hover:bg-muted active:scale-95 transition-all"
                render={<Link to={`/loans/${loan.id}/disbursement-voucher`} />}
              >
                <Receipt className="size-3.5" /> Voucher
              </PermissionButton>
            )}

            <ReloanButton loan={loan} eligible={reloanEligible} blockedReason={reloanBlockedReason} />

            {["Released", "Active", "Overdue", "Restructured"].includes(loan.status) &&
              loan.outstandingBalance > 0 && (
                <PermissionButton
                  permission="loan_payments.create"
                  size="sm"
                  className="h-9 gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95 active:scale-95 transition-all"
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
          </div>
        </div>

        {/* Status Notification Alerts */}
        <div className="mt-5 space-y-2.5">
          {loan.rejectionReason && (
            <AlertBanner tone="danger" title="Application Rejected" description={loan.rejectionReason} />
          )}
          {loan.cancellationReason && (
            <AlertBanner tone="warning" title="Application Cancelled" description={loan.cancellationReason} />
          )}
          {loan.eligibilityOverridden && (
            <AlertBanner
              tone="warning"
              title="Administrative Override Applied"
              description={
                loan.eligibilityOverrideReason ||
                "One or more criteria were bypassed through an authorized administrative override."
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
            tone="default"
          />
          <SummaryStat
            label="Approved Principal"
            value={approvedAmount != null ? formatCurrency(approvedAmount) : "—"}
            tone={approvedAmount != null ? "success" : "default"}
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
            tone={loan.outstandingBalance > 0 ? "warning" : "success"}
            icon={Banknote}
          />
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="overview" className="space-y-5">
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <TabsList className="inline-flex h-12 items-center gap-1.5 rounded-2xl border border-border/70 bg-card/60 p-1.5 shadow-2xs backdrop-blur-md">
            <TabsTrigger value="overview" className="rounded-xl px-4 py-2 text-xs font-semibold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all">
              <LayoutGrid className="size-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="computation" className="rounded-xl px-4 py-2 text-xs font-semibold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all">
              <Receipt className="size-3.5" /> Computation Breakdown
            </TabsTrigger>
            <TabsTrigger value="schedule" className="rounded-xl px-4 py-2 text-xs font-semibold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all">
              <Calendar className="size-3.5" /> Amortization Schedule
            </TabsTrigger>
            <TabsTrigger value="payments" className="rounded-xl px-4 py-2 text-xs font-semibold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all">
              <Banknote className="size-3.5" /> Payment History
            </TabsTrigger>
            <TabsTrigger value="requirements" className="rounded-xl px-4 py-2 text-xs font-semibold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all">
              <ClipboardCheck className="size-3.5" /> Requirements &amp; Reloan Hub
            </TabsTrigger>
            <TabsTrigger value="approvals" className="rounded-xl px-4 py-2 text-xs font-semibold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all">
              <Clock className="size-3.5" /> Approval History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: Overview */}
        <TabsContent value="overview" className="mt-0 space-y-6">
          {loan.termMonths > 0 && (
            <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-r from-card via-card to-primary/[0.03] p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full max-w-md space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">Repayment Progress</span>
                      <Badge variant="secondary" className="font-mono text-[10px] font-bold">
                        {paidMonths}/{loan.termMonths} Months
                      </Badge>
                    </div>
                    <span className="font-mono text-sm font-extrabold text-primary">
                      {monthsProgressPercent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/80 p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-700 shadow-xs"
                      style={{ width: `${monthsProgressPercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="size-3 text-primary" />
                    <span>{Math.max(0, loan.termMonths - paidMonths)} installment(s) remaining until full maturity</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 sm:gap-8 rounded-xl border border-border/50 bg-muted/20 p-3 sm:p-4 text-xs">
                  <TimelineStat label="Application Date" value={formatMonthYear(loan.applicationDate)} />
                  <TimelineStat label="First Due Date" value={formatDateShort(loan.firstDueDate)} />
                  <TimelineStat label="Maturity Date" value={formatDateShort(loan.maturityDate)} />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Application Parameters */}
            <Section icon={User} title="Application Parameters">
              <DetailGroup heading="Member & Office Assignment">
                <DetailRow label="Member Account #" value={loan.memberNumber} isMono />
                <DetailRow label="Office / Branch Agency" value={loan.officeName} />
                <DetailRow label="Loan Officer in Charge" value={loan.assignedOfficer} />
              </DetailGroup>
              <DetailGroup heading="Terms & Policy">
                <DetailRow label="Loan Product Specification" value={loan.loanTypeName || "Not specified"} />
                <DetailRow
                  label="Application Classification"
                  value={
                    loan.applicationType === "reloan" ? `Reloan (#${loan.reloanSequence ?? 1})` : "New Standard Loan"
                  }
                />
                <DetailRow label="Repayment Tenure" value={`${loan.termMonths} Months`} isMono />
                <DetailRow label="Monthly Interest Rate" value={`${loan.interestRate}% per month`} isMono />
                <DetailRow label="Collection Method" value={loan.paymentMethod} />
                <DetailRow label="Stated Purpose" value={loan.purpose} />
              </DetailGroup>
            </Section>

            {/* Release Details */}
            <div className="space-y-6">
              {loan.releaseDate ? (
                <Section icon={Building2} title="Disbursement & Release Data" tone="success">
                  <DetailGroup heading="Settlement Confirmation">
                    <DetailRow label="Confirmed Release Date" value={formatDateShort(loan.releaseDate)} />
                    <DetailRow label="Disbursement Reference" value={loan.releaseReferenceNumber ?? "—"} isMono />
                    <DetailRow label="Payment Channel / Method" value={loan.releaseMethod ?? "—"} />
                    <DetailRow
                      label="Actual Amount Disbursed"
                      value={loan.actualReleasedAmount != null ? formatCurrency(loan.actualReleasedAmount) : "—"}
                      isMono
                    />
                    {loan.releaseRemarks && <DetailRow label="Release Officer Remarks" value={loan.releaseRemarks} />}
                  </DetailGroup>
                </Section>
              ) : (
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/10 p-8 text-center">
                  <div className="rounded-full bg-muted p-3 text-muted-foreground mb-2">
                    <Clock className="size-5" />
                  </div>
                  <h4 className="font-heading text-sm font-semibold text-foreground">Pending Disbursement</h4>
                  <p className="max-w-xs text-xs text-muted-foreground mt-1">
                    This loan application has not been released. Disbursement records will appear once processed.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Reloan Lineage */}
          {loan.applicationType === "reloan" && (
            <Section icon={RotateCw} title="Reloan Lineage & Previous Balances" tone="gold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailGroup heading="Preceding Loan Record">
                  <DetailRow
                    label="Previous Loan Reference"
                    value={
                      loan.previousLoanId ? (
                        <Link
                          to={`/loans/${loan.previousLoanId}`}
                          className="inline-flex items-center gap-1 font-mono font-bold text-primary hover:underline"
                        >
                          {loan.previousLoanReference ?? "View Previous"} <ArrowUpRight className="size-3" />
                        </Link>
                      ) : (
                        loan.previousLoanReference ?? "—"
                      )
                    }
                  />
                  <DetailRow label="Reloan Cycle Sequence" value={`Cycle #${loan.reloanSequence ?? 1}`} isMono />
                  {loan.currentNetTakeHomePay != null && (
                    <DetailRow
                      label="Net Take-Home Pay (Filing)"
                      value={formatCurrency(loan.currentNetTakeHomePay)}
                      isMono
                    />
                  )}
                </DetailGroup>

                {(loan.previousObligationAmount ?? 0) > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Carried Balance Deductions
                      </span>
                      <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 text-[10px]">
                        Linked
                      </Badge>
                    </div>
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
                        label="Settlement Date"
                        value={
                          loan.previousObligationSettledAt
                            ? formatDateShort(loan.previousObligationSettledAt)
                            : "Pending Release"
                        }
                      />
                    </DetailGroup>
                  </div>
                )}
              </div>
            </Section>
          )}
        </TabsContent>

        {/* TAB 2: Computation Breakdown */}
        <TabsContent value="computation" className="mt-0 space-y-6">
          <div className="rounded-3xl border border-border/80 bg-card/90 p-6 sm:p-8 shadow-xs backdrop-blur-md space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4">
              <div>
                <h3 className="font-heading text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Calculator className="size-4 text-primary" /> Official Calculation Matrix
                </h3>
                <p className="text-xs text-muted-foreground">
                  Audited financial schedule and net proceeds computation.
                </p>
              </div>
              <span className="self-start sm:self-auto rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                Verified Formula
              </span>
            </div>

            {/* Parameter Matrix Header */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ComputationDetail label="Loan Product" value={loan.loanTypeName || "—"} />
              <ComputationDetail label="Repayment Term" value={`${loan.termMonths} Months`} isMono />
              <ComputationDetail label="Monthly Interest Rate" value={`${loan.interestRate}% / mo`} isMono />
              <ComputationDetail
                label="Coverage Span"
                value={`${formatDateShort(loan.firstDueDate)} – ${formatDateShort(loan.maturityDate)}`}
              />
            </div>

            {/* Calculations Breakdown Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Interest & Payable Schedule */}
              <div className="rounded-2xl border border-border/70 bg-muted/15 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Layers className="size-3.5 text-primary" /> Schedule &amp; Total Cost
                  </h4>
                  <span className="text-[10px] font-mono text-muted-foreground">{loan.termMonths} Installments</span>
                </div>

                <div className="space-y-2 text-xs">
                  <ComputationLine
                    label="Principal Borrowed"
                    formula="Base computation loan amount"
                    value={formatCurrency(loan.principal)}
                  />
                  <ComputationLine
                    label="Total Accumulated Interest"
                    formula={`${loan.interestRate}% monthly rate × ${loan.termMonths} mos`}
                    value={`+ ${formatCurrency(loan.totalInterest)}`}
                    tone="positive"
                  />
                  <ComputationLine
                    label="Average Monthly Interest"
                    formula={`Total interest ÷ ${loan.termMonths || 1}`}
                    value={formatCurrency(averageMonthlyInterest)}
                  />
                  <ComputationLine
                    label="Effective Term Rate"
                    formula="Total interest ÷ principal"
                    value={`${effectiveInterestPercent.toFixed(2)}%`}
                  />

                  <div className="border-t border-border/60 pt-3 mt-2">
                    <ComputationLine
                      label="Total Amount Payable"
                      formula="Principal + Total interest"
                      value={formatCurrency(loan.totalAmountPayable)}
                      strong
                    />
                  </div>

                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 mt-3">
                    <ComputationLine
                      label="Monthly Amortization Due"
                      formula={`Scheduled monthly installment`}
                      value={formatCurrency(loan.monthlyAmortization)}
                      strong
                      tone="primary"
                    />
                  </div>
                </div>
              </div>

              {/* Upfront Deductions & Net Proceeds */}
              <div className="rounded-2xl border border-border/70 bg-muted/15 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Receipt className="size-3.5 text-primary" /> Deductions &amp; Disbursement
                  </h4>
                  <span className="text-[10px] font-mono text-muted-foreground">Upfront Ledger</span>
                </div>

                <div className="space-y-2 text-xs">
                  <ComputationLine
                    label="Computation Principal"
                    formula="Approved loan volume"
                    value={formatCurrency(loan.principal)}
                  />
                  <ComputationLine
                    label="Processing & Administrative Fee"
                    formula="Standard document processing charge"
                    value={`− ${formatCurrency(loan.processingFee)}`}
                    tone="negative"
                  />
                  {serviceCharge > 0 && (
                    <ComputationLine
                      label="Service Charge"
                      formula="Additional administrative deduction"
                      value={`− ${formatCurrency(serviceCharge)}`}
                      tone="negative"
                    />
                  )}
                  {(loan.previousObligationAmount ?? 0) > 0 && (
                    <ComputationLine
                      label="Carried Obligation Deducted"
                      formula="Settlement of preceding balance"
                      value={`− ${formatCurrency(loan.previousObligationAmount ?? 0)}`}
                      tone="negative"
                    />
                  )}

                  <div className="border-t border-border/60 pt-3 mt-2">
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] p-3.5">
                      <ComputationLine
                        label="Net Take-Home Proceeds"
                        formula="Principal minus all upfront deductions"
                        value={formatCurrency(loan.netProceeds)}
                        tone="positive"
                        strong
                      />
                    </div>
                  </div>

                  {loan.actualReleasedAmount != null && (
                    <ComputationLine
                      label="Actual Confirmed Released"
                      formula="Final disbursement voucher confirmed"
                      value={formatCurrency(loan.actualReleasedAmount)}
                      strong
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Current Repayment Position Banner */}
            <div className="rounded-2xl border border-border/70 bg-gradient-to-r from-muted/30 via-card to-muted/30 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Current Repayment Overview
                  </h4>
                  <p className="text-xs text-muted-foreground">Status based on posted collections.</p>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Collected</span>
                    <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(totalPaid)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Active Outstanding</span>
                    <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(loan.outstandingBalance)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Posted Payments</span>
                    <span className="font-mono text-sm font-bold text-foreground">
                      {postedPayments.length} txns
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: Amortization Schedule */}
        <TabsContent value="schedule" className="mt-0">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
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
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
              <Table>
                <TableHeader className="bg-muted/30 border-b border-border/50">
                  <TableRow>
                    <TableHead className="pl-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
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
                    <TableHead className="pr-6 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/30">
                  {payments.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="pl-6 font-mono text-xs font-bold text-foreground">
                        {p.paymentReferenceNumber}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {formatDateShort(p.paymentDate)}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.amountPaid)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.officialReceiptNumber || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.receivedBy}</TableCell>
                      <TableCell className="pr-6 text-right">
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
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
            <div className="flex items-center gap-3 border-b border-border/40 bg-gradient-to-r from-primary/5 via-card to-transparent px-6 py-4">
              <div className="flex size-8 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-2xs">
                <Sparkles className="size-4" />
              </div>
              <div>
                <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
                  Automated ReLoan Evaluation Engine
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Real-time algorithmic check against cooperative reloan eligibility thresholds.
                </p>
              </div>
            </div>
            <div className="p-6">
              <ReloanEligibilityCard loanId={id} />
            </div>
          </div>

          {/* Documentary Requirements & Eligibility Checks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  Documentary Requirements
                </h3>
                <span className="text-xs text-muted-foreground">
                  {loan.requirements.filter((r) => r.completed).length} of {loan.requirements.length} Completed
                </span>
              </div>
              <ul className="space-y-2.5">
                {loan.requirements.map((req) => (
                  <li
                    key={req.label}
                    className={cn(
                      "flex items-center justify-between p-3.5 rounded-xl border text-xs transition-all duration-200",
                      req.completed
                        ? "bg-emerald-500/[0.04] border-emerald-500/25 text-foreground"
                        : "bg-muted/15 border-border/50 text-muted-foreground"
                    )}
                  >
                    <span className={req.completed ? "font-semibold text-foreground" : "text-muted-foreground"}>
                      {req.label}
                    </span>
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-transform",
                        req.completed
                          ? "bg-emerald-500 text-white shadow-2xs"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {req.completed ? <Check className="size-3.5 stroke-[3]" /> : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  Eligibility Verification Matrix
                </h3>
                <span className="text-xs font-mono font-medium text-muted-foreground">{eligibilityResult}</span>
              </div>
              <EligibilityChecklist items={loan.eligibility} result={eligibilityResult} />
            </div>
          </div>
        </TabsContent>

        {/* TAB 6: Approval History */}
        <TabsContent value="approvals" className="mt-0">
          <div className="rounded-2xl border border-border/70 bg-card p-6 sm:p-8 shadow-xs">
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
    <div className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
      <div className="px-5 py-3.5 flex items-center gap-2.5 border-b border-border/40 bg-muted/20">
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
      <p className="font-mono text-xs font-bold text-foreground mt-0.5">{value}</p>
    </div>
  )
}

function DetailGroup({ heading, children }: { heading?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {heading && (
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pb-1 border-b border-border/20 mb-1">
          {heading}
        </div>
      )}
      <dl className="space-y-0">{children}</dl>
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
    <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0 gap-4 text-xs">
      <dt className="text-muted-foreground font-medium shrink-0">{label}</dt>
      <dd
        className={cn(
          "font-semibold text-foreground text-right truncate max-w-[260px]",
          isMono && "font-mono font-bold"
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
    <div className="rounded-xl border border-border/60 bg-muted/25 p-3.5 space-y-1">
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
  tone?: "default" | "positive" | "negative" | "primary"
  strong?: boolean
}) {
  const valueTone =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400 font-bold"
      : tone === "negative"
        ? "text-destructive font-semibold"
        : tone === "primary"
          ? "text-primary font-extrabold"
          : "text-foreground font-semibold"

  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <p className={strong ? "text-xs font-bold text-foreground" : "text-xs font-medium text-foreground"}>
          {label}
        </p>
        <p className="text-[11px] text-muted-foreground">{formula}</p>
      </div>
      <span
        className={cn(
          "shrink-0 text-right font-mono",
          strong ? "text-sm" : "text-xs",
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
  tone = "default",
  icon: Icon,
}: {
  label: string
  value: string
  tone?: "primary" | "success" | "warning" | "default"
  icon?: React.ComponentType<{ className?: string }>
}) {
  const iconTones = {
    primary: "border-primary/20 bg-primary/10 text-primary",
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    default: "border-border/60 bg-muted/60 text-muted-foreground",
  }[tone]

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/90 p-4 shadow-2xs backdrop-blur-xs transition-all hover:border-border">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("flex size-7 items-center justify-center rounded-lg border shadow-2xs", iconTones)}>
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <p
        className={cn(
          "font-heading text-lg sm:text-xl font-extrabold tracking-tight mt-2 font-mono",
          tone === "primary" && "text-primary",
          tone === "success" && "text-emerald-600 dark:text-emerald-400",
          tone === "warning" && "text-amber-600 dark:text-amber-400",
          tone === "default" && "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  )
}