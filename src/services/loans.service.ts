import type {
  AmortizationEntry,
  ApprovalHistoryEntry,
  LoanApplication,
  LoanType,
  PaginatedResponse,
  PaginationParams,
  PaymentMethod,
} from "@/types"
import { api } from "@/lib/api"

export interface LoanListParams extends PaginationParams {
  status?: string
  loanTypeId?: string
  office?: string
  overdueOnly?: boolean
}

export async function listLoans(params: LoanListParams = {}): Promise<PaginatedResponse<LoanApplication>> {
  const { data } = await api.get<PaginatedResponse<LoanApplication>>("/loans", { params })
  return data
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
  const { data } = await api.get<ApprovalHistoryEntry[]>(`/loans/${id}/approval-history`)
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

export async function createLoanType(input: Omit<LoanType, "id">): Promise<LoanType> {
  const { data } = await api.post<LoanType>("/loan-types", input)
  return data
}

export async function updateLoanType(id: string, input: Partial<Omit<LoanType, "id">>): Promise<LoanType> {
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

export function getMemberActiveLoans(memberId: string): LoanApplication[] {
  return cachedLoans.filter((l) => l.memberId === memberId && ["Active", "Overdue", "Released"].includes(l.status))
}

export function getMemberLoans(memberId: string): LoanApplication[] {
  return cachedLoans.filter((l) => l.memberId === memberId)
}
