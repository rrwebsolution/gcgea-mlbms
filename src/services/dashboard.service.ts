import type { AmortizationEntry, BenefitApplication, LoanApplication, LoanPayment, Member } from "@/types"
import { simulateDelay } from "./http"
import { MOCK_MEMBERS } from "./mock-data/members"
import { MOCK_LOANS, MOCK_LOAN_SCHEDULES } from "./mock-data/loans"
import { MOCK_LOAN_PAYMENTS } from "./mock-data/loan-payments"
import { MOCK_BENEFITS } from "./mock-data/benefits"
import { MOCK_CONTRIBUTIONS } from "./mock-data/contributions"
import { MOCK_OFFICES } from "./mock-data/offices"
import { isProfileComplete } from "./members.service"

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

const PENDING_LOAN_STATUSES = ["Submitted", "Under Review", "For Approval"]
const PENDING_BENEFIT_STATUSES = ["Submitted", "Under Review", "For Approval"]

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const totalMembers = MOCK_MEMBERS.length
  const activeMembers = MOCK_MEMBERS.filter((m) => m.membershipStatus === "Active").length
  const retiredMembers = MOCK_MEMBERS.filter((m) => m.retireeStatus === "Retired").length
  const pendingLoanApplications = MOCK_LOANS.filter((l) => PENDING_LOAN_STATUSES.includes(l.status)).length
  const activeLoans = MOCK_LOANS.filter((l) => l.status === "Active" || l.status === "Overdue").length
  const outstandingLoanBalance = MOCK_LOANS.reduce((sum, l) => sum + l.outstandingBalance, 0)
  const totalLoanCollections = MOCK_LOAN_PAYMENTS.filter((p) => p.status === "Posted").reduce((sum, p) => sum + p.amountPaid, 0)
  const pendingBenefitApplications = MOCK_BENEFITS.filter((b) => PENDING_BENEFIT_STATUSES.includes(b.status)).length
  const benefitsReleased = MOCK_BENEFITS.filter((b) => b.status === "Released" || b.status === "Completed").length
  const currentPeriod = "2026-07"
  const monthlyContributionsCollected = MOCK_CONTRIBUTIONS.filter(
    (c) => c.contributionPeriod === currentPeriod && c.status === "Posted"
  ).reduce((sum, c) => sum + c.amount, 0)

  return simulateDelay({
    totalMembers,
    activeMembers,
    retiredMembers,
    pendingLoanApplications,
    activeLoans,
    outstandingLoanBalance,
    totalLoanCollections,
    pendingBenefitApplications,
    benefitsReleased,
    monthlyContributionsCollected,
  })
}

export async function getMonthlyLoanReleases(): Promise<{ month: string; amount: number }[]> {
  const map = new Map<string, number>()
  for (const loan of MOCK_LOANS) {
    if (!loan.releaseDate) continue
    const key = loan.releaseDate.slice(0, 7)
    map.set(key, (map.get(key) ?? 0) + (loan.actualReleasedAmount ?? 0))
  }
  const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  return simulateDelay(sorted.map(([month, amount]) => ({ month, amount })))
}

export async function getMonthlyCollections(): Promise<{ month: string; contributions: number; loanPayments: number }[]> {
  const months = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"]
  const result = months.map((month) => ({
    month,
    contributions: MOCK_CONTRIBUTIONS.filter((c) => c.contributionPeriod === month && c.status === "Posted").reduce((s, c) => s + c.amount, 0),
    loanPayments: MOCK_LOAN_PAYMENTS.filter((p) => p.paymentDate.startsWith(month) && p.status === "Posted").reduce((s, p) => s + p.amountPaid, 0),
  }))
  return simulateDelay(result)
}

export async function getLoanStatusDistribution(): Promise<{ status: string; count: number }[]> {
  const map = new Map<string, number>()
  for (const loan of MOCK_LOANS) {
    map.set(loan.status, (map.get(loan.status) ?? 0) + 1)
  }
  return simulateDelay(Array.from(map.entries()).map(([status, count]) => ({ status, count })))
}

export async function getBenefitDistributionByType(): Promise<{ type: string; count: number }[]> {
  const map = new Map<string, number>()
  for (const benefit of MOCK_BENEFITS) {
    map.set(benefit.benefitTypeName, (map.get(benefit.benefitTypeName) ?? 0) + 1)
  }
  return simulateDelay(Array.from(map.entries()).map(([type, count]) => ({ type, count })))
}

export async function getMembersPerOffice(): Promise<{ office: string; count: number }[]> {
  return simulateDelay(
    MOCK_OFFICES.filter((o) => o.status === "Active")
      .map((o) => ({ office: o.name, count: MOCK_MEMBERS.filter((m) => m.officeName === o.name).length }))
      .filter((o) => o.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  )
}

export async function getMembershipGrowthByYear(): Promise<{ year: string; count: number }[]> {
  const map = new Map<string, number>()
  for (const member of MOCK_MEMBERS) {
    const year = member.membershipDate.slice(0, 4)
    map.set(year, (map.get(year) ?? 0) + 1)
  }
  const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  let cumulative = 0
  return simulateDelay(
    sorted.map(([year, count]) => {
      cumulative += count
      return { year, count: cumulative }
    })
  )
}

export interface UpcomingDueEntry {
  loan: LoanApplication
  entry: AmortizationEntry
}

export async function getRecentLoanApplications(limit = 5): Promise<LoanApplication[]> {
  const sorted = [...MOCK_LOANS].sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime())
  return simulateDelay(sorted.slice(0, limit))
}

export async function getRecentPayments(limit = 5): Promise<LoanPayment[]> {
  const sorted = [...MOCK_LOAN_PAYMENTS].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
  return simulateDelay(sorted.slice(0, limit))
}

export async function getUpcomingDueLoans(limit = 5): Promise<UpcomingDueEntry[]> {
  const today = new Date()
  const in14Days = new Date(today)
  in14Days.setDate(today.getDate() + 14)

  const results: UpcomingDueEntry[] = []
  for (const loan of MOCK_LOANS) {
    if (loan.status !== "Active") continue
    const schedule = MOCK_LOAN_SCHEDULES[loan.id] ?? []
    const nextDue = schedule.find((s) => s.status === "Upcoming" && new Date(s.dueDate) <= in14Days)
    if (nextDue) results.push({ loan, entry: nextDue })
  }
  results.sort((a, b) => new Date(a.entry.dueDate).getTime() - new Date(b.entry.dueDate).getTime())
  return simulateDelay(results.slice(0, limit))
}

export async function getOverdueLoans(limit = 5): Promise<LoanApplication[]> {
  const overdue = MOCK_LOANS.filter((l) => l.status === "Overdue")
  return simulateDelay(overdue.slice(0, limit))
}

export async function getRecentBenefitApplications(limit = 5): Promise<BenefitApplication[]> {
  const sorted = [...MOCK_BENEFITS].sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime())
  return simulateDelay(sorted.slice(0, limit))
}

export async function getRecentlyAddedMembers(limit = 5): Promise<Member[]> {
  const sorted = [...MOCK_MEMBERS].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return simulateDelay(sorted.slice(0, limit))
}

export async function getIncompleteProfiles(limit = 5): Promise<Member[]> {
  const incomplete = MOCK_MEMBERS.filter((m) => !isProfileComplete(m))
  return simulateDelay(incomplete.slice(0, limit))
}
