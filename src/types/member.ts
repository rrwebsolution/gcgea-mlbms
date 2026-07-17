import type { CivilStatus, Sex } from "./common"

export type MembershipStatus = "Active" | "Inactive" | "Suspended" | "Terminated" | "Deceased"
export type RetireeStatus = "Not Retired" | "Retired"
export type EmploymentStatus = "Permanent" | "Casual" | "Job Order" | "Contractual" | "Co-terminus"
export type MembershipType = "Regular" | "Associate" | "Honorary"

export interface Beneficiary {
  id: string
  memberId: string
  fullName: string
  relationship: string
  birthdate: string
  contactNumber?: string
  address?: string
  sharePercentage?: number
}

export type DocumentCategory =
  | "Valid ID"
  | "Appointment Document"
  | "Payslip"
  | "Membership Form"
  | "Other Supporting Document"

export interface MemberDocument {
  id: string
  memberId: string
  category: DocumentCategory
  fileName: string
  uploadedAt: string
  uploadedBy: string
  fileSize: string
}

export interface Member {
  id: string
  memberNumber: string
  employeeNumber: string
  surname: string
  firstName: string
  middleName?: string
  suffix?: string
  fullName: string
  sex: Sex
  birthdate: string
  civilStatus: CivilStatus
  permanentAddress: string
  cellphoneNumber: string
  email?: string
  nameOfSpouse?: string
  profilePhotoUrl?: string

  officeId: string
  officeName: string
  position: string
  dateOfRegularAppointment: string
  employmentStatus: EmploymentStatus

  membershipType: MembershipType
  membershipDate: string
  membershipStatus: MembershipStatus
  retireeStatus: RetireeStatus
  remarks?: string

  beneficiaries: Beneficiary[]
  documents: MemberDocument[]

  isArchived: boolean
  archivedAt?: string
  archivedReason?: string

  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface MemberSummary {
  id: string
  memberNumber: string
  fullName: string
  officeName: string
  position: string
  membershipStatus: MembershipStatus
  outstandingLoanBalance: number
  totalContributions: number
  profilePhotoUrl?: string
}
