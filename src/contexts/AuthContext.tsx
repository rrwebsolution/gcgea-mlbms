import * as React from "react"
import type { AuthUser, LoginCredentials, PermissionCode } from "@/types"
import * as authService from "@/services/auth.service"
import { warmSyncCaches } from "@/lib/warm-caches"

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isInitializing: boolean
  isLoggingIn: boolean
  sessionExpired: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  dismissSessionExpired: () => void
  updateCurrentUser: (user: AuthUser) => void
  hasPermission: (code: PermissionCode) => boolean
  hasAnyPermission: (codes: PermissionCode[]) => boolean
  hasAllPermissions: (codes: PermissionCode[]) => boolean
  hasRole: (roleName: string | string[]) => boolean
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [isInitializing, setIsInitializing] = React.useState(true)
  const [isLoggingIn, setIsLoggingIn] = React.useState(false)
  const [sessionExpired, setSessionExpired] = React.useState(false)

  React.useEffect(() => {
    // Without a minimum display time the startup/session-restore AppLoader
    // would flash for under a frame whenever /auth/me resolves quickly —
    // long enough to crash but too short to actually see.
    const MIN_LOADER_MS = 700
    let cancelled = false
    const start = performance.now()

    authService.getCurrentUser().then((resolved) => {
      if (cancelled) return
      // Not awaited — isInitializing doesn't wait on this. See warm-caches.ts.
      if (resolved) warmSyncCaches()
      const elapsed = performance.now() - start
      setTimeout(() => {
        if (cancelled) return
        setUser(resolved)
        setIsInitializing(false)
      }, Math.max(0, MIN_LOADER_MS - elapsed))
    })

    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    function handleSessionExpired() {
      if (user) setSessionExpired(true)
    }
    window.addEventListener("gcgea:session-expired", handleSessionExpired)
    return () => window.removeEventListener("gcgea:session-expired", handleSessionExpired)
  }, [user])

  const login = React.useCallback(async (credentials: LoginCredentials) => {
    setIsLoggingIn(true)
    try {
      const authUser = await authService.login(credentials)
      setUser(authUser)
      warmSyncCaches()
    } finally {
      setIsLoggingIn(false)
    }
  }, [])

  const logout = React.useCallback(async () => {
    await authService.logout()
    setUser(null)
    setSessionExpired(false)
  }, [])

  const dismissSessionExpired = React.useCallback(() => {
    setSessionExpired(false)
    setUser(null)
  }, [])

  const updateCurrentUser = React.useCallback((updatedUser: AuthUser) => {
    setUser(updatedUser)
  }, [])

  const hasPermission = React.useCallback(
    (code: PermissionCode) => Boolean(user?.permissions.includes(code)),
    [user]
  )

  const hasAnyPermission = React.useCallback(
    (codes: PermissionCode[]) => codes.some((code) => user?.permissions.includes(code)),
    [user]
  )

  const hasAllPermissions = React.useCallback(
    (codes: PermissionCode[]) => codes.every((code) => user?.permissions.includes(code)),
    [user]
  )

  const hasRole = React.useCallback(
    (roleName: string | string[]) => {
      if (!user) return false
      const roles = Array.isArray(roleName) ? roleName : [roleName]
      return roles.includes(user.roleName)
    },
    [user]
  )

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      isLoggingIn,
      sessionExpired,
      login,
      logout,
      dismissSessionExpired,
      updateCurrentUser,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
    }),
    [user, isInitializing, isLoggingIn, sessionExpired, login, logout, dismissSessionExpired, updateCurrentUser, hasPermission, hasAnyPermission, hasAllPermissions, hasRole]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
