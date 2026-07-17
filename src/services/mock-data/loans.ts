import type { AmortizationEntry, ApprovalHistoryEntry, EligibilityCheckItem, LoanApplication, LoanRequirementItem, LoanStatus } from "@/types"
import { MOCK_MEMBERS } from "./members"
import { MOCK_LOAN_TYPES } from "./loan-types"
import { computeLoan } from "@/utils/loan-math"

const OFFICERS = ["Erwin S. Cabahug", "Precious Joy M. Utlang"]

const STANDARD_REQUIREMENTS: LoanRequirementItem[] = [
  { label: "Loan Application Form", completed: true },
  { label: "Latest Payslip", completed: true },
  { label: "Valid ID", completed: true },
  { label: "Authorization for Salary Deduction", completed: true },
  { label: "Promissory Note", completed: false },
]

const STANDARD_ELIGIBILITY: EligibilityCheckItem[] = [
  { label: "Active Member", passed: true, detail: "Member status is Active" },
  { label: "Minimum Membership Duration Met", passed: true, detail: "Meets required membership duration" },
  { label: "Required Contributions Complete", passed: true, detail: "No outstanding contribution gaps" },
  { label: "No Disqualifying Active Loan", passed: true, detail: "No conflicting active loan" },
  { label: "Required Documents Complete", passed: true, detail: "All requirements submitted" },
  { label: "No Overdue Loan", passed: true, detail: "No overdue accounts on record" },
  { label: "Within Maximum Loan Amount", passed: true, detail: "Requested amount within loan type limit" },
]

interface LoanSeed {
  memberIndex: number
  loanTypeId: string
  applicationDate: string
  requestedAmount: number
  approvedAmount?: number
  termMonths: number
  status: LoanStatus
  purpose: string
  paidInstallments?: number
}

const SEEDS: LoanSeed[] = [
  { memberIndex: 0, loanTypeId: "lt-01", applicationDate: "2025-01-10", requestedAmount: 60000, approvedAmount: 60000, termMonths: 24, status: "Active", purpose: "Home repair", paidInstallments: 18 },
  { memberIndex: 1, loanTypeId: "lt-01", applicationDate: "2024-06-05", requestedAmount: 40000, approvedAmount: 40000, termMonths: 12, status: "Fully Paid", purpose: "Family medical expense", paidInstallments: 12 },
  { memberIndex: 3, loanTypeId: "lt-02", applicationDate: "2026-07-01", requestedAmount: 15000, termMonths: 6, status: "Submitted", purpose: "Emergency household repair" },
  { memberIndex: 4, loanTypeId: "lt-03", applicationDate: "2025-09-14", requestedAmount: 100000, approvedAmount: 100000, termMonths: 36, status: "Active", purpose: "Business capital", paidInstallments: 9 },
  { memberIndex: 5, loanTypeId: "lt-01", applicationDate: "2026-06-20", requestedAmount: 30000, termMonths: 18, status: "For Approval", purpose: "Vehicle repair" },
  { memberIndex: 6, loanTypeId: "lt-04", applicationDate: "2026-05-02", requestedAmount: 20000, approvedAmount: 20000, termMonths: 10, status: "Released", purpose: "Tuition fee for dependent", paidInstallments: 0 },
  { memberIndex: 8, loanTypeId: "lt-03", applicationDate: "2023-11-10", requestedAmount: 80000, approvedAmount: 80000, termMonths: 24, status: "Overdue", purpose: "Solidarity assistance", paidInstallments: 20 },
  { memberIndex: 10, loanTypeId: "lt-01", applicationDate: "2026-04-18", requestedAmount: 50000, approvedAmount: 45000, termMonths: 24, status: "Active", purpose: "Home improvement", paidInstallments: 3 },
  { memberIndex: 11, loanTypeId: "lt-02", applicationDate: "2026-06-25", requestedAmount: 10000, termMonths: 6, status: "Under Review", purpose: "Emergency medical expense" },
  { memberIndex: 14, loanTypeId: "lt-01", applicationDate: "2026-02-11", requestedAmount: 70000, approvedAmount: 70000, termMonths: 24, status: "Active", purpose: "Debt consolidation", paidInstallments: 5 },
  { memberIndex: 15, loanTypeId: "lt-04", applicationDate: "2026-07-05", requestedAmount: 25000, termMonths: 12, status: "Draft", purpose: "Tuition fee" },
  { memberIndex: 18, loanTypeId: "lt-01", applicationDate: "2025-12-01", requestedAmount: 35000, approvedAmount: 0, termMonths: 12, status: "Rejected", purpose: "Personal use" },
  { memberIndex: 19, loanTypeId: "lt-03", applicationDate: "2026-01-15", requestedAmount: 90000, approvedAmount: 90000, termMonths: 30, status: "Active", purpose: "House construction", paidInstallments: 6 },
  { memberIndex: 20, loanTypeId: "lt-01", applicationDate: "2025-03-20", requestedAmount: 45000, approvedAmount: 45000, termMonths: 18, status: "Fully Paid", purpose: "Medical expense", paidInstallments: 18 },
  { memberIndex: 21, loanTypeId: "lt-02", applicationDate: "2026-03-08", requestedAmount: 12000, approvedAmount: 12000, termMonths: 8, status: "Cancelled", purpose: "Household appliance" },
]

function applyPayments(schedule: AmortizationEntry[], paidCount: number): AmortizationEntry[] {
  const today = new Date()
  return schedule.map((entry, idx) => {
    if (idx < paidCount) {
      return { ...entry, amountPaid: entry.amountDue, status: "Paid" }
    }
    const due = new Date(entry.dueDate)
    if (due < today) {
      return { ...entry, status: "Overdue" }
    }
    return entry
  })
}

export const MOCK_LOANS: LoanApplication[] = SEEDS.map((seed, idx) => {
  const member = MOCK_MEMBERS[seed.memberIndex]
  const loanType = MOCK_LOAN_TYPES.find((lt) => lt.id === seed.loanTypeId)!
  const principal = seed.approvedAmount ?? seed.requestedAmount
  const firstDueDate = new Date(seed.applicationDate)
  firstDueDate.setMonth(firstDueDate.getMonth() + 1)

  const computation = computeLoan({
    principal,
    annualRatePercent: loanType.defaultInterestRate,
    termMonths: seed.termMonths,
    processingFee: loanType.processingFee,
    interestMethod: loanType.interestMethod,
    firstDueDate,
  })

  const schedule = applyPayments(computation.schedule, seed.paidInstallments ?? 0)
  const isClosed = seed.status === "Fully Paid" || seed.status === "Rejected" || seed.status === "Cancelled" || seed.status === "Draft"
  const paidCount = seed.paidInstallments ?? 0
  const remainingBalance = isClosed
    ? 0
    : schedule.length > 0
      ? schedule[paidCount > 0 ? Math.min(paidCount - 1, schedule.length - 1) : 0].remainingBalance
      : 0

  const applicationNumber = `GCGEA-LN-${new Date(seed.applicationDate).getFullYear()}-${String(idx + 1).padStart(6, "0")}`

  const approvalHistory: ApprovalHistoryEntry[] = []
  if (seed.status !== "Draft") {
    approvalHistory.push({ id: `${applicationNumber}-ah-1`, action: "Submitted", performedBy: member.fullName.split(",")[0], performedAt: seed.applicationDate, remarks: "Application submitted for review." })
  }
  if (["Under Review", "For Approval", "Approved", "Rejected", "Released", "Active", "Fully Paid", "Overdue", "Restructured"].includes(seed.status)) {
    approvalHistory.push({ id: `${applicationNumber}-ah-2`, action: "Recommended for Approval", performedBy: OFFICERS[idx % OFFICERS.length], performedAt: seed.applicationDate, remarks: "Eligibility verified. Forwarded for approval." })
  }
  if (["Approved", "Released", "Active", "Fully Paid", "Overdue", "Restructured"].includes(seed.status)) {
    approvalHistory.push({ id: `${applicationNumber}-ah-3`, action: "Approved", performedBy: "Reynaldo C. Mag-abo", performedAt: seed.applicationDate, remarks: "Approved as recommended." })
  }
  if (seed.status === "Rejected") {
    approvalHistory.push({ id: `${applicationNumber}-ah-3`, action: "Rejected", performedBy: "Reynaldo C. Mag-abo", performedAt: seed.applicationDate, remarks: "Insufficient contribution months on record." })
  }
  if (["Released", "Active", "Fully Paid", "Overdue", "Restructured"].includes(seed.status)) {
    approvalHistory.push({ id: `${applicationNumber}-ah-4`, action: "Released", performedBy: "Erwin S. Cabahug", performedAt: seed.applicationDate, remarks: "Funds released via payroll credit." })
  }

  return {
    id: `loan-${String(idx + 1).padStart(2, "0")}`,
    applicationNumber,
    applicationDate: seed.applicationDate,
    memberId: member.id,
    memberNumber: member.memberNumber,
    memberName: member.fullName,
    officeName: member.officeName,
    loanTypeId: loanType.id,
    loanTypeName: loanType.name,
    requestedAmount: seed.requestedAmount,
    approvedAmount: seed.approvedAmount,
    termMonths: seed.termMonths,
    interestRate: loanType.defaultInterestRate,
    processingFee: loanType.processingFee,
    purpose: seed.purpose,
    paymentMethod: "Payroll Deduction",
    firstDueDate: schedule[0]?.dueDate ?? seed.applicationDate,
    maturityDate: computation.maturityDate,

    principal: computation.principal,
    totalInterest: computation.totalInterest,
    netProceeds: computation.netProceeds,
    totalAmountPayable: computation.totalAmountPayable,
    monthlyAmortization: computation.monthlyAmortization,

    outstandingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100),
    status: seed.status,
    assignedOfficer: OFFICERS[idx % OFFICERS.length],

    eligibility: STANDARD_ELIGIBILITY,
    eligibilityOverridden: false,

    requirements: STANDARD_REQUIREMENTS.map((r) => ({ ...r, completed: seed.status === "Draft" ? r.label !== "Promissory Note" : true })),

    releaseDate: ["Released", "Active", "Fully Paid", "Overdue", "Restructured"].includes(seed.status) ? seed.applicationDate : undefined,
    releaseReferenceNumber: ["Released", "Active", "Fully Paid", "Overdue", "Restructured"].includes(seed.status) ? `REL-${applicationNumber.slice(-6)}` : undefined,
    releaseMethod: ["Released", "Active", "Fully Paid", "Overdue", "Restructured"].includes(seed.status) ? "Payroll Deduction" : undefined,
    actualReleasedAmount: ["Released", "Active", "Fully Paid", "Overdue", "Restructured"].includes(seed.status) ? computation.netProceeds : undefined,

    rejectionReason: seed.status === "Rejected" ? "Member did not meet the required contribution months for this loan type." : undefined,
    cancellationReason: seed.status === "Cancelled" ? "Member requested cancellation prior to release." : undefined,

    createdAt: seed.applicationDate,
    updatedAt: "2026-07-10",
    createdBy: OFFICERS[idx % OFFICERS.length],

    _schedule: schedule,
    _approvalHistory: approvalHistory,
  } as LoanApplication & { _schedule: AmortizationEntry[]; _approvalHistory: ApprovalHistoryEntry[] }
})

export const MOCK_LOAN_SCHEDULES: Record<string, AmortizationEntry[]> = Object.fromEntries(
  (MOCK_LOANS as (LoanApplication & { _schedule: AmortizationEntry[] })[]).map((l) => [l.id, l._schedule])
)

export const MOCK_LOAN_APPROVAL_HISTORY: Record<string, ApprovalHistoryEntry[]> = Object.fromEntries(
  (MOCK_LOANS as (LoanApplication & { _approvalHistory: ApprovalHistoryEntry[] })[]).map((l) => [l.id, l._approvalHistory])
)
