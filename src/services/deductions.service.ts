import type { Deduction, PaginatedResponse, PaginationParams } from "@/types"
import { api, getPaginated } from "@/lib/api"

export interface ListDeductionsParams extends PaginationParams {
  period?: string
  status?: string
  deductionTypeCode?: string
}

export async function listDeductions(params: ListDeductionsParams = {}): Promise<PaginatedResponse<Deduction>> {
  return getPaginated<Deduction>("/deductions", params)
}

// Best-effort synchronous cache — mirrors contributions.service.ts's pattern.
// Populated by listAllDeductions(); empty until the first call resolves.
let cachedDeductions: Deduction[] = []

export async function listAllDeductions(): Promise<Deduction[]> {
  const { data } = await api.get<Deduction[]>("/deductions/all")
  cachedDeductions = data
  return data
}

export function getAllDeductions(): Deduction[] {
  return cachedDeductions
}

export async function voidDeduction(id: string, reason: string): Promise<Deduction> {
  const { data } = await api.post<Deduction>(`/deductions/${id}/void`, { reason })
  return data
}
