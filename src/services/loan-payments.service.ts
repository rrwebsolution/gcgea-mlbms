import type { LoanPayment, PaginatedResponse, PaginationParams, PaymentMethod } from "@/types"
import { api, getPaginated } from "@/lib/api"

export async function listLoanPayments(params: PaginationParams = {}): Promise<PaginatedResponse<LoanPayment>> {
  return getPaginated<LoanPayment>("/loan-payments", params)
}

export interface CreateLoanPaymentInput {
  memberId: string
  loanApplicationId: string
  paymentDate: string
  amountPaid: number
  penalty: number
  paymentMethod: PaymentMethod
  officialReceiptNumber: string
  payrollReference?: string
  remarks?: string
}

export async function createLoanPayment(input: CreateLoanPaymentInput): Promise<LoanPayment> {
  const { data } = await api.post<LoanPayment>("/loan-payments", input)
  cachedLoanPayments = [data, ...cachedLoanPayments]
  return data
}

// Best-effort synchronous cache — same pattern as other modules. Populated by
// listAllLoanPayments(); empty until the first call resolves.
let cachedLoanPayments: LoanPayment[] = []

export async function listAllLoanPayments(): Promise<LoanPayment[]> {
  const { data } = await api.get<LoanPayment[]>("/loan-payments/all")
  cachedLoanPayments = data
  return data
}

export function getAllLoanPayments(): LoanPayment[] {
  return cachedLoanPayments
}
