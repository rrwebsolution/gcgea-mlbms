import { z } from "zod"

export const officeSchema = z.object({
  code: z.string().min(1, "Office code is required").max(20, "Office code is too long"),
  name: z.string().min(1, "Office name is required"),
  description: z.string().optional(),
  status: z.enum(["Active", "Inactive"]),
})
export type OfficeFormValues = z.infer<typeof officeSchema>
