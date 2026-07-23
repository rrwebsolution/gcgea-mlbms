import type { Office, PaginatedResponse, PaginationParams } from "@/types"
import { api, getPaginated } from "@/lib/api"

export async function listOffices(params: PaginationParams = {}): Promise<PaginatedResponse<Office>> {
  return getPaginated<Office>("/offices", params)
}

export async function listAllOffices(): Promise<Office[]> {
  const { data } = await api.get<Office[]>("/offices/all")
  return data
}

export async function createOffice(input: Partial<Office>): Promise<Office> {
  const { data } = await api.post<Office>("/offices", input)
  return data
}

export async function updateOffice(id: string, input: Partial<Office>): Promise<Office> {
  const { data } = await api.put<Office>(`/offices/${id}`, input)
  return data
}

export async function toggleOfficeStatus(id: string): Promise<Office> {
  const { data } = await api.patch<Office>(`/offices/${id}/toggle-status`)
  return data
}
