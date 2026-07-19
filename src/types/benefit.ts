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
  /**
   * Technically absent at the API level while a draft hasn't reached Step 2
   * yet (same for reason/beneficiaryOrRecipient below) — kept non-optional
   * since ~all real consumers assume a fully-specified application;
   * draft-aware screens apply their own `|| "—"` fallbacks instead of
   * loosening this globally.
   */
  benefitTypeName: string
  requestedAmount: number
  approvedAmount?: number
  reason: string
  incidentDate?: string
  beneficiaryOrRecipient: string
  requirements: { label: string; completed: boolean }[]
  status: BenefitStatus
  /** Which wizard step a draft was last saved on (Create Benefit Application page). */
  draftCurrentStep?: number
  releaseDate?: string
  rejectionReason?: string
  cancellationReason?: string
  remarks?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}
