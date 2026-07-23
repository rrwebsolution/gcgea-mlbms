import type { PaymentMethod } from "./common"

export type InterestMethod = "Flat Interest" | "Diminishing Balance" | "Zero Interest" | "Custom"

export interface LoanTypeIncomeBracket {
  id: string
  minNetPay: number
  /** null = open-ended ("and above"). */
  maxNetPay: number | null
  loanableAmount: number
}

/** Shape for creating/replacing a loan type's income brackets — no `id`, the backend full-replace-syncs these on every save. */
export interface LoanTypeIncomeBracketInput {
  minNetPay: number
  maxNetPay?: number | null
  loanableAmount: number
}

export interface LoanType {
  id: string
  name: string
  description: string
  minAmount: number
  maxAmount: number
  defaultInterestRate: number
  interestMethod: InterestMethod
  processingFee: number
  /** 1%-of-gross-style service charge, additive to processingFee — see GCGEA Resolution No. 24-2026, Table 3. */
  serviceChargePercent?: number | null
  /** When non-empty, the loanable amount is tiered by the member's net take-home pay instead of the flat min/maxAmount range. */
  incomeBrackets: LoanTypeIncomeBracket[]
  maxTermMonths: number
  requiredMembershipMonths: number
  requiredContributionMonths: number
  allowExistingActiveLoan: boolean
  status: "Active" | "Inactive"
}

export type LoanStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "For Approval"
  | "Approved"
  | "Rejected"
  | "Released"
  | "Active"
  | "Fully Paid"
  | "Cancelled"
  | "Overdue"
  | "Restructured"

export interface EligibilityCheckItem {
  label: string
  passed: boolean
  detail: string
}

export type LoanApplicationType = "new" | "reloan"

export type PreviousObligationSettlementMethod = "full_payment_required" | "deducted"

export interface LoanApplication {
  id: string
  applicationNumber: string
  applicationDate: string
  memberId: string
  memberNumber: string
  memberName: string
  officeName: string
  loanTypeId: string
  /**
   * Technically absent at the API level while a draft hasn't reached Step 2
   * yet (same for purpose/paymentMethod/firstDueDate below) — kept
   * non-optional since ~all real consumers assume a fully-specified loan;
   * draft-aware screens (CreateLoanApplicationPage resume, Draft Center)
   * apply their own `|| "—"` fallbacks instead of loosening this globally.
   */
  loanTypeName: string
  requestedAmount: number
  approvedAmount?: number
  termMonths: number
  interestRate: number
  processingFee: number
  purpose: string
  paymentMethod: PaymentMethod
  firstDueDate: string
  maturityDate?: string

  principal: number
  totalInterest: number
  netProceeds: number
  totalAmountPayable: number
  monthlyAmortization: number

  outstandingBalance: number
  status: LoanStatus
  /** Which wizard step a draft was last saved on (Create Loan Application page). */
  draftCurrentStep?: number
  assignedOfficer: string

  applicationType: LoanApplicationType
  /** Set only when applicationType is "reloan". */
  previousLoanId?: string
  previousLoanReference?: string
  rootLoanId?: string
  reloanSequence?: number
  currentNetTakeHomePay?: number

  eligibility: EligibilityCheckItem[]
  eligibilityOverridden: boolean
  eligibilityOverrideReason?: string
  /** Reloan Policy settings in effect at submission time — set only for reloans. */
  reloanPolicySnapshot?: Record<string, unknown>
  previousObligationAmount?: number
  previousObligationSettlementMethod?: PreviousObligationSettlementMethod | null
  previousObligationSettledAt?: string

  requirements: LoanRequirementItem[]

  releaseDate?: string
  releaseReferenceNumber?: string
  releaseMethod?: PaymentMethod
  actualReleasedAmount?: number
  releaseRemarks?: string

  rejectionReason?: string
  cancellationReason?: string

  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface LoanRequirementItem {
  label: string
  completed: boolean
}

export type AmortizationStatus = "Upcoming" | "Partially Paid" | "Paid" | "Overdue" | "Waived"

export interface AmortizationEntry {
  installmentNumber: number
  dueDate: string
  beginningBalance: number
  principal: number
  interest: number
  penalty: number
  amountDue: number
  amountPaid: number
  remainingBalance: number
  status: AmortizationStatus
}

export interface ApprovalHistoryEntry {
  id: string
  action: string
  performedBy: string
  performedAt: string
  remarks?: string
}
