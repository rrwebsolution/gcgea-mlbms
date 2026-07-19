import { z } from "zod"

export const benefitTypeSchema = z
  .object({
    name: z.string().min(1, "Benefit type name is required"),
    description: z.string(),
    defaultAmount: z.number().min(0, "Default amount must be zero or more"),
    maximumAmount: z.number().min(0, "Maximum amount must be zero or more"),
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
