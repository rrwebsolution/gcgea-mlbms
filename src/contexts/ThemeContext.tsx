import * as React from "react"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { applyAppearanceTheme, getAppearance } from "@/services/settings.service"

export type ThemePreference = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

interface ThemeContextValue {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemePreference) => void
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.toggle("dark", resolved === "dark")
  root.setAttribute("data-theme", resolved)
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#0F172A" : "#F8FAFC")
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemePreference>(() => readStorage<ThemePreference>(STORAGE_KEYS.themePreference, "dark"))
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>(() => (theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme))

  React.useEffect(() => {
    const resolved: ResolvedTheme = theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme
    setResolvedTheme(resolved)
    applyTheme(resolved)
    applyAppearanceTheme(getAppearance())
  }, [theme])

  React.useEffect(() => {
    if (theme !== "system") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    function handleChange(e: MediaQueryListEvent) {
      const resolved: ResolvedTheme = e.matches ? "dark" : "light"
      setResolvedTheme(resolved)
      applyTheme(resolved)
    }
    media.addEventListener("change", handleChange)
    return () => media.removeEventListener("change", handleChange)
  }, [theme])

  const setTheme = React.useCallback((next: ThemePreference) => {
    setThemeState(next)
    writeStorage(STORAGE_KEYS.themePreference, next)
  }, [])

  const value = React.useMemo<ThemeContextValue>(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider")
  return ctx
}
