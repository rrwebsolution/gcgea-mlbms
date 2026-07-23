import { z } from "zod"

export const incomeBracketSchema = z
  .object({
    minNetPay: z.number().min(0, "Must be zero or more"),
    maxNetPay: z.number().min(0).nullable().optional(),
    loanableAmount: z.number().min(0, "Loanable amount must be zero or more"),
  })
  .superRefine((bracket, ctx) => {
    if (bracket.maxNetPay != null && bracket.maxNetPay < bracket.minNetPay) {
      ctx.addIssue({
        code: "custom",
        path: ["maxNetPay"],
        message: `Maximum net pay must be at least ${bracket.minNetPay.toLocaleString()}. Leave it blank for no upper limit.`,
      })
    }
  })
export type IncomeBracketFormValues = z.infer<typeof incomeBracketSchema>

export const loanTypeSchema = z
  .object({
    name: z.string().min(1, "Loan type name is required"),
    description: z.string(),
    minAmount: z.number().min(0, "Minimum amount must be zero or more"),
    maxAmount: z.number().min(0, "Maximum amount must be zero or more"),
    defaultInterestRate: z.number().min(0, "Interest rate must be zero or more"),
    interestMethod: z.enum(["Flat Interest", "Diminishing Balance", "Zero Interest", "Custom"]),
    processingFee: z.number().min(0, "Processing fee must be zero or more"),
    serviceChargePercent: z.number().min(0).max(100).nullable().optional(),
    incomeBrackets: z.array(incomeBracketSchema),
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
