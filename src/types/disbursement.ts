import type { PaymentMethod } from "./common"

export type DisbursementStatus = "Draft" | "For Approval" | "Approved" | "Paid" | "Rejected" | "Voided"

export interface Disbursement {
  id: string
  referenceNumber: string
  annualBudgetId: string
  fiscalYear: number
  annualBudgetItemId: string
  accountTitle: string
  disbursementDate: string
  payee: string
  amount: number
  paymentMethod: Exclude<PaymentMethod, "Payroll Deduction">
  paymentReference?: string
  remarks?: string
  status: DisbursementStatus
  preparedBy?: string
  approvedBy?: string
  approvedAt?: string
  paidBy?: string
  paidAt?: string
  rejectionReason?: string
  voidReason?: string
  currentStageLabel?: string
  createdAt: string
}
