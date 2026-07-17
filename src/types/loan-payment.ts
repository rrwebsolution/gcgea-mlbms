import type { PaymentMethod } from "./common"

export type LoanPaymentStatus = "Posted" | "Voided"

export interface LoanPayment {
  id: string
  paymentReferenceNumber: string
  memberId: string
  memberName: string
  loanApplicationId: string
  loanApplicationNumber: string
  paymentDate: string
  amountPaid: number
  principalPortion: number
  interestPortion: number
  penalty: number
  paymentMethod: PaymentMethod
  payrollReference?: string
  officialReceiptNumber: string
  receivedBy: string
  remarks?: string
  status: LoanPaymentStatus
  voidReason?: string
  createdAt: string
}
