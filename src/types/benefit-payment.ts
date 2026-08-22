export type BenefitPaymentStatus = "Posted" | "Voided"

export interface BenefitPayment {
  id: string
  paymentReferenceNumber: string
  benefitApplicationId: string
  applicationNumber: string
  memberId: string
  memberName: string
  paymentDate: string
  amountPaid: number
  remarks?: string
  status: BenefitPaymentStatus
  voidReason?: string
  createdAt: string
}
