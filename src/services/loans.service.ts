import type {
  AmortizationEntry,
  ApprovalHistoryEntry,
  EligibilityCheckItem,
  LoanApplication,
  LoanRequirementItem,
  LoanType,
  PaginatedResponse,
  PaginationParams,
  PaymentMethod,
} from "@/types"
import { simulateDelay } from "./http"
import { MOCK_LOANS, MOCK_LOAN_SCHEDULES, MOCK_LOAN_APPROVAL_HISTORY } from "./mock-data/loans"
import { MOCK_LOAN_TYPES } from "./mock-data/loan-types"
import { paginate, sortBy } from "@/utils/paginate"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { computeLoan } from "@/utils/loan-math"

interface LoanStore {
  loans: LoanApplication[]
  schedules: Record<string, AmortizationEntry[]>
  approvalHistory: Record<string, ApprovalHistoryEntry[]>
}

const store: LoanStore = readStorage<LoanStore>(STORAGE_KEYS.mockLoans, {
  loans: MOCK_LOANS,
  schedules: MOCK_LOAN_SCHEDULES,
  approvalHistory: MOCK_LOAN_APPROVAL_HISTORY,
})

function persist() {
  writeStorage(STORAGE_KEYS.mockLoans, store)
}

export interface LoanListParams extends PaginationParams {
  status?: string
  loanTypeId?: string
  office?: string
  overdueOnly?: boolean
}

export async function listLoans(params: LoanListParams = {}): Promise<PaginatedResponse<LoanApplication>> {
  let items = store.loans
  if (params.search) {
    const term = params.search.toLowerCase()
    items = items.filter(
      (l) =>
        l.memberName.toLowerCase().includes(term) ||
        l.memberNumber.toLowerCase().includes(term) ||
        l.applicationNumber.toLowerCase().includes(term)
    )
  }
  if (params.status) items = items.filter((l) => l.status === params.status)
  if (params.loanTypeId) items = items.filter((l) => l.loanTypeId === params.loanTypeId)
  if (params.office) items = items.filter((l) => l.officeName === params.office)
  if (params.overdueOnly) items = items.filter((l) => l.status === "Overdue")

  items = sortBy(items, params.sortBy, params.sortDir)
  return simulateDelay(paginate(items, params.page, params.perPage))
}

export async function getLoan(id: string): Promise<LoanApplication | undefined> {
  return simulateDelay(store.loans.find((l) => l.id === id))
}

export async function getLoanSchedule(id: string): Promise<AmortizationEntry[]> {
  return simulateDelay(store.schedules[id] ?? [])
}

export async function getLoanApprovalHistory(id: string): Promise<ApprovalHistoryEntry[]> {
  return simulateDelay(store.approvalHistory[id] ?? [])
}

export async function listLoanTypes(): Promise<LoanType[]> {
  return simulateDelay(MOCK_LOAN_TYPES, 150)
}

export function getAllLoans(): LoanApplication[] {
  return store.loans
}

export function getLoanTypesSync(): LoanType[] {
  return MOCK_LOAN_TYPES
}

function nextApplicationNumber(): string {
  const year = new Date().getFullYear()
  const countThisYear = store.loans.filter((l) => l.applicationNumber.includes(`-${year}-`)).length
  return `GCGEA-LN-${year}-${String(countThisYear + 1).padStart(6, "0")}`
}

export interface CreateLoanApplicationInput {
  memberId: string
  memberNumber: string
  memberName: string
  officeName: string
  loanTypeId: string
  loanTypeName: string
  requestedAmount: number
  termMonths: number
  interestRate: number
  processingFee: number
  interestMethod: LoanType["interestMethod"]
  purpose: string
  paymentMethod: PaymentMethod
  applicationDate: string
  assignedOfficer: string
  eligibility: EligibilityCheckItem[]
  eligibilityOverridden: boolean
  eligibilityOverrideReason?: string
  requirements: LoanRequirementItem[]
  asDraft: boolean
  createdBy: string
}

export async function createLoanApplication(input: CreateLoanApplicationInput): Promise<LoanApplication> {
  const id = `loan-${Date.now()}`
  const applicationNumber = nextApplicationNumber()
  const firstDueDate = new Date(input.applicationDate)
  firstDueDate.setMonth(firstDueDate.getMonth() + 1)

  const computation = computeLoan({
    principal: input.requestedAmount,
    annualRatePercent: input.interestRate,
    termMonths: input.termMonths,
    processingFee: input.processingFee,
    interestMethod: input.interestMethod,
    firstDueDate,
  })

  const now = new Date().toISOString()
  const status = input.asDraft ? "Draft" : "Submitted"

  const loan: LoanApplication = {
    id,
    applicationNumber,
    applicationDate: input.applicationDate,
    memberId: input.memberId,
    memberNumber: input.memberNumber,
    memberName: input.memberName,
    officeName: input.officeName,
    loanTypeId: input.loanTypeId,
    loanTypeName: input.loanTypeName,
    requestedAmount: input.requestedAmount,
    termMonths: input.termMonths,
    interestRate: input.interestRate,
    processingFee: input.processingFee,
    purpose: input.purpose,
    paymentMethod: input.paymentMethod,
    firstDueDate: computation.schedule[0]?.dueDate ?? input.applicationDate,
    maturityDate: computation.maturityDate,

    principal: computation.principal,
    totalInterest: computation.totalInterest,
    netProceeds: computation.netProceeds,
    totalAmountPayable: computation.totalAmountPayable,
    monthlyAmortization: computation.monthlyAmortization,

    outstandingBalance: status === "Draft" ? 0 : computation.totalAmountPayable,
    status,
    assignedOfficer: input.assignedOfficer,

    eligibility: input.eligibility,
    eligibilityOverridden: input.eligibilityOverridden,
    eligibilityOverrideReason: input.eligibilityOverrideReason,

    requirements: input.requirements,

    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
  }

  store.loans = [loan, ...store.loans]
  store.schedules[id] = computation.schedule
  store.approvalHistory[id] = [
    {
      id: `${id}-ah-1`,
      action: status === "Draft" ? "Draft Created" : "Submitted",
      performedBy: input.createdBy,
      performedAt: now,
      remarks: status === "Draft" ? "Application saved as draft." : "Application encoded and submitted for review.",
    },
  ]
  persist()

  return simulateDelay(loan, 500)
}

export function getMemberActiveLoans(memberId: string): LoanApplication[] {
  return store.loans.filter((l) => l.memberId === memberId && ["Active", "Overdue", "Released"].includes(l.status))
}

export function getMemberLoans(memberId: string): LoanApplication[] {
  return store.loans.filter((l) => l.memberId === memberId)
}
