import { z } from "zod"

export const roleFormSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  code: z
    .string()
    .min(1, "Role code is required")
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only"),
  description: z.string().optional(),
  status: z.enum(["Active", "Inactive"]),
})
export type RoleFormValues = z.infer<typeof roleFormSchema>
