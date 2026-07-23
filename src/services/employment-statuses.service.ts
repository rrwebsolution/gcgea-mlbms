import { api } from "@/lib/api"
import type { EmploymentStatusRecord } from "@/types"

export async function listEmploymentStatuses(): Promise<EmploymentStatusRecord[]> {
  const { data } = await api.get<EmploymentStatusRecord[]>("/employment-statuses")
  return data
}

export async function createEmploymentStatus(input: { name: string; sortOrder?: number }): Promise<EmploymentStatusRecord> {
  const { data } = await api.post<EmploymentStatusRecord>("/employment-statuses", input)
  return data
}

export async function updateEmploymentStatus(id: string, input: { name: string; sortOrder?: number }): Promise<EmploymentStatusRecord> {
  const { data } = await api.put<EmploymentStatusRecord>(`/employment-statuses/${id}`, input)
  return data
}

export async function toggleEmploymentStatus(id: string): Promise<EmploymentStatusRecord> {
  const { data } = await api.patch<EmploymentStatusRecord>(`/employment-statuses/${id}/toggle-status`)
  return data
}
