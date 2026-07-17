import type { ReactNode } from "react"
import { ShieldCheck } from "lucide-react"
import { ORGANIZATION } from "@/constants/organization"
import { LoginBackground } from "@/features/auth/components/LoginBackground"
import { ThemeSelector } from "@/components/shared/ThemeSelector"

interface AuthLayoutProps {
  title: string
  description?: string
  children: ReactNode
  /** "hero" adds the full-screen branded background with the logo on the left and a glass card on the right (login page only). */
  variant?: "plain" | "hero"
}

export function AuthLayout({ title, description, children, variant = "plain" }: AuthLayoutProps) {
  const isHero = variant === "hero"

  if (!isHero) {
    return (
      <div className="relative flex min-h-svh flex-col bg-muted/40">
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <ShieldCheck className="size-7" />
              </span>
              <div>
                <p className="font-heading text-lg font-semibold text-foreground">{ORGANIZATION.name}</p>
                <p className="text-sm text-muted-foreground">{ORGANIZATION.systemName}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-5 space-y-1 text-center">
                <h1 className="font-heading text-lg font-semibold text-foreground">{title}</h1>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
              </div>
              {children}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              This system is for authorized {ORGANIZATION.acronym} officers and staff only. Unauthorized access is
              strictly prohibited.
            </p>
          </div>
        </div>
        <footer className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {ORGANIZATION.name}. All rights reserved.
        </footer>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-svh flex-col text-white">
      <LoginBackground />

      <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
        <ThemeSelector />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-10 lg:flex-row lg:items-center lg:justify-center lg:gap-16 lg:px-16 xl:gap-24 xl:px-24">
        {/* Left side — logo and organization identity */}
        <div className="flex max-w-md flex-col items-center gap-4 text-center lg:flex-1 lg:items-start lg:text-left">
          <img src={ORGANIZATION.logoPath} alt={`${ORGANIZATION.acronym} logo`} className="size-28 drop-shadow-lg lg:size-36" />
          <div>
            <p className="font-heading text-2xl font-semibold text-white lg:text-3xl">{ORGANIZATION.name}</p>
            <p className="mt-1 text-sm text-white/70 lg:text-base">{ORGANIZATION.systemName}</p>
            <p className="mt-2 text-xs font-medium tracking-wide text-gold/90 uppercase lg:text-sm">{ORGANIZATION.acronym}-MLBMS</p>
          </div>
        </div>

        {/* Right side — glass sign-in card */}
        <div className="w-full max-w-sm space-y-4 lg:shrink-0">
          <div className="rounded-2xl border border-white/30 bg-white/35 p-6 text-foreground shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-black/35 dark:text-white">
            <div className="mb-5 space-y-1 text-center">
              <h1 className="font-heading text-lg font-semibold text-foreground dark:text-white">{title}</h1>
              {description && <p className="text-sm text-foreground/70 dark:text-white/75">{description}</p>}
            </div>
            {children}
          </div>
          <p className="text-center text-xs text-white/60">
            This system is for authorized {ORGANIZATION.acronym} officers and staff only. Unauthorized access is
            strictly prohibited.
          </p>
        </div>
      </div>

      <footer className="relative border-t border-white/15 px-4 py-3 text-center text-xs text-white/50">
        © {new Date().getFullYear()} {ORGANIZATION.name}. All rights reserved.
      </footer>
    </div>
  )
}
