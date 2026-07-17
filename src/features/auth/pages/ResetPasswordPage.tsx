import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate, useSearchParams } from "react-router-dom"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { AuthLayout } from "@/features/auth/components/AuthLayout"
import { resetPasswordSchema, type ResetPasswordFormValues } from "@/schemas/auth.schema"
import * as authService from "@/services/auth.service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertBanner } from "@/components/shared/AlertBanner"

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  async function onSubmit(values: ResetPasswordFormValues) {
    setFormError(null)
    setIsSubmitting(true)
    try {
      await authService.resetPassword(searchParams.get("token") ?? "", values.password)
      toast.success("Password reset successfully. You may now log in.")
      navigate("/login", { replace: true })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to reset your password.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Reset Password" description="Choose a new password for your account.">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && <AlertBanner tone="danger" title="Reset failed" description={formError} />}
        <div className="space-y-1.5">
          <Label htmlFor="password">
            New Password <span className="text-destructive">*</span>
          </Label>
          <Input id="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" aria-invalid={!!errors.password} {...register("password")} />
          {errors.password && <p className="text-xs font-medium text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">
            Confirm New Password <span className="text-destructive">*</span>
          </Label>
          <Input id="confirmPassword" type="password" autoComplete="new-password" placeholder="Re-enter new password" aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
          {errors.confirmPassword && <p className="text-xs font-medium text-destructive">{errors.confirmPassword.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
          {isSubmitting ? "Resetting…" : "Reset Password"}
        </Button>
      </form>
    </AuthLayout>
  )
}
