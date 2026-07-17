import type { LoanPayment, PaginatedResponse, PaginationParams } from "@/types"
import { simulateDelay } from "./http"
import { MOCK_LOAN_PAYMENTS } from "./mock-data/loan-payments"
import { paginate, sortBy } from "@/utils/paginate"

const payments: LoanPayment[] = [...MOCK_LOAN_PAYMENTS]

export async function listLoanPayments(params: PaginationParams = {}): Promise<PaginatedResponse<LoanPayment>> {
  let items = payments
  if (params.search) {
    const term = params.search.toLowerCase()
    items = items.filter(
      (p) =>
        p.memberName.toLowerCase().includes(term) ||
        p.paymentReferenceNumber.toLowerCase().includes(term) ||
        p.loanApplicationNumber.toLowerCase().includes(term)
    )
  }
  items = sortBy(items, params.sortBy, params.sortDir)
  return simulateDelay(paginate(items, params.page, params.perPage))
}

export function getAllLoanPayments(): LoanPayment[] {
  return payments
}
