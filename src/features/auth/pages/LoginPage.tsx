import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useLocation, useNavigate } from "react-router-dom"
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react"
import { toast } from "sonner"
import { AuthLayout } from "@/features/auth/components/AuthLayout"
import { loginSchema, type LoginFormValues } from "@/schemas/auth.schema"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Link } from "react-router-dom"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { AppLoader } from "@/components/shared/AppLoader"

const POST_LOGIN_LOADER_MS = 2000

export default function LoginPage() {
  const { login, isLoggingIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [showPostLoginLoader, setShowPostLoginLoader] = React.useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { usernameOrEmail: "", password: "", rememberMe: false },
  })

  async function onSubmit(values: LoginFormValues) {
    setFormError(null)
    try {
      await login(values)
      toast.success("Logged in successfully.")
      setShowPostLoginLoader(true)
      setTimeout(() => {
        const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? "/dashboard"
        navigate(redirectTo, { replace: true })
      }, POST_LOGIN_LOADER_MS)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to log in. Please try again.")
    }
  }

  return (
    <AuthLayout variant="hero" title="Sign In" description="Enter your credentials to access your management dashboard.">
      <AppLoader isLoading={showPostLoginLoader} />
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && <AlertBanner tone="danger" title="Login failed" description={formError} />}

        <div className="space-y-2">
          <Label htmlFor="usernameOrEmail" className="text-xs font-semibold tracking-wide text-foreground/85 dark:text-white/85 uppercase">
            Username or Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="usernameOrEmail"
            autoComplete="username"
            placeholder="e.g. jdelacruz or you@gcgea.gingoog.gov.ph"
            aria-invalid={!!errors.usernameOrEmail}
            className="h-10 transition-all duration-200 focus-visible:ring-primary/50"
            {...register("usernameOrEmail")}
          />
          {errors.usernameOrEmail && <p className="text-xs font-medium text-destructive">{errors.usernameOrEmail.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-semibold tracking-wide text-foreground/85 dark:text-white/85 uppercase">
              Password <span className="text-destructive">*</span>
            </Label>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-invalid={!!errors.password}
              className="h-10 pr-10 transition-all duration-200 focus-visible:ring-primary/50"
              {...register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {errors.password && <p className="text-xs font-medium text-destructive">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex select-none items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <Checkbox 
              checked={watch("rememberMe")} 
              onCheckedChange={(v) => setValue("rememberMe", !!v)} 
              className="border-muted-foreground/40 data-[state=checked]:bg-primary"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button 
          type="submit" 
          className="w-full h-10 font-medium transition-all shadow-md active:scale-[0.98] mt-2" 
          disabled={isLoggingIn}
          aria-busy={isLoggingIn}
        >
          {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
          {isLoggingIn ? "Signing in…" : "Sign In"}
        </Button>
      </form>
    </AuthLayout>
  )
}
