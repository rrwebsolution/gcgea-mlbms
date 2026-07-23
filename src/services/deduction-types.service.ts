import type { DeductionType } from "@/types"
import { api } from "@/lib/api"

let cachedDeductionTypes: DeductionType[] = []

export async function listDeductionTypes(): Promise<DeductionType[]> {
  const { data } = await api.get<DeductionType[]>("/deduction-types")
  cachedDeductionTypes = data
  return data
}

export function getDeductionTypesSync(): DeductionType[] {
  return cachedDeductionTypes
}

export async function createDeductionType(input: Omit<DeductionType, "id">): Promise<DeductionType> {
  const { data } = await api.post<DeductionType>("/deduction-types", input)
  return data
}

export async function updateDeductionType(id: string, input: Partial<Omit<DeductionType, "id">>): Promise<DeductionType> {
  const { data } = await api.put<DeductionType>(`/deduction-types/${id}`, input)
  return data
}

export async function toggleDeductionTypeStatus(id: string): Promise<DeductionType> {
  const { data } = await api.patch<DeductionType>(`/deduction-types/${id}/toggle-status`)
  return data
}
