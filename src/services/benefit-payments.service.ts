import type { BenefitPayment } from "@/types"
import { api } from "@/lib/api"

export interface CreateBenefitPaymentInput {
  benefitApplicationId: string
  memberId: string
  paymentDate: string
  amountPaid: number
  remarks?: string
}

export async function createBenefitPayment(input: CreateBenefitPaymentInput): Promise<BenefitPayment> {
  const { data } = await api.post<BenefitPayment>("/benefit-payments", input)
  return data
}
