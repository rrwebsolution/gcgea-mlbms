import type { AmortizationEntry, BenefitApplication, LoanApplication, LoanPayment, Member } from "@/types"
import { api } from "@/lib/api"

export interface DashboardSummary {
  totalMembers: number
  activeMembers: number
  retiredMembers: number
  pendingLoanApplications: number
  activeLoans: number
  outstandingLoanBalance: number
  totalLoanCollections: number
  pendingBenefitApplications: number
  benefitsReleased: number
  monthlyContributionsCollected: number
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>("/dashboard/summary")
  return data
}

export async function getMonthlyLoanReleases(): Promise<{ month: string; amount: number }[]> {
  const { data } = await api.get<{ month: string; amount: number }[]>("/dashboard/monthly-releases")
  return data
}

export async function getMonthlyCollections(): Promise<{ month: string; contributions: number; loanPayments: number }[]> {
  const { data } = await api.get<{ month: string; contributions: number; loanPayments: number }[]>("/dashboard/monthly-collections")
  return data
}

export async function getLoanStatusDistribution(): Promise<{ status: string; count: number }[]> {
  const { data } = await api.get<{ status: string; count: number }[]>("/dashboard/loan-status")
  return data
}

export async function getBenefitDistributionByType(): Promise<{ type: string; count: number }[]> {
  const { data } = await api.get<{ type: string; count: number }[]>("/dashboard/benefit-distribution")
  return data
}

export async function getMembersPerOffice(): Promise<{ office: string; count: number }[]> {
  const { data } = await api.get<{ office: string; count: number }[]>("/dashboard/members-per-office")
  return data
}

export async function getMembershipGrowthByYear(): Promise<{ year: string; count: number }[]> {
  const { data } = await api.get<{ year: string; count: number }[]>("/dashboard/membership-growth")
  return data
}

export interface UpcomingDueEntry {
  loan: LoanApplication
  entry: AmortizationEntry
}

export async function getRecentLoanApplications(limit = 5): Promise<LoanApplication[]> {
  const { data } = await api.get<LoanApplication[]>("/dashboard/recent-loans", { params: { limit } })
  return data
}

export async function getRecentPayments(limit = 5): Promise<LoanPayment[]> {
  const { data } = await api.get<LoanPayment[]>("/dashboard/recent-payments", { params: { limit } })
  return data
}

export async function getUpcomingDueLoans(limit = 5): Promise<UpcomingDueEntry[]> {
  const { data } = await api.get<UpcomingDueEntry[]>("/dashboard/upcoming-due", { params: { limit } })
  return data
}

export async function getOverdueLoans(limit = 5): Promise<LoanApplication[]> {
  const { data } = await api.get<LoanApplication[]>("/dashboard/overdue-loans", { params: { limit } })
  return data
}

export async function getRecentBenefitApplications(limit = 5): Promise<BenefitApplication[]> {
  const { data } = await api.get<BenefitApplication[]>("/dashboard/recent-benefits", { params: { limit } })
  return data
}

export async function getRecentlyAddedMembers(limit = 5): Promise<Member[]> {
  const { data } = await api.get<Member[]>("/dashboard/recent-members", { params: { limit } })
  return data
}

export async function getIncompleteProfiles(limit = 5): Promise<Member[]> {
  const { data } = await api.get<Member[]>("/dashboard/incomplete-profiles", { params: { limit } })
  return data
}
