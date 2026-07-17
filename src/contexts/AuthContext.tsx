import * as React from "react"
import type { AuthUser, LoginCredentials, PermissionCode } from "@/types"
import * as authService from "@/services/auth.service"

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isInitializing: boolean
  isLoggingIn: boolean
  sessionExpired: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  dismissSessionExpired: () => void
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
    // getStoredSession() resolves synchronously, so without a minimum display
    // time the startup/session-restore AppLoader would flash for under a frame
    // on every refresh — long enough to crash but too short to actually see.
    const MIN_LOADER_MS = 700
    const start = performance.now()
    const stored = authService.getStoredSession()
    const elapsed = performance.now() - start
    const timer = setTimeout(() => {
      setUser(stored)
      setIsInitializing(false)
    }, Math.max(0, MIN_LOADER_MS - elapsed))
    return () => clearTimeout(timer)
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
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
    }),
    [user, isInitializing, isLoggingIn, sessionExpired, login, logout, dismissSessionExpired, hasPermission, hasAnyPermission, hasAllPermissions, hasRole]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
