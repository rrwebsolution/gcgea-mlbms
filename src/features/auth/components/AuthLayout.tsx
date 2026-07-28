import type { ReactNode } from "react"
import { ShieldCheck } from "lucide-react"
import { ORGANIZATION } from "@/constants/organization"
import { AppBackground } from "@/components/shared/AppBackground"
import { ThemeSelector } from "@/components/shared/ThemeSelector"
import { IndeterminateBar } from "@/components/shared/loaders/IndeterminateBar"
import { useGeneralSettings } from "@/hooks/useGeneralSettings"
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings"

interface AuthLayoutProps {
  title: string
  description?: string
  children: ReactNode
  /** "hero" adds the full-screen branded background with the logo on the left and a glass card on the right (login page only). */
  variant?: "plain" | "hero"
  isLoading?: boolean
}

export function AuthLayout({ title, description, children, variant = "plain", isLoading = false }: AuthLayoutProps) {
  const isHero = variant === "hero"
  const general = useGeneralSettings()
  const organization = useOrganizationSettings()

  if (!isHero) {
    return (
      <div className="relative flex min-h-svh flex-col bg-muted/30 text-foreground">
        <AppBackground intensity="subtle" position="absolute" />
        
        <div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
          <ThemeSelector />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-12 z-10">
          <div className="w-full max-w-md space-y-6">
            {/* Organization Header Badge */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="relative flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md ring-4 ring-primary/10">
                <ShieldCheck className="size-7" />
              </div>
              <div>
                <p className="font-heading text-xl font-bold tracking-tight text-foreground">{organization.organizationName}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">{general.systemName}</p>
              </div>
            </div>

            {/* Plain Form Glass Card */}
            <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-7 shadow-lg shadow-black/5 backdrop-blur-md">
              {isLoading && <IndeterminateBar className="absolute inset-x-0 top-0 rounded-none" size="sm" />}
              <div className="mb-6 space-y-1.5 text-center">
                <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">{title}</h1>
                {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}
              </div>
              {children}
            </div>

            <p className="text-center text-[11px] leading-normal text-muted-foreground/80 px-4">
              This system is for authorized {organization.acronym} personnel only. Unauthorized access attempts are monitored and recorded.
            </p>
          </div>
        </div>

        <footer className="relative border-t border-border/40 px-4 py-3.5 text-center text-xs text-muted-foreground/70 z-10">
          © {new Date().getFullYear()} {ORGANIZATION.name}. All rights reserved.
        </footer>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-svh flex-col text-foreground dark:text-white overflow-hidden">
      <AppBackground intensity="vivid" position="absolute" />

      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
        <ThemeSelector />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-12 px-6 py-12 lg:flex-row lg:items-center lg:justify-center lg:gap-20 lg:px-16 xl:gap-28 xl:px-24">
        
        {/* Left side — Logo & Organization Identity */}
        <div className="flex max-w-lg flex-col items-center gap-6 text-center lg:flex-1 lg:items-start lg:text-left z-10">
          <div className="relative group">
            {/* Glowing ambient ring behind logo */}
            <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-primary/40 via-amber-500/30 to-yellow-500/40 opacity-30 blur-xl transition-all duration-1000 group-hover:opacity-50 group-hover:scale-110" />
            <img 
              src={ORGANIZATION.logoPath} 
              alt={`${organization.acronym} logo`} 
              className="relative size-28 drop-shadow-2xl transition-transform duration-500 group-hover:scale-105 lg:size-36 object-contain" 
            />
          </div>

          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-extrabold text-foreground dark:text-white tracking-tight leading-tight lg:text-4xl drop-shadow-xs">
              {organization.organizationName}
            </h1>
            <p className="text-sm font-medium text-muted-foreground dark:text-white/80 max-w-md leading-relaxed lg:text-base">
              {general.systemName}
            </p>

            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 dark:bg-amber-500/10 px-4 py-1.5 text-xs font-bold tracking-wider text-primary dark:text-amber-400 border border-primary/20 dark:border-amber-500/20 uppercase">
                <span className="size-2 rounded-full bg-primary dark:bg-amber-400 animate-pulse" />
                {general.systemShortName}
              </span>
            </div>
          </div>
        </div>

        {/* Right side — Elevated Frosted Glass Card */}
        <div className="w-full max-w-md space-y-4 lg:shrink-0 z-10">
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-background/85 p-8 text-foreground shadow-2xl shadow-black/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white">
            {isLoading && <IndeterminateBar className="absolute inset-x-0 top-0 rounded-none" size="sm" />}
            
            <div className="mb-6 space-y-1.5 text-center">
              <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground dark:text-white">{title}</h2>
              {description && <p className="text-xs text-muted-foreground dark:text-white/70 leading-relaxed">{description}</p>}
            </div>

            {children}
          </div>

          <p className="text-center text-[11px] leading-normal text-muted-foreground dark:text-white/60 px-6">
            This system is for authorized {organization.acronym} officers and staff only. Unauthorized access is strictly prohibited.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-border/40 dark:border-white/10 px-4 py-3.5 text-center text-xs text-muted-foreground dark:text-white/50 z-10">
        © {new Date().getFullYear()} {ORGANIZATION.name}. All rights reserved.
      </footer>
    </div>
  )
}
