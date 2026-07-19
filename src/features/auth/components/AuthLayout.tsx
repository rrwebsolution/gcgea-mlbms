import type { ReactNode } from "react"
import { ShieldCheck } from "lucide-react"
import { ORGANIZATION } from "@/constants/organization"
import { AppBackground } from "@/components/shared/AppBackground"
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
    <div className="relative flex min-h-svh flex-col text-foreground dark:text-white">
      <AppBackground intensity="vivid" position="absolute" />

      <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
        <ThemeSelector />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-10 lg:flex-row lg:items-center lg:justify-center lg:gap-16 lg:px-16 xl:gap-24 xl:px-24">
        {/* Left side — logo and organization identity */}
        <div className="flex max-w-md flex-col items-center gap-5 text-center lg:flex-1 lg:items-start lg:text-left">
          <div className="relative group">
            {/* Subtle glow behind the logo */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 opacity-20 blur-lg transition duration-1000 group-hover:opacity-30" />
            <img 
              src={ORGANIZATION.logoPath} 
              alt={`${ORGANIZATION.acronym} logo`} 
              className="relative size-28 drop-shadow-xl transition-transform duration-300 hover:scale-105 lg:size-36" 
            />
          </div>
          <div>
            <p className="font-heading text-2xl font-bold text-foreground dark:text-white tracking-tight drop-shadow-md lg:text-3xl leading-tight">
              {ORGANIZATION.name}
            </p>
            <p className="mt-2 text-sm text-muted-foreground dark:text-white/80 max-w-sm drop-shadow lg:text-base">
              {ORGANIZATION.systemName}
            </p>
            <div className="inline-block mt-4">
              <span className="rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-amber-400 border border-amber-500/20 uppercase lg:text-sm">
                {ORGANIZATION.acronym}-MLBMS
              </span>
            </div>
          </div>
        </div>

        {/* Right side — elevated frosted glass sign-in card */}
        <div className="w-full max-w-md space-y-4 lg:shrink-0">
          <div className="rounded-2xl border border-border bg-white/70 p-6 text-foreground shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/50 dark:text-white">
            <div className="mb-6 space-y-1 text-center">
              <h1 className="font-heading text-xl font-bold tracking-tight text-foreground dark:text-white">{title}</h1>
              {description && <p className="text-sm text-muted-foreground dark:text-white/70">{description}</p>}
            </div>
            {children}
          </div>
          <p className="text-center text-xs text-muted-foreground dark:text-white/60 px-6">
            This system is for authorized {ORGANIZATION.acronym} officers and staff only. Unauthorized access is
            strictly prohibited.
          </p>
        </div>
      </div>

      <footer className="relative border-t border-border dark:border-white/10 px-4 py-3 text-center text-xs text-muted-foreground dark:text-white/40">
        © {new Date().getFullYear()} {ORGANIZATION.name}. All rights reserved.
      </footer>
    </div>
  )
}