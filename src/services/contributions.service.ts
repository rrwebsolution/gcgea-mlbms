import type { Contribution, ContributionType, PaginatedResponse, PaginationParams, PaymentMethod } from "@/types"
import { api, getPaginated } from "@/lib/api"
import { getSettings } from "@/services/settings.service"

/** Never hardcoded — read fresh from Settings › Contribution Settings each time (defaults: ₱150 Monthly Dues, ₱200 Cash Pabaon per the GCGEA Cash Pabaon Program, Board Resolution 06-2024). */
export function defaultContributionAmountForType(type: ContributionType): number | undefined {
  const { contribution } = getSettings()
  if (type === "Monthly Dues") return contribution.defaultMonthlyContribution
  if (type === "Cash Pabaon") return contribution.defaultCashPabaonContribution
  return undefined
}

export interface ListContributionsParams extends PaginationParams {
  period?: string
  office?: string
  paymentMethod?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  contributionType?: ContributionType
}

export async function listContributions(params: ListContributionsParams = {}): Promise<PaginatedResponse<Contribution>> {
  return getPaginated<Contribution>("/contributions", params)
}

// Best-effort synchronous cache — several pages compute duplicate-checks and
// period lists synchronously during render/CSV-processing rather than through
// a query. Populated by listAllContributions(); empty until the first call resolves.
let cachedContributions: Contribution[] = []

export async function listAllContributions(): Promise<Contribution[]> {
  const { data } = await api.get<Contribution[]>("/contributions/all")
  cachedContributions = data
  return data
}

export function getAllContributions(): Contribution[] {
  return cachedContributions
}

export async function getContribution(id: string): Promise<Contribution | undefined> {
  const { data } = await api.get<Contribution>(`/contributions/${id}`)
  return data
}

export function getContributionPeriods(): string[] {
  return Array.from(new Set(cachedContributions.map((c) => c.contributionPeriod))).sort().reverse()
}

export function hasExistingContribution(memberId: string, period: string, contributionType: ContributionType = "Monthly Dues"): boolean {
  return cachedContributions.some(
    (c) => c.memberId === memberId && c.contributionPeriod === period && c.contributionType === contributionType && c.status === "Posted"
  )
}

export interface CreateContributionInput {
  memberId: string
  memberNumber: string
  memberName: string
  officeName: string
  contributionPeriod: string
  contributionType?: ContributionType
  amount: number
  paymentMethod: PaymentMethod
  officialReceiptNumber?: string
  payrollReference?: string
  paymentDate: string
  remarks?: string
  encodedBy: string
}

export async function createContribution(input: CreateContributionInput): Promise<Contribution> {
  const { data } = await api.post<Contribution>("/contributions", input)
  cachedContributions = [data, ...cachedContributions]
  return data
}

export interface UpdateContributionInput {
  contributionPeriod: string
  contributionType?: ContributionType
  amount: number
  paymentMethod: PaymentMethod
  officialReceiptNumber?: string
  payrollReference?: string
  paymentDate: string
  remarks?: string
}

export async function updateContribution(id: string, input: UpdateContributionInput): Promise<Contribution> {
  const { data } = await api.put<Contribution>(`/contributions/${id}`, input)
  cachedContributions = cachedContributions.map((c) => (c.id === id ? data : c))
  return data
}

export async function voidContribution(id: string, reason: string): Promise<Contribution> {
  const { data } = await api.post<Contribution>(`/contributions/${id}/void`, { reason })
  cachedContributions = cachedContributions.map((c) => (c.id === id ? data : c))
  return data
}

export interface BulkContributionRow {
  memberId: string
  memberNumber: string
  memberName: string
  officeName: string
  amount: number
}

export interface BulkCreateContributionsInput {
  contributionPeriod: string
  contributionType?: ContributionType
  paymentDate: string
  paymentMethod: PaymentMethod
  payrollReference?: string
  encodedBy: string
  rows: BulkContributionRow[]
  skipDuplicates: boolean
  /** Permission-gated server-side: overwrite the existing Posted record for the member/period instead of skipping it. Takes precedence over skipDuplicates. */
  replaceDuplicates?: boolean
}

export interface BulkCreateResult {
  saved: number
  skippedDuplicates: number
  replaced: number
  failed: number
  cashPabaonSaved: number
  cashPabaonSkipped: number
}

export async function bulkCreateContributions(input: BulkCreateContributionsInput): Promise<BulkCreateResult> {
  const { data } = await api.post<BulkCreateResult>("/contributions/bulk", input)
  void listAllContributions() // refresh the cache so subsequent duplicate-checks see the new rows
  return data
}
