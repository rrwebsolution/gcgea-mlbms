import type { PaymentMethod } from "./common"

export type InterestMethod = "Flat Interest" | "Diminishing Balance" | "Zero Interest" | "Custom"

export interface LoanType {
  id: string
  name: string
  description: string
  minAmount: number
  maxAmount: number
  defaultInterestRate: number
  interestMethod: InterestMethod
  processingFee: number
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

  eligibility: EligibilityCheckItem[]
  eligibilityOverridden: boolean
  eligibilityOverrideReason?: string

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
