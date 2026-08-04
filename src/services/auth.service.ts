import type { AuthUser, LoginCredentials } from "@/types"
import { api, getCsrfCookie } from "@/lib/api"

export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  await getCsrfCookie()
  const { data } = await api.post<AuthUser>("/auth/login", credentials)
  return data
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout")
}

/**
 * Resolves the authenticated user from the current session, or null if there isn't one.
 * The endpoint itself answers 200+false for "no session" (not a 401) — see
 * AuthController::me() — so the catch here is only for genuine failures (session-timeout
 * 401, network/server errors), not the normal logged-out case.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data } = await api.get<AuthUser | false>("/auth/me")
    return data || null
  } catch {
    return null
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email })
}

export async function resetPassword(token: string, email: string, password: string, confirmPassword: string): Promise<void> {
  await api.post("/auth/reset-password", { token, email, password, confirmPassword })
}

export async function changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>("/auth/change-password", { currentPassword, newPassword, confirmPassword })
  return data
}
