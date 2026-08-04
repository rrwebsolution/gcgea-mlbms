import type { DeductionType } from "@/types"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/query-client"
import { getLookups } from "@/services/lookups.service"

let cachedDeductionTypes: DeductionType[] = []
const deductionTypesChannel = typeof BroadcastChannel !== "undefined"
  ? new BroadcastChannel("gcgea:deduction-type-values")
  : null

function publishDeductionTypesChanged(broadcast = true): void {
  window.dispatchEvent(new CustomEvent("gcgea:deduction-types-changed", {
    detail: cachedDeductionTypes,
  }))
  if (broadcast) deductionTypesChannel?.postMessage(cachedDeductionTypes)
}

if (deductionTypesChannel) {
  deductionTypesChannel.onmessage = (event: MessageEvent<DeductionType[]>) => {
    cachedDeductionTypes = event.data
    publishDeductionTypesChanged(false)
  }
}

export async function listDeductionTypes(): Promise<DeductionType[]> {
  const data = (await queryClient.fetchQuery({ queryKey: ["lookups"], queryFn: getLookups, staleTime: Infinity })).deductionTypes
  cachedDeductionTypes = data
  return data
}

export function getDeductionTypesSync(): DeductionType[] {
  return cachedDeductionTypes
}

export async function createDeductionType(input: Omit<DeductionType, "id">): Promise<DeductionType> {
  const { data } = await api.post<DeductionType>("/deduction-types", input)
  cachedDeductionTypes = [...cachedDeductionTypes, data]
  publishDeductionTypesChanged()
  return data
}

export async function updateDeductionType(id: string, input: Partial<Omit<DeductionType, "id">>): Promise<DeductionType> {
  const { data } = await api.put<DeductionType>(`/deduction-types/${id}`, input)
  cachedDeductionTypes = cachedDeductionTypes.map((type) => type.id === id ? data : type)
  publishDeductionTypesChanged()
  return data
}

export async function toggleDeductionTypeStatus(id: string): Promise<DeductionType> {
  const { data } = await api.patch<DeductionType>(`/deduction-types/${id}/toggle-status`)
  cachedDeductionTypes = cachedDeductionTypes.map((type) => type.id === id ? data : type)
  publishDeductionTypesChanged()
  return data
}
