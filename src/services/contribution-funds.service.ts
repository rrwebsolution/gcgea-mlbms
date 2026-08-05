import { api } from "@/lib/api"
import type { ContributionFund } from "@/types"

export type ContributionFundInput = Omit<ContributionFund, "id" | "status"> & { isEnabled: boolean }

function payload(input: ContributionFundInput) {
  return {
    fund_name: input.fundName,
    allocation_type: input.allocationType,
    allocation_value: input.allocationValue,
    description: input.description,
    is_enabled: input.isEnabled,
    display_order: input.displayOrder,
  }
}

export async function listContributionFunds(): Promise<ContributionFund[]> {
  const { data } = await api.get<ContributionFund[]>("/contribution-funds")
  return data
}

export async function createContributionFund(input: ContributionFundInput): Promise<ContributionFund> {
  const { data } = await api.post<ContributionFund>("/contribution-funds", payload(input))
  return data
}

export async function updateContributionFund(id: string, input: ContributionFundInput): Promise<ContributionFund> {
  const { data } = await api.put<ContributionFund>(`/contribution-funds/${id}`, payload(input))
  return data
}

export async function deleteContributionFund(id: string): Promise<void> {
  await api.delete(`/contribution-funds/${id}`)
}

export interface FundAllocationReportRow {
  fundId: string
  fundName: string
  allocatedAmount: number
  disbursedAmount: number
  currentBalance: number
  monthlyTotal: number
  annualTotal: number
}

export async function getFundAllocationReport(): Promise<FundAllocationReportRow[]> {
  const { data } = await api.get<FundAllocationReportRow[]>("/reports/fund-allocations")
  return data
}
