export interface BenefitType {
  id: string
  name: string
  description: string
  defaultAmount: number
  maximumAmount: number
  eligibilityRequirements: string
  requiredMembershipMonths: number
  frequencyLimit: string
  requiredDocuments: string[]
  approvalRequired: boolean
  status: "Active" | "Inactive"
}

export type BenefitStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "For Approval"
  | "Approved"
  | "Rejected"
  | "Released"
  | "Completed"
  | "Cancelled"

export interface BenefitApplication {
  id: string
  applicationNumber: string
  applicationDate: string
  memberId: string
  memberNumber: string
  memberName: string
  officeName: string
  benefitTypeId: string
  benefitTypeName: string
  requestedAmount: number
  approvedAmount?: number
  reason: string
  incidentDate?: string
  beneficiaryOrRecipient: string
  requirements: { label: string; completed: boolean }[]
  status: BenefitStatus
  releaseDate?: string
  rejectionReason?: string
  cancellationReason?: string
  remarks?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}
