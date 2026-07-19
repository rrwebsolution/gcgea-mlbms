import { z } from "zod"

export const loanTypeSchema = z
  .object({
    name: z.string().min(1, "Loan type name is required"),
    description: z.string(),
    minAmount: z.number().min(0, "Minimum amount must be zero or more"),
    maxAmount: z.number().min(0, "Maximum amount must be zero or more"),
    defaultInterestRate: z.number().min(0, "Interest rate must be zero or more"),
    interestMethod: z.enum(["Flat Interest", "Diminishing Balance", "Zero Interest", "Custom"]),
    processingFee: z.number().min(0, "Processing fee must be zero or more"),
    maxTermMonths: z.number().int().min(1, "Max term must be at least 1 month"),
    requiredMembershipMonths: z.number().int().min(0, "Must be zero or more"),
    requiredContributionMonths: z.number().int().min(0, "Must be zero or more"),
    allowExistingActiveLoan: z.boolean(),
    status: z.enum(["Active", "Inactive"]),
  })
  .refine((data) => data.maxAmount >= data.minAmount, {
    message: "Maximum amount must be greater than or equal to minimum amount",
    path: ["maxAmount"],
  })
export type LoanTypeFormValues = z.infer<typeof loanTypeSchema>
