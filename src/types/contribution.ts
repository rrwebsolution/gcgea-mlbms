import type { PaymentMethod } from "./common"

export type ContributionStatus = "Posted" | "Voided"
export type ContributionType = "Monthly Dues" | "Cash Pabaon" | "Savings"

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
  voidReason?: string
  voidedBy?: string
  voidedAt?: string
  createdAt: string
  updatedAt?: string
}
