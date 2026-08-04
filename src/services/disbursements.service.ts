import { api, getPaginated } from "@/lib/api"
import type { Disbursement, DisbursementStatus, PaginatedResponse, PaginationParams } from "@/types"

export interface DisbursementListParams extends PaginationParams {
  status?: DisbursementStatus | ""
  year?: number
}

export interface DisbursementInput {
  annualBudgetId: string
  annualBudgetItemId: string
  disbursementDate: string
  payee: string
  amount: number
  paymentMethod: "Cash" | "Bank Transfer" | "Check"
  paymentReference?: string
  remarks?: string
}

export const listDisbursements = (params: DisbursementListParams = {}): Promise<PaginatedResponse<Disbursement>> =>
  getPaginated<Disbursement>("/disbursements", params)

export async function listAllDisbursements(): Promise<Disbursement[]> {
  const { data } = await api.get<Disbursement[]>("/disbursements/all")
  return data
}

export async function getDisbursement(id: string): Promise<Disbursement> {
  const { data } = await api.get<Disbursement>(`/disbursements/${id}`)
  return data
}

export async function createDisbursement(input: DisbursementInput): Promise<Disbursement> {
  const { data } = await api.post<Disbursement>("/disbursements", input)
  return data
}

export async function updateDisbursement(id: string, input: DisbursementInput): Promise<Disbursement> {
  const { data } = await api.put<Disbursement>(`/disbursements/${id}`, input)
  return data
}

export async function submitDisbursement(id: string): Promise<Disbursement> {
  const { data } = await api.post<Disbursement>(`/disbursements/${id}/submit`)
  return data
}

export async function payDisbursement(id: string, paymentMethod: string, paymentReference?: string): Promise<Disbursement> {
  const { data } = await api.post<Disbursement>(`/disbursements/${id}/pay`, { paymentMethod, paymentReference })
  return data
}

export async function voidDisbursement(id: string, reason: string): Promise<Disbursement> {
  const { data } = await api.post<Disbursement>(`/disbursements/${id}/void`, { reason })
  return data
}

export interface MonthlyDisbursementRow {
  particular: string
  months: number[]
  total: number
}

export interface MonthlyDisbursementReport {
  year: number
  rows: MonthlyDisbursementRow[]
  monthlyTotals: number[]
  grandTotal: number
  incomeSummary: {
    interestIncome: number[]
    serviceIncome: number[]
    expenses: number[]
  }
}

export async function getMonthlyDisbursementReport(year: number): Promise<MonthlyDisbursementReport> {
  const { data } = await api.get<MonthlyDisbursementReport>("/reports/monthly-disbursements", { params: { year } })
  return data
}
