import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { AuthUser, LoginCredentials, PermissionCode } from "@/types"
import * as authService from "@/services/auth.service"
import { warmSyncCaches } from "@/lib/warm-caches"
import { applyAppearanceTheme, loadAppearance } from "@/services/settings.service"

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isInitializing: boolean
  isLoggingIn: boolean
  sessionExpired: boolean
  login: (credentials: LoginCredentials) => Promise<AuthUser>
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
  const queryClient = useQueryClient()
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
      if (resolved) {
        warmSyncCaches(resolved.permissions)
        void loadAppearance().then(applyAppearanceTheme)
      }
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
      // Cached API responses belong to the previous account. Keeping them
      // across an account switch can hide the new user's approval queue or,
      // worse, briefly show data the new role should not inherit.
      queryClient.clear()
      setUser(authUser)
      warmSyncCaches(authUser.permissions)
      void loadAppearance().then(applyAppearanceTheme)
      return authUser
    } finally {
      setIsLoggingIn(false)
    }
  }, [queryClient])

  const logout = React.useCallback(async () => {
    await authService.logout()
    queryClient.clear()
    setUser(null)
    setSessionExpired(false)
  }, [queryClient])

  const dismissSessionExpired = React.useCallback(() => {
    queryClient.clear()
    setSessionExpired(false)
    setUser(null)
  }, [queryClient])

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
