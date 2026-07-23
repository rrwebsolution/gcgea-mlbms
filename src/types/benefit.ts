/** Which paid-contribution ledger prorationTiers counts months against. */
export type ProrationBasis = "dues" | "pabaon"

export interface BenefitTypeProrationTier {
  id: string
  minMonths: number
  /** null = open-ended ("and beyond"). */
  maxMonths: number | null
  /** Percentage (0-100) of the resolved base amount this tier pays out. */
  percentage: number
}

export interface BenefitTypeFyAmount {
  id: string
  /** null = catch-all "and beyond" row. */
  fiscalYear: number | null
  baseAmount: number
}

/** Shape for creating/replacing a benefit type's tiers — no `id`, the backend full-replace-syncs these on every save. */
export interface BenefitTypeProrationTierInput {
  minMonths: number
  maxMonths?: number | null
  percentage: number
}
/** Shape for creating/replacing a benefit type's FY amounts — no `id`, same full-replace-sync convention. */
export interface BenefitTypeFyAmountInput {
  fiscalYear?: number | null
  baseAmount: number
}

export interface BenefitType {
  id: string
  name: string
  description: string
  defaultAmount: number
  maximumAmount: number
  /** Set (with prorationTiers non-empty) for benefit types prorated by contribution months — see GCGEA Resolution No. 24-2026. */
  prorationBasis?: ProrationBasis | null
  prorationTiers: BenefitTypeProrationTier[]
  /** Fiscal-year-indexed base amounts for benefit types whose 100% base escalates by year (e.g. Cash Pabaon Program). Empty for flat-base prorated types. */
  fyAmounts: BenefitTypeFyAmount[]
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
