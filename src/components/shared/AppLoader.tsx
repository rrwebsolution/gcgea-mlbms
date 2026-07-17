import * as React from "react"
import { createPortal } from "react-dom"
import { ORGANIZATION } from "@/constants/organization"
import { cn } from "@/lib/utils"

const FADE_MS = 400

const DEFAULT_MESSAGES = [
  "Initializing System...",
  "Loading User Permissions...",
  "Loading Dashboard...",
  "Preparing Workspace...",
  "Almost Ready...",
] as const

interface AppLoaderProps {
  /** Whether the loader should be shown. Toggling this drives the fade in/out. */
  isLoading: boolean
  /** Optional controlled progress (0-100). Omit to auto-animate. */
  progress?: number
  /** Optional custom message. Omit to cycle through the default status messages. */
  message?: string
}

/**
 * Full-screen application loader used on startup, post-login, session restore,
 * and while permissions/settings load. Stays mounted briefly after `isLoading`
 * goes false so the fade-out transition can play before unmounting.
 */
export function AppLoader({ isLoading, progress, message }: AppLoaderProps) {
  const [mounted, setMounted] = React.useState(isLoading)
  const [visible, setVisible] = React.useState(false)
  const [messageIndex, setMessageIndex] = React.useState(0)
  const [autoProgress, setAutoProgress] = React.useState(0)

  React.useEffect(() => {
    if (isLoading) {
      setMounted(true)
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    }

    if (progress === undefined) setAutoProgress(100)
    const fadeStart = setTimeout(() => setVisible(false), 150)
    const unmount = setTimeout(() => setMounted(false), 150 + FADE_MS)
    return () => {
      clearTimeout(fadeStart)
      clearTimeout(unmount)
    }
  }, [isLoading, progress])

  React.useEffect(() => {
    if (!isLoading || message) return
    setMessageIndex(0)
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % DEFAULT_MESSAGES.length)
    }, 1500)
    return () => clearInterval(interval)
  }, [isLoading, message])

  React.useEffect(() => {
    if (!isLoading || progress !== undefined) return
    setAutoProgress(0)
    const interval = setInterval(() => {
      setAutoProgress((p) => (p >= 92 ? p : p + Math.random() * 8 + 3))
    }, 350)
    return () => clearInterval(interval)
  }, [isLoading, progress])

  React.useEffect(() => {
    if (!mounted) return
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [mounted])

  if (!mounted) return null

  const displayMessage = message ?? DEFAULT_MESSAGES[messageIndex]
  const displayProgress = Math.min(100, Math.max(0, progress ?? autoProgress))

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden",
        "bg-[#F8FAFC] dark:bg-[#0F172A]",
        "transition-opacity ease-out motion-reduce:transition-none",
        visible ? "opacity-100" : "opacity-0"
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="flex max-w-xs flex-col items-center px-6 text-center">
        <img
          src={ORGANIZATION.logoPath}
          alt={`${ORGANIZATION.acronym} logo`}
          className="size-20 animate-[app-loader-logo-in_0.6s_ease-out] motion-reduce:animate-none"
        />

        <h1 className="mt-5 font-heading text-lg leading-snug font-semibold text-[#1F2937] sm:text-xl dark:text-white">
          {ORGANIZATION.acronym} Membership,
          <br />
          Loan and Benefits
          <br />
          Management System
        </h1>

        <div className="relative mt-8 flex size-16 items-center justify-center" aria-hidden="true">
          <div className="absolute inset-0 rounded-full border-4 border-[#E2E8F0] dark:border-[#334155]" />
          <div
            className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#1E3A8A] motion-reduce:animate-none dark:border-t-[#60A5FA]"
            style={{ animationDuration: "1s", animationTimingFunction: "linear" }}
          />
        </div>

        <p
          key={displayMessage}
          className="mt-5 min-h-5 animate-[app-loader-message-fade_0.4s_ease-out] text-sm font-medium text-[#1F2937]/75 motion-reduce:animate-none dark:text-white/75"
        >
          {displayMessage}
        </p>

        <div className="mt-4 h-1.5 w-56 overflow-hidden rounded-full bg-[#E2E8F0] sm:w-64 dark:bg-[#334155]">
          <div
            className="h-full rounded-full bg-[#1E3A8A] transition-[width] duration-500 ease-out motion-reduce:transition-none dark:bg-[#60A5FA]"
            style={{ width: `${displayProgress}%` }}
          />
        </div>
      </div>
    </div>,
    document.body
  )
}
