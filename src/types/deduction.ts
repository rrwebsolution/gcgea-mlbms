export interface Deduction {
  id: string
  referenceNumber: string
  memberId: string
  memberNumber?: string
  memberName?: string
  deductionTypeId: string
  deductionTypeName?: string
  deductionTypeCode?: string
  period: string
  amount: number
  paymentDate: string
  payrollReference?: string
  remarks?: string
  encodedBy: string
  status: "Posted" | "Voided"
  voidReason?: string
  voidedBy?: string
  voidedAt?: string
  createdAt?: string
}
