import { api } from "@/lib/api"
import { getPaginated } from "@/lib/api"
import type { PaginatedResponse, PaginationParams } from "@/types"

export type AnnualBudgetStatus = "Draft" | "For Approval" | "Approved" | "Rejected"

export interface AnnualBudgetItem {
  id?: string
  accountTitle: string
  proposedAmount: number
  committedAmount?: number
  actualPaidAmount?: number
  remainingAmount?: number
}

export interface AnnualBudget {
  id: string | null
  fiscalYear: number
  estimatedRevenue: number
  status: AnnualBudgetStatus
  notes: string | null
  preparedBy: string | null
  approvedBy: string | null
  approvedAt: string | null
  rejectionReason: string | null
  currentStageLabel: string | null
  items: AnnualBudgetItem[]
  totalProposedBudget: number
  unallocatedBalance: number
  exists: boolean
}

export interface SaveAnnualBudgetInput {
  estimatedRevenue: number
  status: AnnualBudgetStatus
  notes: string | null
  items: Array<Pick<AnnualBudgetItem, "accountTitle" | "proposedAmount">>
}

export async function getAnnualBudget(year: number): Promise<AnnualBudget> {
  const { data } = await api.get<AnnualBudget>(`/annual-budgets/${year}`)
  return data
}

export async function getAnnualBudgetById(id: string): Promise<AnnualBudget> {
  const { data } = await api.get<AnnualBudget>(`/annual-budgets/id/${id}`)
  return data
}

export interface AnnualBudgetListParams extends PaginationParams {
  status?: AnnualBudgetStatus | ""
}

export async function listAnnualBudgets(params: AnnualBudgetListParams = {}): Promise<PaginatedResponse<AnnualBudget>> {
  return getPaginated<AnnualBudget>("/annual-budgets", params)
}

export async function listAllAnnualBudgets(): Promise<AnnualBudget[]> {
  const { data } = await api.get<AnnualBudget[]>("/annual-budgets/all")
  return data
}

export async function saveAnnualBudget(year: number, input: SaveAnnualBudgetInput): Promise<AnnualBudget> {
  const { data } = await api.put<AnnualBudget>(`/annual-budgets/${year}`, input)
  return data
}

export async function copyPreviousAnnualBudget(year: number): Promise<AnnualBudget> {
  const { data } = await api.post<AnnualBudget>(`/annual-budgets/${year}/copy-previous`)
  return data
}

export async function submitAnnualBudget(year: number): Promise<AnnualBudget> {
  const { data } = await api.post<AnnualBudget>(`/annual-budgets/${year}/submit`)
  return data
}
