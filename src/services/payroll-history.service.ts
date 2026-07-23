import { getPaginated } from "@/lib/api"
import type { PaginatedResponse } from "@/types"
import type { PayrollDeductionHistoryEntry, PayrollHistoryFilters } from "@/types/payroll-history"

export async function listPayrollDeductionHistory(params: PayrollHistoryFilters = {}): Promise<PaginatedResponse<PayrollDeductionHistoryEntry>> {
  return getPaginated<PayrollDeductionHistoryEntry>("/payroll-deductions/history", params)
}
