import type { AuthUser, LoginCredentials } from "@/types"
import { simulateDelay } from "./http"
import { getAllUsersSync } from "./users.service"
import { getAllRolesSync } from "./roles.service"
import { computeEffectivePermissionCodes } from "@/utils/effective-permissions"
import { STORAGE_KEYS } from "@/lib/storage"

const MOCK_PASSWORD = "Gcgea@2026"
const SESSION_KEY = STORAGE_KEYS.session

function toAuthUser(userId: string): AuthUser {
  const user = getAllUsersSync().find((u) => u.id === userId)
  if (!user) throw new Error("User not found")

  const permissions = computeEffectivePermissionCodes(user, getAllRolesSync())

  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    roleId: user.roleId,
    roleName: user.roleName,
    roleIds: [user.roleId, ...user.additionalRoleIds],
    permissions,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
  }
}

export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  const match = getAllUsersSync().find(
    (u) =>
      u.username.toLowerCase() === credentials.usernameOrEmail.toLowerCase() ||
      u.email.toLowerCase() === credentials.usernameOrEmail.toLowerCase()
  )

  await simulateDelay(null, 600)

  if (!match) {
    throw new Error("Invalid username/email or password.")
  }
  if (match.status !== "Active") {
    throw new Error("This account has been disabled. Please contact your system administrator.")
  }
  if (credentials.password !== MOCK_PASSWORD) {
    throw new Error("Invalid username/email or password.")
  }

  const authUser = toAuthUser(match.id)
  const storage = credentials.rememberMe ? window.localStorage : window.sessionStorage
  storage.setItem(SESSION_KEY, JSON.stringify(authUser))
  return authUser
}

export async function logout(): Promise<void> {
  window.localStorage.removeItem(SESSION_KEY)
  window.sessionStorage.removeItem(SESSION_KEY)
  await simulateDelay(null, 200)
}

export function getStoredSession(): AuthUser | null {
  const raw = window.localStorage.getItem(SESSION_KEY) ?? window.sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AuthUser
    // Re-derive permissions from current role/user state so admin changes made in
    // another tab (or since last login) are reflected without forcing a re-login.
    const freshUser = getAllUsersSync().find((u) => u.id === parsed.id)
    if (!freshUser || freshUser.status !== "Active") return null
    return toAuthUser(parsed.id)
  } catch {
    return null
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  await simulateDelay(null, 500)
  if (!getAllUsersSync().some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("No account found with that email address.")
  }
}

export async function resetPassword(_token: string, _newPassword: string): Promise<void> {
  await simulateDelay(null, 500)
}

export async function changePassword(_currentPassword: string, _newPassword: string): Promise<void> {
  await simulateDelay(null, 500)
}
