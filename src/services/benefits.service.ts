import type { BenefitApplication, BenefitType, PaginatedResponse, PaginationParams } from "@/types"
import { simulateDelay } from "./http"
import { MOCK_BENEFITS } from "./mock-data/benefits"
import { MOCK_BENEFIT_TYPES } from "./mock-data/benefit-types"
import { paginate, sortBy } from "@/utils/paginate"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"

let benefits: BenefitApplication[] = readStorage<BenefitApplication[]>(STORAGE_KEYS.mockBenefits, MOCK_BENEFITS)

function persist() {
  writeStorage(STORAGE_KEYS.mockBenefits, benefits)
}

export interface BenefitListParams extends PaginationParams {
  status?: string
  benefitTypeId?: string
}

export async function listBenefits(params: BenefitListParams = {}): Promise<PaginatedResponse<BenefitApplication>> {
  let items = benefits
  if (params.search) {
    const term = params.search.toLowerCase()
    items = items.filter((b) => b.memberName.toLowerCase().includes(term) || b.applicationNumber.toLowerCase().includes(term))
  }
  if (params.status) items = items.filter((b) => b.status === params.status)
  if (params.benefitTypeId) items = items.filter((b) => b.benefitTypeId === params.benefitTypeId)
  items = sortBy(items, params.sortBy, params.sortDir)
  return simulateDelay(paginate(items, params.page, params.perPage))
}

export async function getBenefit(id: string): Promise<BenefitApplication | undefined> {
  return simulateDelay(benefits.find((b) => b.id === id))
}

export async function listBenefitTypes(): Promise<BenefitType[]> {
  return simulateDelay(MOCK_BENEFIT_TYPES, 150)
}

export function getBenefitTypesSync(): BenefitType[] {
  return MOCK_BENEFIT_TYPES
}

export function getAllBenefits(): BenefitApplication[] {
  return benefits
}

export function getMemberBenefits(memberId: string): BenefitApplication[] {
  return benefits.filter((b) => b.memberId === memberId)
}

function nextApplicationNumber(): string {
  const year = new Date().getFullYear()
  const countThisYear = benefits.filter((b) => b.applicationNumber.includes(`-${year}-`)).length
  return `GCGEA-BEN-${year}-${String(countThisYear + 1).padStart(6, "0")}`
}

export interface CreateBenefitApplicationInput {
  memberId: string
  memberNumber: string
  memberName: string
  officeName: string
  benefitTypeId: string
  benefitTypeName: string
  requestedAmount: number
  applicationDate: string
  incidentDate?: string
  reason: string
  beneficiaryOrRecipient: string
  requirements: { label: string; completed: boolean }[]
  remarks?: string
  asDraft: boolean
  createdBy: string
}

export async function createBenefitApplication(input: CreateBenefitApplicationInput): Promise<BenefitApplication> {
  const id = `ben-${Date.now()}`
  const now = new Date().toISOString()
  const status = input.asDraft ? "Draft" : "Submitted"

  const benefit: BenefitApplication = {
    id,
    applicationNumber: nextApplicationNumber(),
    applicationDate: input.applicationDate,
    memberId: input.memberId,
    memberNumber: input.memberNumber,
    memberName: input.memberName,
    officeName: input.officeName,
    benefitTypeId: input.benefitTypeId,
    benefitTypeName: input.benefitTypeName,
    requestedAmount: input.requestedAmount,
    reason: input.reason,
    incidentDate: input.incidentDate,
    beneficiaryOrRecipient: input.beneficiaryOrRecipient,
    requirements: input.requirements,
    status,
    remarks: input.remarks,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
  }

  benefits = [benefit, ...benefits]
  persist()
  return simulateDelay(benefit, 500)
}
