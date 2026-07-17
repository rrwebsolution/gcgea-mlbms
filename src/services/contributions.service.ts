import type { Contribution, PaginatedResponse, PaginationParams, PaymentMethod } from "@/types"
import { simulateDelay } from "./http"
import { MOCK_CONTRIBUTIONS } from "./mock-data/contributions"
import { paginate, sortBy } from "@/utils/paginate"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"

let contributions: Contribution[] = readStorage<Contribution[]>(STORAGE_KEYS.mockContributions, MOCK_CONTRIBUTIONS)

function persist() {
  writeStorage(STORAGE_KEYS.mockContributions, contributions)
}

export async function listContributions(params: PaginationParams = {}): Promise<PaginatedResponse<Contribution>> {
  let items = contributions
  if (params.search) {
    const term = params.search.toLowerCase()
    items = items.filter(
      (c) =>
        c.memberName.toLowerCase().includes(term) ||
        c.memberNumber.toLowerCase().includes(term) ||
        c.referenceNumber.toLowerCase().includes(term)
    )
  }
  items = sortBy(items, params.sortBy, params.sortDir)
  return simulateDelay(paginate(items, params.page, params.perPage))
}

export function getAllContributions(): Contribution[] {
  return contributions
}

export function hasExistingContribution(memberId: string, period: string): boolean {
  return contributions.some((c) => c.memberId === memberId && c.contributionPeriod === period && c.status === "Posted")
}

function nextReferenceNumber(): string {
  const year = new Date().getFullYear()
  const countThisYear = contributions.filter((c) => c.referenceNumber.includes(`-${year}-`)).length
  return `GCGEA-CON-${year}-${String(countThisYear + 1).padStart(6, "0")}`
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
  paymentDate: string
  paymentMethod: PaymentMethod
  payrollReference?: string
  encodedBy: string
  rows: BulkContributionRow[]
  skipDuplicates: boolean
}

export interface BulkCreateResult {
  saved: number
  skippedDuplicates: number
  failed: number
}

export async function bulkCreateContributions(input: BulkCreateContributionsInput): Promise<BulkCreateResult> {
  let saved = 0
  let skippedDuplicates = 0
  let failed = 0
  const created: Contribution[] = []

  for (const row of input.rows) {
    if (row.amount <= 0) {
      failed++
      continue
    }
    const isDuplicate = hasExistingContribution(row.memberId, input.contributionPeriod)
    if (isDuplicate && input.skipDuplicates) {
      skippedDuplicates++
      continue
    }

    const now = new Date().toISOString()
    created.push({
      id: `con-${Date.now()}-${row.memberId}`,
      referenceNumber: nextReferenceNumber(),
      memberId: row.memberId,
      memberNumber: row.memberNumber,
      memberName: row.memberName,
      officeName: row.officeName,
      contributionPeriod: input.contributionPeriod,
      amount: row.amount,
      paymentDate: input.paymentDate,
      paymentMethod: input.paymentMethod,
      payrollReference: input.payrollReference,
      encodedBy: input.encodedBy,
      status: "Posted",
      createdAt: now,
    })
    saved++
  }

  contributions = [...created, ...contributions]
  persist()

  return simulateDelay({ saved, skippedDuplicates, failed }, 700)
}
