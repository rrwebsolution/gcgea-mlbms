import { z } from "zod"

export const prorationTierSchema = z.object({
  minMonths: z.number().int().min(0, "Must be zero or more"),
  maxMonths: z.number().int().min(0).nullable().optional(),
  percentage: z.number().min(0).max(100, "Percentage must be between 0 and 100"),
})
export type ProrationTierFormValues = z.infer<typeof prorationTierSchema>

export const fyAmountSchema = z.object({
  fiscalYear: z.number().int().nullable().optional(),
  baseAmount: z.number().min(0, "Base amount must be zero or more"),
})
export type FyAmountFormValues = z.infer<typeof fyAmountSchema>

export const benefitTypeSchema = z
  .object({
    name: z.string().min(1, "Benefit type name is required"),
    description: z.string(),
    defaultAmount: z.number().min(0, "Default amount must be zero or more"),
    maximumAmount: z.number().min(0, "Maximum amount must be zero or more"),
    prorationBasis: z.enum(["dues", "pabaon"]).nullable().optional(),
    prorationTiers: z.array(prorationTierSchema),
    fyAmounts: z.array(fyAmountSchema),
    eligibilityRequirements: z.string(),
    requiredMembershipMonths: z.number().int().min(0, "Must be zero or more"),
    frequencyLimit: z.string(),
    requiredDocuments: z.array(z.string()),
    approvalRequired: z.boolean(),
    status: z.enum(["Active", "Inactive"]),
  })
  .refine((data) => data.maximumAmount >= data.defaultAmount, {
    message: "Maximum amount must be greater than or equal to default amount",
    path: ["maximumAmount"],
  })
export type BenefitTypeFormValues = z.infer<typeof benefitTypeSchema>
