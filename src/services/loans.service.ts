import type {
  AmortizationEntry,
  ApprovalHistoryEntry,
  EligibilityCheckItem,
  LoanApplication,
  LoanApplicationType,
  LoanType,
  LoanTypeIncomeBracketInput,
  PaginatedResponse,
  PaginationParams,
  PaymentMethod,
} from "@/types"
import { api, getPaginated } from "@/lib/api"

type LoanTypeInput = Omit<LoanType, "id" | "incomeBrackets"> & { incomeBrackets: LoanTypeIncomeBracketInput[] }

export interface LoanListParams extends PaginationParams {
  status?: string
  loanTypeId?: string
  office?: string
  overdueOnly?: boolean
  activeOnly?: boolean
  applicationType?: LoanApplicationType
}

export async function listLoans(params: LoanListParams = {}): Promise<PaginatedResponse<LoanApplication>> {
  return getPaginated<LoanApplication>("/loans", params)
}

export async function getLoan(id: string): Promise<LoanApplication | undefined> {
  const { data } = await api.get<LoanApplication>(`/loans/${id}`)
  return data
}

export async function getLoanSchedule(id: string): Promise<AmortizationEntry[]> {
  const { data } = await api.get<AmortizationEntry[]>(`/loans/${id}/schedule`)
  return data
}

export async function getLoanApprovalHistory(id: string): Promise<ApprovalHistoryEntry[]> {
  const { data } = await api.get<ApprovalHistoryEntry[]>(`/approvals/loans/${id}/history`)
  return data
}

export async function reviewLoan(id: string, remarks?: string): Promise<LoanApplication> {
  const { data } = await api.post<LoanApplication>(`/loans/${id}/review`, { remarks })
  return data
}

export async function approveLoan(id: string, remarks?: string): Promise<LoanApplication> {
  const { data } = await api.post<LoanApplication>(`/loans/${id}/approve`, { remarks })
  return data
}

export async function rejectLoan(id: string, remarks: string): Promise<LoanApplication> {
  const { data } = await api.post<LoanApplication>(`/loans/${id}/reject`, { remarks })
  return data
}

export async function returnLoanForRevision(id: string, remarks: string): Promise<LoanApplication> {
  const { data } = await api.post<LoanApplication>(`/loans/${id}/return`, { remarks })
  return data
}

export interface ReleaseLoanInput {
  releaseReferenceNumber: string
  releaseMethod: PaymentMethod
  actualReleasedAmount: number
  releaseRemarks?: string
  remarks?: string
}

export async function releaseLoan(id: string, input: ReleaseLoanInput): Promise<LoanApplication> {
  const { data } = await api.post<LoanApplication>(`/loans/${id}/release`, input)
  return data
}

// Best-effort synchronous cache of the last successful listLoanTypes() fetch —
// populated on every resolve so getLoanTypesSync() has data available for code
// that still calls it synchronously. Empty until the first real fetch completes.
let cachedLoanTypes: LoanType[] = []

export async function listLoanTypes(): Promise<LoanType[]> {
  const { data } = await api.get<LoanType[]>("/loan-types")
  cachedLoanTypes = data
  return data
}

// Best-effort synchronous cache of all loans — several pages (eligibility
// pre-checks, member loan history) read this synchronously. Populated by
// listAllLoans(); empty until the first call resolves.
let cachedLoans: LoanApplication[] = []

export async function listAllLoans(): Promise<LoanApplication[]> {
  const { data } = await api.get<LoanApplication[]>("/loans/all")
  cachedLoans = data
  return data
}

export function getAllLoans(): LoanApplication[] {
  return cachedLoans
}

export function getLoanTypesSync(): LoanType[] {
  return cachedLoanTypes
}

export async function createLoanType(input: LoanTypeInput): Promise<LoanType> {
  const { data } = await api.post<LoanType>("/loan-types", input)
  return data
}

export async function updateLoanType(id: string, input: Partial<LoanTypeInput>): Promise<LoanType> {
  const { data } = await api.put<LoanType>(`/loan-types/${id}`, input)
  return data
}

export async function deleteLoanType(id: string): Promise<void> {
  await api.delete(`/loan-types/${id}`)
}

export interface CreateLoanApplicationInput {
  memberId: string
  loanTypeId?: string
  requestedAmount?: number
  termMonths?: number
  purpose?: string
  paymentMethod?: PaymentMethod
  requirements: { label: string; completed: boolean }[]
  asDraft: boolean
  draftCurrentStep?: number
  /** Reloan-only — current monthly net take-home pay, re-entered rather than copied from the previous loan. */
  currentNetTakeHomePay?: number
  eligibilityOverridden?: boolean
  eligibilityOverrideReason?: string
  boardResolutionReference?: string
  boardResolutionDocumentPath?: string
}

export async function createLoanApplication(input: CreateLoanApplicationInput): Promise<LoanApplication> {
  const { data } = await api.post<LoanApplication>("/loans", input)
  cachedLoans = [data, ...cachedLoans]
  return data
}

/** Edits a draft loan in place — only allowed while the loan is still status "Draft". */
export async function updateLoanApplication(id: string, input: CreateLoanApplicationInput): Promise<LoanApplication> {
  const { data } = await api.put<LoanApplication>(`/loans/${id}`, input)
  cachedLoans = cachedLoans.map((l) => (l.id === data.id ? data : l))
  return data
}

/** Permanently deletes a draft loan application — only allowed while status is "Draft"; the backend rejects anything else. */
export async function deleteLoanApplication(id: string): Promise<void> {
  await api.delete(`/loans/${id}`)
  cachedLoans = cachedLoans.filter((l) => l.id !== id)
}

export function getMemberActiveLoans(memberId: string): LoanApplication[] {
  return cachedLoans.filter((l) => l.memberId === memberId && ["Active", "Overdue", "Released"].includes(l.status))
}

export function getMemberLoans(memberId: string): LoanApplication[] {
  return cachedLoans.filter((l) => l.memberId === memberId)
}

export interface PreviousObligation {
  amount: number
  settlementMethod: string | null
}

export interface ReloanEligibilityResult {
  eligible: boolean
  verdict: "Eligible" | "Eligible with Warning" | "Not Eligible"
  checks: EligibilityCheckItem[]
  previousObligation: PreviousObligation
}

/** Pre-check used to enable/disable the Reloan button before a draft exists. */
export async function getReloanEligibility(loanId: string): Promise<ReloanEligibilityResult> {
  const { data } = await api.get<ReloanEligibilityResult>(`/loans/${loanId}/reloan-eligibility`)
  return data
}

/** Creates the linked reloan draft — editing/submitting it afterward reuses updateLoanApplication() above, since a reloan is a LoanApplication row. */
export async function createReloanDraft(loanId: string): Promise<LoanApplication> {
  const { data } = await api.post<LoanApplication>(`/loans/${loanId}/reloan`)
  cachedLoans = [data, ...cachedLoans]
  return data
}
