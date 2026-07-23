import type { Member, PaginatedResponse, PaginationParams } from "@/types"
import { api, getPaginated } from "@/lib/api"

export interface MemberListParams extends PaginationParams {
  office?: string
  sex?: string
  membershipStatus?: string
  retireeStatus?: string
  incompleteOnly?: boolean
  draftsOnly?: boolean
}

export function isProfileComplete(member: Member): boolean {
  return Boolean(
    member.email &&
      member.cellphoneNumber &&
      member.permanentAddress &&
      member.beneficiaries.length > 0 &&
      member.documents.length > 0
  )
}

export function profileCompleteness(member: Member): number {
  const checks = [
    Boolean(member.email),
    Boolean(member.cellphoneNumber),
    Boolean(member.permanentAddress),
    Boolean(member.nameOfSpouse) || member.civilStatus !== "Married",
    member.beneficiaries.length > 0,
    member.documents.length > 0,
    Boolean(member.profilePhotoUrl),
  ]
  const complete = checks.filter(Boolean).length
  return Math.round((complete / checks.length) * 100)
}

export async function listMembers(params: MemberListParams = {}): Promise<PaginatedResponse<Member>> {
  return getPaginated<Member>("/members", params)
}

export async function listArchivedMembers(params: PaginationParams = {}): Promise<PaginatedResponse<Member>> {
  return getPaginated<Member>("/members/archived", params)
}

export async function getMember(id: string): Promise<Member | undefined> {
  const { data } = await api.get<Member>(`/members/${id}`)
  return data
}

export interface CreateMemberInput {
  employeeNumber: string
  surname: string
  firstName: string
  middleName?: string
  suffix?: string
  sex: Member["sex"]
  birthdate: string
  civilStatus: Member["civilStatus"]
  permanentAddress: string
  cellphoneNumber: string
  email?: string
  nameOfSpouse?: string
  officeId: string
  position: string
  dateOfRegularAppointment: string
  employmentStatus: Member["employmentStatus"]
  membershipType: Member["membershipType"]
  membershipDate: string
  membershipStatus: Member["membershipStatus"]
  netPay?: number
  retireeStatus: Member["retireeStatus"]
  remarks?: string
  beneficiaries: { id?: string; fullName: string; relationship: string; birthdate: string; contactNumber?: string; address?: string; sharePercentage?: number }[]
}

export async function createMember(input: CreateMemberInput): Promise<Member> {
  const { data } = await api.post<Member>("/members", input)
  return data
}

export async function updateMember(id: string, input: CreateMemberInput): Promise<Member> {
  const { data } = await api.put<Member>(`/members/${id}`, input)
  return data
}

export async function updateMemberMembershipStatus(
  id: string,
  membershipStatus: "Active" | "Inactive"
): Promise<Member> {
  const { data } = await api.patch<Member>(`/members/${id}/membership-status`, { membershipStatus })
  return data
}

/**
 * Draft payloads may omit almost everything (see MemberRequest's lenient
 * `asDraft` rules) — only `asDraft`/`draftCurrentStep` are guaranteed.
 */
export type MemberDraftInput = Partial<CreateMemberInput> & { asDraft: true; draftCurrentStep?: number }

export async function createMemberDraft(input: MemberDraftInput): Promise<Member> {
  const { data } = await api.post<Member>("/members", input)
  return data
}

export async function updateMemberDraft(id: string, input: MemberDraftInput): Promise<Member> {
  const { data } = await api.put<Member>(`/members/${id}`, input)
  return data
}

/** Finalizes a draft into a real registration — full strict validation, assigns the real member_number. */
export async function submitMemberDraft(id: string, input: CreateMemberInput): Promise<Member> {
  const { data } = await api.post<Member>(`/members/${id}/submit`, { ...input, asDraft: false })
  return data
}

export async function archiveMember(id: string, reason: string): Promise<Member> {
  const { data } = await api.post<Member>(`/members/${id}/archive`, { reason })
  return data
}

export async function restoreMember(id: string): Promise<Member> {
  const { data } = await api.post<Member>(`/members/${id}/restore`)
  return data
}

export async function approveMemberRegistration(id: string, remarks?: string): Promise<Member> {
  const { data } = await api.post<Member>(`/members/${id}/approve`, { remarks })
  return data
}

export async function rejectMemberRegistration(id: string, remarks: string): Promise<Member> {
  const { data } = await api.post<Member>(`/members/${id}/reject`, { remarks })
  return data
}

export async function uploadMemberPhoto(
  id: string,
  file: File,
  onUploadProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<Member> {
  const form = new FormData()
  form.append("photo", file)
  const { data } = await api.post<Member>(`/members/${id}/photo`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => onUploadProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
    signal,
  })
  return data
}

export async function removeMemberPhoto(id: string): Promise<Member> {
  const { data } = await api.delete<Member>(`/members/${id}/photo`)
  return data
}

export async function uploadMemberDocument(
  id: string,
  category: string,
  file: File,
  onUploadProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<Member> {
  const form = new FormData()
  form.append("category", category)
  form.append("file", file)
  await api.post(`/members/${id}/documents`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => onUploadProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
    signal,
  })
  const { data } = await api.get<Member>(`/members/${id}`)
  return data
}

export async function deleteMemberDocument(memberId: string, documentId: string): Promise<void> {
  await api.delete(`/members/${memberId}/documents/${documentId}`)
}

// Best-effort synchronous cache for call sites that need a member picklist
// without an explicit fetch (e.g. bulk contribution entry). Populated by
// listAllActiveMembers(); empty until the first call resolves.
let cachedActiveMembers: Member[] = []

export async function listAllActiveMembers(): Promise<Member[]> {
  const { data } = await api.get<Member[]>("/members/all")
  cachedActiveMembers = data
  return data
}

export function getAllActiveMembers(): Member[] {
  return cachedActiveMembers
}

export interface MemberLoanEligibility {
  eligible: boolean
  completedMonths: number
  requiredMonths: number
  eligibleOn: string
  checks: { label: string; passed: boolean; detail: string }[]
}

/** Membership-duration-only eligibility snapshot — used by the Create Loan Application member selector's badge/filter. */
export async function getMemberLoanEligibility(memberId: string): Promise<MemberLoanEligibility> {
  const { data } = await api.get<MemberLoanEligibility>(`/members/${memberId}/loan-eligibility`)
  return data
}

export { calculateAge } from "@/utils/format"
