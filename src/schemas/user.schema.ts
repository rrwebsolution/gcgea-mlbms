import { z } from "zod"

const phRegex = /^09\d{9}$/

export const userFormSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .regex(/^[a-z0-9._]+$/, "Lowercase letters, numbers, periods, and underscores only"),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    contactNumber: z.string().optional().refine((v) => !v || phRegex.test(v.replace(/\s/g, "")), "Enter a valid Philippine mobile number"),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    roleId: z.string().min(1, "Primary role is required"),
    additionalRoleIds: z.array(z.string()),
    status: z.enum(["Active", "Inactive", "Disabled"]),
    requirePasswordChange: z.boolean(),
    remarks: z.string().optional(),
  })
  .refine((data) => !data.password || data.password.length >= 8, {
    message: "Password must be at least 8 characters",
    path: ["password"],
  })
  .refine((data) => !data.password || data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
export type UserFormValues = z.infer<typeof userFormSchema>
