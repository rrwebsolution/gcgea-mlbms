import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "react-router-dom"
import { Loader2, MailCheck, Send } from "lucide-react"
import { AuthLayout } from "@/features/auth/components/AuthLayout"
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/schemas/auth.schema"
import * as authService from "@/services/auth.service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertBanner } from "@/components/shared/AlertBanner"

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [isSent, setIsSent] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: ForgotPasswordFormValues) {
    setFormError(null)
    setIsSubmitting(true)
    try {
      await authService.requestPasswordReset(values.email)
      setIsSent(true)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to process your request.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSent) {
    return (
      <AuthLayout title="Check Your Email">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
            <MailCheck className="size-6" />
          </div>
          <p className="text-sm text-muted-foreground">
            If an account exists with that email address, we've sent instructions to reset your password.
          </p>
          <Button className="w-full" render={<Link to="/login" />}>
            Return to Login
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Forgot Password" description="Enter your registered email address and we'll send you reset instructions.">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && <AlertBanner tone="danger" title="Request failed" description={formError} />}
        <div className="space-y-1.5">
          <Label htmlFor="email">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@gcgea.gingoog.gov.ph" aria-invalid={!!errors.email} {...register("email")} />
          {errors.email && <p className="text-xs font-medium text-destructive">{errors.email.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
          {isSubmitting ? "Sending…" : "Send Reset Instructions"}
        </Button>
        <Button variant="ghost" className="w-full" render={<Link to="/login" />}>
          Back to Login
        </Button>
      </form>
    </AuthLayout>
  )
}
