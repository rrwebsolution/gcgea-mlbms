import { api } from "@/lib/api"
import type { ManualPayrollContext, ManualPayrollDeduction, SaveManualPayrollInput } from "@/types/manual-payroll"

export async function getNextManualPayrollReference(): Promise<string> {
  const { data } = await api.get<{ payrollReference: string }>("/payroll-deductions/manual/reference")
  return data.payrollReference
}

export async function getManualPayrollMemberContext(memberId: string): Promise<ManualPayrollContext> {
  const { data } = await api.get<ManualPayrollContext>(`/payroll-deductions/manual/members/${memberId}`)
  return data
}

export async function saveManualPayrollDraft(input: SaveManualPayrollInput): Promise<ManualPayrollDeduction> {
  const { data } = await api.post<ManualPayrollDeduction>("/payroll-deductions/manual", input)
  return data
}

export async function postManualPayrollDeduction(id: string): Promise<ManualPayrollDeduction> {
  const { data } = await api.post<ManualPayrollDeduction>(`/payroll-deductions/manual/${id}/post`)
  return data
}
