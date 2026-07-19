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
  fileUrl: string
  uploadedAt: string
  uploadedBy: string
  fileSize: string
}

export interface Member {
  id: string
  /**
   * Technically nullable at the API level while isDraft=true (an
   * in-progress draft can be missing almost anything below, not just this)
   * — kept non-optional since ~all real consumers correctly assume a
   * submitted member; draft-aware screens (MemberRegistrationPage resume,
   * Draft Center) apply their own `?? ""`/`?? "—"` fallbacks instead of
   * loosening this globally. See isDraft/draftReferenceNo.
   */
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

  /** Draft bookkeeping — see the Save as Draft system (useDraft, MemberRegistrationPage). */
  isDraft: boolean
  draftReferenceNo?: string
  draftCompletionPercentage?: number
  draftCurrentStep?: number

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
