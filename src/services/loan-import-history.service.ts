import { api, getPaginated } from "@/lib/api"
import type { LoanImportBatchDetail, LoanImportBatchSummary, PaginatedResponse, PaginationParams } from "@/types"

export interface ListLoanImportBatchesParams extends PaginationParams {
  period?: string
  dateFrom?: string
  dateTo?: string
}

export async function listLoanImportBatches(params: ListLoanImportBatchesParams = {}): Promise<PaginatedResponse<LoanImportBatchSummary>> {
  return getPaginated<LoanImportBatchSummary>("/loan-imports/history", params)
}

export async function listAllLoanImportBatches(): Promise<LoanImportBatchSummary[]> {
  const { data } = await api.get<LoanImportBatchSummary[]>("/loan-imports/history/all")
  return data
}

export async function getLoanImportBatch(token: string): Promise<LoanImportBatchDetail> {
  const { data } = await api.get<LoanImportBatchDetail>(`/loan-imports/history/${token}`)
  return data
}

export async function undoLoanImportBatch(token: string): Promise<void> {
  await api.post(`/loan-imports/history/${token}/undo`)
}
