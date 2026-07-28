import type { PaymentMethod } from "./common"

export type ContributionStatus = "Posted" | "Voided"
export type ContributionType = "Monthly Dues" | "Cash Pabaon" | "Savings"

export interface ContributionFundAllocation {
  fundId: string
  fundName: string
  allocatedAmount: number
}

export interface ContributionFund {
  id: string
  fundName: string
  allocationType: "Percentage" | "Fixed Amount"
  allocationValue: number
  description?: string
  status: "Enabled" | "Disabled"
  displayOrder: number
}

export interface Contribution {
  id: string
  referenceNumber: string
  memberId: string
  memberNumber: string
  memberName: string
  officeName: string
  contributionPeriod: string
  contributionType: ContributionType
  amount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  officialReceiptNumber?: string
  payrollReference?: string
  remarks?: string
  encodedBy: string
  status: ContributionStatus
  fundAllocations?: ContributionFundAllocation[]
  voidReason?: string
  voidedBy?: string
  voidedAt?: string
  createdAt: string
  updatedAt?: string
}
