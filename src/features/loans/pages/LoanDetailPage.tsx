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
  AlertCircle, 
  ArrowLeft, 
  Receipt, 
  ClipboardCheck,
  Building2,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable } from "@/components/shared/DataTable"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PrintButton } from "@/components/shared/PrintButton"
import { ApprovalTimeline } from "@/components/shared/ApprovalTimeline"
import { EmptyState } from "@/components/shared/EmptyState"
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getLoan, getLoanApprovalHistory, getLoanSchedule } from "@/services/loans.service"
import { getAllLoanPayments } from "@/services/loan-payments.service"
import { ReloanButton } from "@/features/loans/components/ReloanButton"
import { ReloanEligibilityCard } from "@/features/loans/components/ReloanEligibilityCard"
import { LOAN_STATUS_TONE, AMORTIZATION_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"
import type { AmortizationEntry } from "@/types"

const amortizationColumns: ColumnDef<AmortizationEntry, unknown>[] = [
  { accessorKey: "installmentNumber", header: "#" },
  { accessorKey: "dueDate", header: "Due Date", cell: ({ row }) => formatDateShort(row.original.dueDate) },
  { accessorKey: "beginningBalance", header: "Beginning Balance", cell: ({ row }) => formatCurrency(row.original.beginningBalance) },
  { accessorKey: "principal", header: "Principal", cell: ({ row }) => formatCurrency(row.original.principal) },
  { accessorKey: "interest", header: "Interest", cell: ({ row }) => formatCurrency(row.original.interest) },
  { accessorKey: "penalty", header: "Penalty", cell: ({ row }) => formatCurrency(row.original.penalty) },
  { accessorKey: "amountDue", header: "Amount Due", cell: ({ row }) => formatCurrency(row.original.amountDue) },
  { accessorKey: "amountPaid", header: "Amount Paid", cell: ({ row }) => formatCurrency(row.original.amountPaid) },
  { accessorKey: "remainingBalance", header: "Remaining Balance", cell: ({ row }) => formatCurrency(row.original.remainingBalance) },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge label={row.original.status} tone={AMORTIZATION_STATUS_TONE[row.original.status]} />,
  },
]

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

  const [reloanEligible, setReloanEligible] = React.useState(false)
  const [reloanBlockedReason, setReloanBlockedReason] = React.useState<string>()

  useBreadcrumbExtra(loan?.applicationNumber)

  if (isLoading) return <ProfileSkeleton cards={3} />
  if (!loan) return <EmptyState icon={Landmark} title="Loan application not found" description="This loan application may have been removed." />

  const hasReachedApproval = ["Approved", "Released", "Active", "Fully Paid", "Overdue", "Restructured"].includes(loan.status)
  const approvedAmount = loan.approvedAmount ?? (hasReachedApproval ? loan.requestedAmount : undefined)
  const serviceCharge = Math.max(0, loan.principal - loan.processingFee - loan.netProceeds)
  const postedPayments = payments.filter((payment) => payment.status === "Posted")
  const totalPaid = postedPayments.reduce((sum, payment) => sum + payment.amountPaid, 0)
  const totalDeductions = loan.processingFee + serviceCharge
  const averageMonthlyInterest = loan.termMonths > 0 ? loan.totalInterest / loan.termMonths : 0
  const effectiveInterestPercent = loan.principal > 0 ? (loan.totalInterest / loan.principal) * 100 : 0

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-4 md:px-0">
      {/* Top Navigation Anchor */}
      <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
        <Link to="/loans" className="inline-flex items-center gap-2 hover:text-foreground transition-colors group">
          <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Loan Applications
        </Link>
      </div>

      <PageHeader
        title={loan.applicationNumber}
        description={`${loan.memberName} · ${loan.loanTypeName}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={loan.status} tone={LOAN_STATUS_TONE[loan.status]} className="h-8 px-3 text-xs font-semibold" />
            {loan.applicationType === "reloan" && <StatusBadge label={`Reloan #${loan.reloanSequence ?? 1}`} tone="gold" className="h-8 px-3 text-xs font-semibold" />}
            <ReloanButton loan={loan} eligible={reloanEligible} blockedReason={reloanBlockedReason} />
            <PrintButton permission="loans.print" label="Print Application" />
          </div>
        }
      />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Side: Interactive Area */}
        <div className="space-y-6 lg:col-span-2">
          {/* Key Metric Stat Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryStat 
              label="Requested Amount" 
              value={formatCurrency(loan.requestedAmount)} 
              icon={DollarSign}
            />
            <SummaryStat 
              label="Approved Amount" 
              value={approvedAmount != null ? formatCurrency(approvedAmount) : "—"} 
              icon={CheckCircle2}
              variant={approvedAmount != null ? "success" : "default"}
            />
            <SummaryStat 
              label="Monthly Amortization" 
              value={formatCurrency(loan.monthlyAmortization)} 
              icon={Calendar}
            />
            <SummaryStat 
              label="Outstanding Balance" 
              value={formatCurrency(loan.outstandingBalance)} 
              icon={Banknote}
              variant={loan.outstandingBalance > 0 ? "warning" : "default"}
            />
          </div>

          {/* Interactive Navigation Tabs */}
          <Tabs defaultValue="schedule" className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1 w-full md:w-auto border border-border/40 rounded-xl">
              <TabsTrigger value="schedule" className="flex items-center gap-2 py-2 px-3 text-xs font-medium rounded-lg">
                <Calendar className="size-3.5" />
                Amortization Schedule
              </TabsTrigger>
              <TabsTrigger value="computation" className="flex items-center gap-2 py-2 px-3 text-xs font-medium rounded-lg">
                <Receipt className="size-3.5" />
                Computation
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2 py-2 px-3 text-xs font-medium rounded-lg">
                <Banknote className="size-3.5" />
                Payment History
              </TabsTrigger>
              <TabsTrigger value="requirements" className="flex items-center gap-2 py-2 px-3 text-xs font-medium rounded-lg">
                <ClipboardCheck className="size-3.5" />
                Requirements &amp; Eligibility
              </TabsTrigger>
              <TabsTrigger value="approvals" className="flex items-center gap-2 py-2 px-3 text-xs font-medium rounded-lg">
                <Clock className="size-3.5" />
                Approval History
              </TabsTrigger>
            </TabsList>

            {/* TAB: Amortization Schedule (Focused entirely on the schedule data) */}
            <TabsContent value="schedule" className="mt-4 outline-none focus-visible:ring-0">
              <DataTable
                columns={amortizationColumns}
                data={schedule}
                isLoading={isLoadingSchedule}
                isError={isScheduleError}
                onRetry={refetchSchedule}
                emptyTitle="No amortization schedule"
                emptyDescription="The amortization schedule has not been generated for this loan."
                maxHeight="max-h-[min(80vh,82rem)]"
              />
            </TabsContent>

            {/* TAB: Computation Breakdown */}
            <TabsContent value="computation" className="mt-4 outline-none focus-visible:ring-0">
              <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border bg-muted/20 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 rounded bg-background border border-border/60">
                      <Receipt className="size-3.5 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Loan Computation Breakdown</h3>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/80 px-2 py-0.5 rounded">
                    Calculated Breakdown
                  </span>
                </div>
                <div className="space-y-5 p-6">
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

                  <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Interest and Payable Amount</h4>
                    <div className="space-y-2">
                      <ComputationLine label="Principal" formula="Base amount borrowed" value={formatCurrency(loan.principal)} />
                      <ComputationLine label="Total Interest" formula={`${loan.interestRate}% monthly rate over ${loan.termMonths} month(s)`} value={`+ ${formatCurrency(loan.totalInterest)}`} tone="positive" />
                      <ComputationLine label="Average Interest per Month" formula={`Total interest ÷ ${loan.termMonths || 1}`} value={formatCurrency(averageMonthlyInterest)} />
                      <ComputationLine label="Effective Interest over Full Term" formula="Total interest ÷ principal × 100" value={`${effectiveInterestPercent.toFixed(2)}%`} />
                      <div className="border-t border-border pt-2">
                        <ComputationLine label="Total Amount Payable" formula="Principal + total interest" value={formatCurrency(loan.totalAmountPayable)} strong />
                      </div>
                      <ComputationLine label="Monthly Amortization" formula={`Scheduled payable amount for each of ${loan.termMonths} month(s)`} value={formatCurrency(loan.monthlyAmortization)} strong />
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Release and Deductions</h4>
                    <div className="space-y-2">
                      <ComputationLine label="Principal" formula="Approved computation principal" value={formatCurrency(loan.principal)} />
                      <ComputationLine label="Processing Fee" formula="Deducted before release" value={`− ${formatCurrency(loan.processingFee)}`} tone="negative" />
                      {serviceCharge > 0 && <ComputationLine label="Service Charge" formula="Additional charge deducted before release" value={`− ${formatCurrency(serviceCharge)}`} tone="negative" />}
                      <ComputationLine label="Total Upfront Deductions" formula="Processing fee + service charge" value={`− ${formatCurrency(totalDeductions)}`} tone="negative" />
                      <div className="border-t border-border pt-2">
                        <ComputationLine label="Net Proceeds" formula="Principal − upfront deductions" value={formatCurrency(loan.netProceeds)} tone="positive" strong />
                      </div>
                      {loan.actualReleasedAmount != null && <ComputationLine label="Actual Released Amount" formula="Amount confirmed during release" value={formatCurrency(loan.actualReleasedAmount)} strong />}
                      {(loan.previousObligationAmount ?? 0) > 0 && <ComputationLine label="Previous Obligation" formula={`Settlement: ${loan.previousObligationSettlementMethod ?? "Not specified"}`} value={`− ${formatCurrency(loan.previousObligationAmount ?? 0)}`} tone="negative" />}
                    </div>
                  </div>

                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Current Repayment Position</h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <ComputationDetail label="Posted Payments" value={formatCurrency(totalPaid)} />
                      <ComputationDetail label="Outstanding Balance" value={formatCurrency(loan.outstandingBalance)} />
                      <ComputationDetail label="Installments Posted" value={`${postedPayments.length}`} />
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                      The outstanding balance is the server-calculated remaining obligation after posted payments and applicable schedule adjustments. Refer to the Amortization Schedule for the principal, interest, penalty, and remaining balance per installment.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB: Payment History */}
            <TabsContent value="payments" className="mt-4 outline-none focus-visible:ring-0">
              {payments.length === 0 ? (
                <EmptyState icon={Banknote} title="No payments recorded" description="No payments have been posted for this loan yet." />
              ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/30 border-b border-border">
                      <TableRow>
                        <TableHead className="font-bold text-xs uppercase tracking-wider h-11 text-foreground">Reference #</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider h-11 text-foreground">Payment Date</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider h-11 text-foreground">Amount Paid</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider h-11 text-foreground">O.R. Number</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider h-11 text-foreground">Received By</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider h-11 text-foreground text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id} className="hover:bg-muted/10 transition-colors">
                          <TableCell className="font-semibold text-foreground">{p.paymentReferenceNumber}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{formatDateShort(p.paymentDate)}</TableCell>
                          <TableCell className="font-semibold text-foreground">{formatCurrency(p.amountPaid)}</TableCell>
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

            {/* TAB: Unified Requirements & ReLoan Eligibility Hub */}
            <TabsContent value="requirements" className="mt-4 outline-none focus-visible:ring-0 space-y-6">
              {/* Dynamic ReLoan Evaluation (Top Highlight) */}
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-border bg-muted/20 px-5 py-4">
                  <div className="rounded-lg border border-border/60 bg-background p-1.5">
                    <ClipboardCheck className="size-3.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">ReLoan Evaluation Engine</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Automated compliance evaluation tracking outstanding parameters.</p>
                  </div>
                </div>
                <div className="bg-card p-5">
                  <ReloanEligibilityCard loanId={id} onResult={(eligible, reason) => { setReloanEligible(eligible); setReloanBlockedReason(reason) }} />
                </div>
              </div>

              {/* Requirement Checklists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Documentary Requirements */}
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
                    <FileText className="size-4 text-primary" />
                    Documentary Requirements
                  </h3>
                  <ul className="space-y-2.5">
                    {loan.requirements.map((req) => (
                      <li 
                        key={req.label} 
                        className={`flex items-center justify-between p-3 rounded-lg border text-xs transition-all duration-200 ${
                          req.completed 
                            ? "bg-emerald-500/5 border-emerald-500/10 text-foreground" 
                            : "bg-muted/20 border-border/50 text-muted-foreground"
                        }`}
                      >
                        <span className={req.completed ? "font-medium text-foreground" : "text-muted-foreground"}>
                          {req.label}
                        </span>
                        <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          req.completed 
                            ? "bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-400" 
                            : "bg-muted-foreground/15 text-muted-foreground"
                        }`}>
                          {req.completed ? "✓" : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Eligibility Checklist */}
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
                    <ClipboardCheck className="size-4 text-primary" />
                    Eligibility Checklist
                  </h3>
                  <ul className="space-y-2.5">
                    {loan.eligibility.map((item) => (
                      <li 
                        key={item.label} 
                        className={`flex items-start gap-3 p-3 rounded-lg border text-xs transition-all duration-200 ${
                          item.passed 
                            ? "bg-emerald-500/5 border-emerald-500/10" 
                            : "bg-rose-500/5 border-rose-500/10"
                        }`}
                      >
                        <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          item.passed 
                            ? "bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-400" 
                            : "bg-rose-500 text-white dark:bg-rose-500/20 dark:text-rose-400"
                        }`}>
                          {item.passed ? "✓" : "✕"}
                        </span>
                        <div className="space-y-1">
                          <span className={`block font-medium ${item.passed ? "text-foreground" : "text-muted-foreground line-through"}`}>
                            {item.label}
                          </span>
                          <span className="block text-[11px] text-muted-foreground leading-relaxed">{item.detail}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* TAB: Approvals Timeline */}
            <TabsContent value="approvals" className="mt-4 outline-none focus-visible:ring-0">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <ApprovalTimeline history={history} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Side: Sticky Sidebar Metadata */}
        <div className="space-y-6 lg:self-start lg:sticky lg:top-6">
          {/* Rejection Notification Banner */}
          {loan.rejectionReason && (
            <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 flex gap-3 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive"></div>
              <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5 pl-1" />
              <div>
                <h3 className="text-sm font-semibold text-destructive">Application Rejected</h3>
                <p className="text-xs text-destructive/90 mt-1 leading-relaxed">{loan.rejectionReason}</p>
              </div>
            </div>
          )}

          {/* Application Details Profile */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-2.5 border-b border-border bg-muted/20">
              <div className="p-1.5 rounded-lg bg-background border border-border/60">
                <User className="size-3.5 text-muted-foreground" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Application Details</h3>
            </div>
            <div className="p-5">
              {/* Structured into Domain Groups for instant readability */}
              <dl className="text-xs space-y-4">
                
                {/* Domain Group 1 */}
                <div className="space-y-1">
                  <div className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider pb-1">Member & Assignment</div>
                  <SidebarDetail label="Member Number" value={loan.memberNumber} />
                  <SidebarDetail label="Office / Branch" value={loan.officeName} />
                  <SidebarDetail label="Assigned Officer" value={loan.assignedOfficer} />
                </div>

                {/* Domain Group 2 */}
                <div className="space-y-1">
                  <div className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider pb-1">Loan Parameters</div>
                  <SidebarDetail label="Loan Type" value={loan.loanTypeName || "Not specified"} />
                  <SidebarDetail label="Application Type" value={loan.applicationType === "reloan" ? `Reloan (#${loan.reloanSequence ?? 1})` : "New Loan"} />
                  {loan.previousLoanReference && <SidebarDetail label="Previous Loan Reference" value={loan.previousLoanReference} />}
                  <SidebarDetail label="Term" value={`${loan.termMonths} months`} />
                  <SidebarDetail label="Interest Rate" value={`${loan.interestRate}% / month`} />
                  <SidebarDetail label="Payment Method" value={loan.paymentMethod} />
                  <SidebarDetail label="Purpose" value={loan.purpose} />
                </div>

                {/* Domain Group 3 */}
                <div className="space-y-1">
                  <div className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider pb-1">Timeline</div>
                  <SidebarDetail label="Application Date" value={formatDateShort(loan.applicationDate)} />
                  <SidebarDetail label="First Due Date" value={formatDateShort(loan.firstDueDate)} />
                  <SidebarDetail label="Maturity Date" value={formatDateShort(loan.maturityDate)} />
                </div>

              </dl>
            </div>
          </div>

          {/* Release Information */}
          {loan.releaseDate && (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-2.5 border-b border-border bg-muted/20">
                <div className="p-1.5 rounded-lg bg-background border border-border/60">
                  <Building2 className="size-3.5 text-muted-foreground" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Release Information</h3>
              </div>
              <div className="p-5">
                <dl className="text-xs space-y-1">
                  <SidebarDetail label="Release Date" value={formatDateShort(loan.releaseDate)} />
                  <SidebarDetail label="Reference #" value={loan.releaseReferenceNumber ?? "—"} />
                  <SidebarDetail label="Release Method" value={loan.releaseMethod ?? "—"} />
                  <SidebarDetail label="Released Amount" value={loan.actualReleasedAmount != null ? formatCurrency(loan.actualReleasedAmount) : "—"} />
                </dl>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* Local UI Sub-Components for Styling Consistency */

function SummaryStat({
  label,
  value,
  icon: Icon,
  variant = "default"
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  variant?: "default" | "success" | "warning"
}) {
  const variantStyles = {
    default: "bg-card border-border/80 text-card-foreground hover:border-border-hover",
    success: "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/30",
    warning: "bg-amber-50/40 dark:bg-amber-950/10 border-amber-500/20 text-amber-600 dark:text-amber-400 hover:border-amber-500/30",
  }

  return (
    <div className={`group relative rounded-xl border p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-[1px] duration-200 ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={`rounded-lg p-1.5 transition-colors duration-200 ${
          variant === "default" 
            ? "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary" 
            : "bg-current/10"
        }`}>
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  )
}

function SidebarDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-4 border-b border-border/40 last:border-0">
      <dt className="text-muted-foreground text-[11px] font-medium">{label}</dt>
      <dd className="font-semibold text-foreground text-right text-xs">{value}</dd>
    </div>
  )
}

function ComputationDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
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
        <p className={strong ? "text-sm font-bold text-foreground" : "text-sm font-medium text-foreground"}>{label}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{formula}</p>
      </div>
      <span className={`shrink-0 text-right ${strong ? "text-base font-bold" : "text-sm font-semibold"} ${valueTone}`}>{value}</span>
    </div>
  )
}
