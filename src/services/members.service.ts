import type { Member, PaginatedResponse, PaginationParams } from "@/types"
import { simulateDelay } from "./http"
import { MOCK_MEMBERS, MOCK_ARCHIVED_MEMBERS } from "./mock-data/members"
import { paginate, sortBy } from "@/utils/paginate"
import { calculateAge } from "@/utils/format"

let activeMembers: Member[] = [...MOCK_MEMBERS]
let archivedMembers: Member[] = [...MOCK_ARCHIVED_MEMBERS]

export interface MemberListParams extends PaginationParams {
  office?: string
  sex?: string
  membershipStatus?: string
  retireeStatus?: string
  incompleteOnly?: boolean
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

function matchesSearch(member: Member, search: string): boolean {
  const term = search.toLowerCase()
  return (
    member.fullName.toLowerCase().includes(term) ||
    member.memberNumber.toLowerCase().includes(term) ||
    member.officeName.toLowerCase().includes(term) ||
    member.position.toLowerCase().includes(term) ||
    member.cellphoneNumber.includes(term)
  )
}

export async function listMembers(params: MemberListParams = {}): Promise<PaginatedResponse<Member>> {
  let items = activeMembers

  if (params.search) items = items.filter((m) => matchesSearch(m, params.search!))
  if (params.office) items = items.filter((m) => m.officeName === params.office)
  if (params.sex) items = items.filter((m) => m.sex === params.sex)
  if (params.membershipStatus) items = items.filter((m) => m.membershipStatus === params.membershipStatus)
  if (params.retireeStatus) items = items.filter((m) => m.retireeStatus === params.retireeStatus)
  if (params.incompleteOnly) items = items.filter((m) => !isProfileComplete(m))

  items = sortBy(items, params.sortBy, params.sortDir)

  return simulateDelay(paginate(items, params.page, params.perPage))
}

export async function listArchivedMembers(params: PaginationParams = {}): Promise<PaginatedResponse<Member>> {
  let items = archivedMembers
  if (params.search) items = items.filter((m) => matchesSearch(m, params.search!))
  items = sortBy(items, params.sortBy, params.sortDir)
  return simulateDelay(paginate(items, params.page, params.perPage))
}

export async function getMember(id: string): Promise<Member | undefined> {
  const found = activeMembers.find((m) => m.id === id) ?? archivedMembers.find((m) => m.id === id)
  return simulateDelay(found)
}

export async function createMember(input: Partial<Member>): Promise<Member> {
  const id = `mem-new-${Date.now()}`
  const nextNumber = activeMembers.length + archivedMembers.length + 1
  const newMember: Member = {
    id,
    memberNumber: `GCGEA-MEM-${String(nextNumber).padStart(6, "0")}`,
    employeeNumber: input.employeeNumber ?? "",
    surname: input.surname ?? "",
    firstName: input.firstName ?? "",
    middleName: input.middleName,
    suffix: input.suffix,
    fullName: `${input.surname ?? ""}${input.suffix ? " " + input.suffix : ""}, ${input.firstName ?? ""}${input.middleName ? " " + input.middleName : ""}`,
    sex: input.sex ?? "Male",
    birthdate: input.birthdate ?? "",
    civilStatus: input.civilStatus ?? "Single",
    permanentAddress: input.permanentAddress ?? "",
    cellphoneNumber: input.cellphoneNumber ?? "",
    email: input.email,
    nameOfSpouse: input.nameOfSpouse,
    profilePhotoUrl: input.profilePhotoUrl,
    officeId: input.officeId ?? "",
    officeName: input.officeName ?? "",
    position: input.position ?? "",
    dateOfRegularAppointment: input.dateOfRegularAppointment ?? "",
    employmentStatus: input.employmentStatus ?? "Permanent",
    membershipType: input.membershipType ?? "Regular",
    membershipDate: input.membershipDate ?? new Date().toISOString().slice(0, 10),
    membershipStatus: input.membershipStatus ?? "Active",
    retireeStatus: input.retireeStatus ?? "Not Retired",
    remarks: input.remarks,
    beneficiaries: input.beneficiaries ?? [],
    documents: input.documents ?? [],
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "Current User",
  }
  activeMembers = [newMember, ...activeMembers]
  return simulateDelay(newMember, 500)
}

export async function updateMember(id: string, input: Partial<Member>): Promise<Member> {
  const idx = activeMembers.findIndex((m) => m.id === id)
  if (idx === -1) throw new Error("Member not found")
  const updated: Member = { ...activeMembers[idx], ...input, updatedAt: new Date().toISOString() }
  activeMembers = activeMembers.map((m, i) => (i === idx ? updated : m))
  return simulateDelay(updated, 500)
}

export async function archiveMember(id: string, reason: string): Promise<void> {
  const idx = activeMembers.findIndex((m) => m.id === id)
  if (idx === -1) throw new Error("Member not found")
  const [member] = activeMembers.splice(idx, 1)
  archivedMembers = [{ ...member, isArchived: true, archivedAt: new Date().toISOString(), archivedReason: reason }, ...archivedMembers]
  await simulateDelay(null, 400)
}

export async function restoreMember(id: string): Promise<void> {
  const idx = archivedMembers.findIndex((m) => m.id === id)
  if (idx === -1) throw new Error("Member not found")
  const [member] = archivedMembers.splice(idx, 1)
  activeMembers = [{ ...member, isArchived: false, archivedAt: undefined, archivedReason: undefined }, ...activeMembers]
  await simulateDelay(null, 400)
}

export function getAllActiveMembers(): Member[] {
  return activeMembers
}

export { calculateAge }
