import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate, Link } from "react-router-dom"
import { Eye, EyeOff, Loader2, LogIn, Lock, User } from "lucide-react"
import { toast } from "sonner"
import { AuthLayout } from "@/features/auth/components/AuthLayout"
import { loginSchema, type LoginFormValues } from "@/schemas/auth.schema"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { AppLoader } from "@/components/shared/AppLoader"
import { getLandingPage } from "@/utils/landing-page"
import { cn } from "@/lib/utils"
import type { ApiValidationError } from "@/lib/api"

const POST_LOGIN_LOADER_MS = 2000

export default function LoginPage() {
  const { login, isLoggingIn } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [showPostLoginLoader, setShowPostLoginLoader] = React.useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { usernameOrEmail: "", password: "", rememberMe: false },
  })

  async function onSubmit(values: LoginFormValues) {
    setFormError(null)
    clearErrors()
    try {
      const authenticatedUser = await login(values)
      toast.success("Logged in successfully.")
      setShowPostLoginLoader(true)
      setTimeout(() => {
        navigate(
          authenticatedUser.requirePasswordChange
            ? "/change-password"
            : getLandingPage(authenticatedUser.permissions),
          { replace: true }
        )
      }, POST_LOGIN_LOADER_MS)
    } catch (err) {
      const validationError = err as ApiValidationError
      const usernameError = validationError.errors?.usernameOrEmail?.[0]
      const passwordError = validationError.errors?.password?.[0]

      if (usernameError) setError("usernameOrEmail", { type: "server", message: usernameError })
      if (passwordError) setError("password", { type: "server", message: passwordError })

      if (!usernameError && !passwordError) {
        setFormError(err instanceof Error ? err.message : "Unable to log in. Please try again.")
      }
    }
  }

  const isBusy = isLoggingIn || showPostLoginLoader

  return (
    <AuthLayout
      variant="hero"
      title="Sign In"
      description="Enter your credentials to access your management dashboard."
      isLoading={isBusy}
    >
      <AppLoader isLoading={showPostLoginLoader} />

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && (
          <AlertBanner 
            tone="danger" 
            title="Login failed" 
            description={formError} 
            className="rounded-xl animate-in fade-in duration-200" 
          />
        )}

        {/* Username / Email Field */}
        <div className="space-y-1.5">
          <Label 
            htmlFor="usernameOrEmail" 
            className={cn(
              "text-[11px] font-bold uppercase tracking-wider text-muted-foreground",
              errors.usernameOrEmail && "text-destructive"
            )}
          >
            Username or Email <span className="text-destructive font-bold">*</span>
          </Label>
          <div className="relative">
            <User className={cn(
              "absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70 pointer-events-none",
              errors.usernameOrEmail && "text-destructive"
            )} />
            <Input
              id="usernameOrEmail"
              autoComplete="username"
              placeholder="e.g. jdelacruz or you@gcgea.gingoog.gov.ph"
              aria-invalid={!!errors.usernameOrEmail}
              className="h-11 pl-10 pr-4 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/30"
              {...register("usernameOrEmail")}
            />
          </div>
          {errors.usernameOrEmail && (
            <p className="text-xs font-medium text-destructive mt-1">{errors.usernameOrEmail.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label 
              htmlFor="password" 
            className={cn(
              "text-[11px] font-bold uppercase tracking-wider text-muted-foreground",
              errors.password && "text-destructive"
            )}
            >
              Password <span className="text-destructive font-bold">*</span>
            </Label>
          </div>
          <div className="relative">
            <Lock className={cn(
              "absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70 pointer-events-none",
              errors.password && "text-destructive"
            )} />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-invalid={!!errors.password}
              className="h-11 pl-10 pr-10 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/30"
              {...register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-9 text-muted-foreground/80 hover:bg-transparent hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
          {errors.password && (
            <p className="text-xs font-medium text-destructive mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex select-none items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <Checkbox 
              checked={watch("rememberMe")} 
              onCheckedChange={(v) => setValue("rememberMe", !!v)} 
              className="rounded-md border-border/80 data-[state=checked]:bg-primary"
            />
            Remember me
          </label>
          <Link 
            to="/forgot-password" 
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full h-11 rounded-xl font-semibold text-sm transition-all duration-300 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] mt-2 gap-2" 
          disabled={isBusy}
          aria-busy={isBusy}
        >
          {isBusy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogIn className="size-4" />
          )}
          {isBusy ? "Authenticating…" : "Sign In to Dashboard"}
        </Button>
      </form>
    </AuthLayout>
  )
}
