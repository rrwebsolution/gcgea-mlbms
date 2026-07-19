import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { KeyRound, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { changePasswordSchema, type ChangePasswordFormValues } from "@/schemas/auth.schema"
import * as authService from "@/services/auth.service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertBanner } from "@/components/shared/AlertBanner"

export default function ChangePasswordPage() {
  const [formError, setFormError] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  async function onSubmit(values: ChangePasswordFormValues) {
    setFormError(null)
    try {
      await authService.changePassword(values.currentPassword, values.newPassword, values.confirmPassword)
      toast.success("Password updated successfully.")
      reset()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to update your password.")
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader title="Change Password" description="Update your account password. You will remain logged in on this device." />
      <FormSection title="Password Details" description="Choose a strong password that you have not used before.">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {formError && <AlertBanner tone="danger" title="Update failed" description={formError} />}
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">
              Current Password <span className="text-destructive">*</span>
            </Label>
            <Input id="currentPassword" type="password" autoComplete="current-password" placeholder="Enter your current password" aria-invalid={!!errors.currentPassword} {...register("currentPassword")} />
            {errors.currentPassword && <p className="text-xs font-medium text-destructive">{errors.currentPassword.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">
              New Password <span className="text-destructive">*</span>
            </Label>
            <Input id="newPassword" type="password" autoComplete="new-password" placeholder="At least 8 characters" aria-invalid={!!errors.newPassword} {...register("newPassword")} />
            {errors.newPassword && <p className="text-xs font-medium text-destructive">{errors.newPassword.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">
              Confirm New Password <span className="text-destructive">*</span>
            </Label>
            <Input id="confirmPassword" type="password" autoComplete="new-password" placeholder="Re-enter new password" aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
            {errors.confirmPassword && <p className="text-xs font-medium text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <KeyRound />}
              {isSubmitting ? "Updating…" : "Update Password"}
            </Button>
          </div>
        </form>
      </FormSection>
    </div>
  )
}
