import type { PaymentMethod } from "./common"

export type ContributionStatus = "Posted" | "Voided"

export interface Contribution {
  id: string
  referenceNumber: string
  memberId: string
  memberNumber: string
  memberName: string
  officeName: string
  contributionPeriod: string
  amount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  payrollReference?: string
  encodedBy: string
  status: ContributionStatus
  voidReason?: string
  createdAt: string
}
