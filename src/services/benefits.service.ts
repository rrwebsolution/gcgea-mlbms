import type { BenefitApplication, BenefitType, PaginatedResponse, PaginationParams } from "@/types"
import { api } from "@/lib/api"

export interface BenefitListParams extends PaginationParams {
  status?: string
  benefitTypeId?: string
}

export async function listBenefits(params: BenefitListParams = {}): Promise<PaginatedResponse<BenefitApplication>> {
  const { data } = await api.get<PaginatedResponse<BenefitApplication>>("/benefits", { params })
  return data
}

export async function getBenefit(id: string): Promise<BenefitApplication | undefined> {
  const { data } = await api.get<BenefitApplication>(`/benefits/${id}`)
  return data
}

// Best-effort synchronous cache of the last successful listBenefitTypes() fetch —
// populated on every resolve so getBenefitTypesSync() has data available for code
// that still calls it synchronously. Empty until the first real fetch completes.
let cachedBenefitTypes: BenefitType[] = []

export async function listBenefitTypes(): Promise<BenefitType[]> {
  const { data } = await api.get<BenefitType[]>("/benefit-types")
  cachedBenefitTypes = data
  return data
}

export function getBenefitTypesSync(): BenefitType[] {
  return cachedBenefitTypes
}

export async function createBenefitType(input: Omit<BenefitType, "id">): Promise<BenefitType> {
  const { data } = await api.post<BenefitType>("/benefit-types", input)
  return data
}

export async function updateBenefitType(id: string, input: Partial<Omit<BenefitType, "id">>): Promise<BenefitType> {
  const { data } = await api.put<BenefitType>(`/benefit-types/${id}`, input)
  return data
}

export async function deleteBenefitType(id: string): Promise<void> {
  await api.delete(`/benefit-types/${id}`)
}

// Best-effort synchronous cache of all benefits — mirrors getAllLoans() in
// loans.service.ts. Populated by listAllBenefits(); empty until the first
// call resolves.
let cachedBenefits: BenefitApplication[] = []

export async function listAllBenefits(): Promise<BenefitApplication[]> {
  const { data } = await api.get<BenefitApplication[]>("/benefits/all")
  cachedBenefits = data
  return data
}

export function getAllBenefits(): BenefitApplication[] {
  return cachedBenefits
}

export function getMemberBenefits(memberId: string): BenefitApplication[] {
  return cachedBenefits.filter((b) => b.memberId === memberId)
}

export interface CreateBenefitApplicationInput {
  memberId: string
  benefitTypeId?: string
  requestedAmount?: number
  incidentDate?: string
  reason?: string
  beneficiaryOrRecipient?: string
  requirements: { label: string; completed: boolean }[]
  asDraft: boolean
  draftCurrentStep?: number
}

export async function createBenefitApplication(input: CreateBenefitApplicationInput): Promise<BenefitApplication> {
  const { data } = await api.post<BenefitApplication>("/benefits", input)
  cachedBenefits = [data, ...cachedBenefits]
  return data
}

/** Edits a draft application in place — only allowed while the benefit is still status "Draft". */
export async function updateBenefitApplication(id: string, input: CreateBenefitApplicationInput): Promise<BenefitApplication> {
  const { data } = await api.put<BenefitApplication>(`/benefits/${id}`, input)
  cachedBenefits = cachedBenefits.map((b) => (b.id === data.id ? data : b))
  return data
}
