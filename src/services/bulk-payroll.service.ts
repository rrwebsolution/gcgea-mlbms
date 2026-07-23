import { api } from "@/lib/api"
import type { BulkPayrollBatch, BulkPayrollMemberContext, SaveBulkPayrollInput } from "@/types/bulk-payroll"

export async function getNextBulkPayrollReference(): Promise<string> {
  const { data } = await api.get<{ payrollReference: string }>("/payroll-deductions/bulk/reference")
  return data.payrollReference
}

export async function getBulkPayrollMemberContexts(memberIds: string[]): Promise<Record<string, BulkPayrollMemberContext>> {
  const { data } = await api.post<Record<string, BulkPayrollMemberContext>>("/payroll-deductions/bulk/members/context", { memberIds })
  return data
}

export async function saveBulkPayrollDraft(input: SaveBulkPayrollInput): Promise<BulkPayrollBatch> {
  const { data } = await api.post<BulkPayrollBatch>("/payroll-deductions/bulk", input)
  return data
}

export async function postBulkPayrollBatch(id: string): Promise<BulkPayrollBatch> {
  const { data } = await api.post<BulkPayrollBatch>(`/payroll-deductions/bulk/${id}/post`)
  return data
}
