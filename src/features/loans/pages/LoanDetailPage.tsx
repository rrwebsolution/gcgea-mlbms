import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Banknote, FileText, Landmark } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PrintButton } from "@/components/shared/PrintButton"
import { ApprovalTimeline } from "@/components/shared/ApprovalTimeline"
import { EmptyState } from "@/components/shared/EmptyState"
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getLoan, getLoanApprovalHistory, getLoanSchedule } from "@/services/loans.service"
import { getAllLoanPayments } from "@/services/loan-payments.service"
import { LOAN_STATUS_TONE, AMORTIZATION_STATUS_TONE } from "@/constants/status"
import { formatCurrency, formatDateShort } from "@/utils/format"

export default function LoanDetailPage() {
  const { id = "" } = useParams()
  const { data: loan, isLoading } = useQuery({ queryKey: ["loans", id], queryFn: () => getLoan(id) })
  const { data: schedule = [] } = useQuery({ queryKey: ["loans", id, "schedule"], queryFn: () => getLoanSchedule(id) })
  const { data: history = [] } = useQuery({ queryKey: ["loans", id, "history"], queryFn: () => getLoanApprovalHistory(id) })
  const payments = getAllLoanPayments().filter((p) => p.loanApplicationId === id)

  useBreadcrumbExtra(loan?.applicationNumber)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading loan application…</p>
  if (!loan) return <EmptyState icon={Landmark} title="Loan application not found" description="This loan application may have been removed." />

  return (
    <div className="space-y-5">
      <PageHeader
        title={loan.applicationNumber}
        description={`${loan.memberName} · ${loan.loanTypeName}`}
        actions={
          <>
            <StatusBadge label={loan.status} tone={LOAN_STATUS_TONE[loan.status]} className="h-7 px-3 text-sm" />
            <PrintButton permission="loans.print" label="Print Application" />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="Requested Amount" value={formatCurrency(loan.requestedAmount)} />
        <SummaryStat label="Approved Amount" value={loan.approvedAmount != null ? formatCurrency(loan.approvedAmount) : "—"} />
        <SummaryStat label="Monthly Amortization" value={formatCurrency(loan.monthlyAmortization)} />
        <SummaryStat label="Outstanding Balance" value={formatCurrency(loan.outstandingBalance)} tone="danger" />
      </div>

      <Tabs defaultValue="summary">
        <TabsList className="flex-wrap">
          <TabsTrigger value="summary">Loan Summary</TabsTrigger>
          <TabsTrigger value="computation">Computation</TabsTrigger>
          <TabsTrigger value="schedule">Amortization Schedule</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="approvals">Approval History</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Application Details</h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Detail label="Member Number" value={loan.memberNumber} />
              <Detail label="Office" value={loan.officeName} />
              <Detail label="Application Date" value={formatDateShort(loan.applicationDate)} />
              <Detail label="Assigned Officer" value={loan.assignedOfficer} />
              <Detail label="Term" value={`${loan.termMonths} months`} />
              <Detail label="Interest Rate" value={`${loan.interestRate}% / month`} />
              <Detail label="Payment Method" value={loan.paymentMethod} />
              <Detail label="Purpose" value={loan.purpose} />
              <Detail label="First Due Date" value={formatDateShort(loan.firstDueDate)} />
              <Detail label="Maturity Date" value={formatDateShort(loan.maturityDate)} />
            </dl>
          </div>
          {loan.releaseDate && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Release Information</h3>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <Detail label="Release Date" value={formatDateShort(loan.releaseDate)} />
                <Detail label="Release Reference #" value={loan.releaseReferenceNumber ?? "—"} />
                <Detail label="Release Method" value={loan.releaseMethod ?? "—"} />
                <Detail label="Actual Released Amount" value={loan.actualReleasedAmount != null ? formatCurrency(loan.actualReleasedAmount) : "—"} />
              </dl>
            </div>
          )}
          {loan.rejectionReason && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <h3 className="mb-1 text-sm font-semibold text-destructive">Rejection Reason</h3>
              <p className="text-sm text-foreground">{loan.rejectionReason}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="computation" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Detail label="Principal" value={formatCurrency(loan.principal)} />
              <Detail label="Total Interest" value={formatCurrency(loan.totalInterest)} />
              <Detail label="Processing Fee" value={formatCurrency(loan.processingFee)} />
              <Detail label="Net Proceeds" value={formatCurrency(loan.netProceeds)} />
              <Detail label="Total Amount Payable" value={formatCurrency(loan.totalAmountPayable)} />
              <Detail label="Monthly Amortization" value={formatCurrency(loan.monthlyAmortization)} />
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="max-h-[28rem] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="bg-card">#</TableHead>
                    <TableHead className="bg-card">Due Date</TableHead>
                    <TableHead className="bg-card">Beginning Balance</TableHead>
                    <TableHead className="bg-card">Principal</TableHead>
                    <TableHead className="bg-card">Interest</TableHead>
                    <TableHead className="bg-card">Penalty</TableHead>
                    <TableHead className="bg-card">Amount Due</TableHead>
                    <TableHead className="bg-card">Amount Paid</TableHead>
                    <TableHead className="bg-card">Remaining Balance</TableHead>
                    <TableHead className="bg-card">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((entry) => (
                    <TableRow key={entry.installmentNumber}>
                      <TableCell>{entry.installmentNumber}</TableCell>
                      <TableCell>{formatDateShort(entry.dueDate)}</TableCell>
                      <TableCell>{formatCurrency(entry.beginningBalance)}</TableCell>
                      <TableCell>{formatCurrency(entry.principal)}</TableCell>
                      <TableCell>{formatCurrency(entry.interest)}</TableCell>
                      <TableCell>{formatCurrency(entry.penalty)}</TableCell>
                      <TableCell>{formatCurrency(entry.amountDue)}</TableCell>
                      <TableCell>{formatCurrency(entry.amountPaid)}</TableCell>
                      <TableCell>{formatCurrency(entry.remainingBalance)}</TableCell>
                      <TableCell><StatusBadge label={entry.status} tone={AMORTIZATION_STATUS_TONE[entry.status]} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          {payments.length === 0 ? (
            <EmptyState icon={Banknote} title="No payments recorded" description="No payments have been posted for this loan yet." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference #</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>O.R. Number</TableHead>
                    <TableHead>Received By</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-foreground">{p.paymentReferenceNumber}</TableCell>
                      <TableCell>{formatDateShort(p.paymentDate)}</TableCell>
                      <TableCell>{formatCurrency(p.amountPaid)}</TableCell>
                      <TableCell>{p.officialReceiptNumber}</TableCell>
                      <TableCell>{p.receivedBy}</TableCell>
                      <TableCell><StatusBadge label={p.status} tone={p.status === "Posted" ? "success" : "danger"} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="requirements" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <ul className="space-y-2">
              {loan.requirements.map((req) => (
                <li key={req.label} className="flex items-center gap-2 text-sm">
                  <span className={`flex size-5 items-center justify-center rounded-full text-xs ${req.completed ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    {req.completed ? "✓" : "—"}
                  </span>
                  {req.label}
                </li>
              ))}
            </ul>
            <h4 className="mt-4 mb-2 text-sm font-semibold text-foreground">Eligibility Checklist</h4>
            <ul className="space-y-2">
              {loan.eligibility.map((item) => (
                <li key={item.label} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs ${item.passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                    {item.passed ? "✓" : "✕"}
                  </span>
                  <span>
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="block text-xs text-muted-foreground">{item.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <ApprovalTimeline history={history} />
          </div>
        </TabsContent>
      </Tabs>

      <Link to="/loans" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <FileText className="size-3.5" />
        Back to Loan Applications
      </Link>
    </div>
  )
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-heading text-lg font-semibold ${tone === "danger" ? "text-destructive" : "text-foreground"}`}>{value}</p>
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
