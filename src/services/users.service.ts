import type { AuthUser, LoginHistoryEntry, PaginatedResponse, PaginationParams, PermissionCode, SystemUser } from "@/types"
import { api, getPaginated } from "@/lib/api"
import { getAllRolesSync } from "./roles.service"
import { computeEffectivePermissionCodes } from "@/utils/effective-permissions"

// Best-effort synchronous cache of the last successful listAllUsers() fetch —
// backs isUsernameTaken/isEmailTaken/isLastActiveSuperAdmin/getAllUsersSync()
// for call sites that need a user list without an explicit fetch. Empty until
// the first call resolves.
let cachedUsers: SystemUser[] = []

export function isUsernameTaken(username: string, excludeId?: string): boolean {
  return cachedUsers.some((u) => u.id !== excludeId && u.username.toLowerCase() === username.trim().toLowerCase())
}

export function isEmailTaken(email: string, excludeId?: string): boolean {
  return cachedUsers.some((u) => u.id !== excludeId && u.email.toLowerCase() === email.trim().toLowerCase())
}

export interface UserListParams extends PaginationParams {
  status?: string
  roleId?: string
}

export async function listUsers(params: UserListParams = {}): Promise<PaginatedResponse<SystemUser>> {
  return getPaginated<SystemUser>("/users", params)
}

export async function listAllUsers(): Promise<SystemUser[]> {
  const { data } = await api.get<SystemUser[]>("/users/all")
  cachedUsers = data
  return data
}

export function getAllUsersSync(): SystemUser[] {
  return cachedUsers
}

export async function getUser(id: string): Promise<SystemUser | undefined> {
  const { data } = await api.get<SystemUser>(`/users/${id}`)
  return data
}

export interface CreateUserInput {
  fullName: string
  username: string
  email: string
  contactNumber?: string
  password?: string
  roleId: string
  additionalRoleIds: string[]
  status: SystemUser["status"]
  requirePasswordChange: boolean
  allowedPermissions: PermissionCode[]
  deniedPermissions: PermissionCode[]
  remarks?: string
}

export async function createUser(input: CreateUserInput): Promise<SystemUser> {
  const { data } = await api.post<SystemUser>("/users", input)
  return data
}

export async function updateUser(id: string, input: Partial<CreateUserInput>): Promise<SystemUser> {
  const { data } = await api.put<SystemUser>(`/users/${id}`, input)
  return data
}

export async function toggleUserStatus(id: string): Promise<SystemUser> {
  const { data } = await api.patch<SystemUser>(`/users/${id}/toggle-status`)
  return data
}

export async function updateUserPermissions(id: string, allowed: PermissionCode[], denied: PermissionCode[]): Promise<SystemUser> {
  const { data } = await api.put<SystemUser>(`/users/${id}/permissions`, { allowedPermissions: allowed, deniedPermissions: denied })
  return data
}

export async function updateUserRoles(id: string, roleId: string, additionalRoleIds: string[]): Promise<SystemUser> {
  const { data } = await api.put<SystemUser>(`/users/${id}`, { roleId, additionalRoleIds })
  return data
}

export async function resetUserPassword(id: string): Promise<void> {
  await api.post(`/users/${id}/reset-password`)
}

export async function getLoginHistory(userId: string): Promise<LoginHistoryEntry[]> {
  const { data } = await api.get<LoginHistoryEntry[]>(`/users/${userId}/login-history`)
  return data
}

export async function uploadMyAvatar(file: File): Promise<AuthUser> {
  const formData = new FormData()
  formData.append("avatar", file)
  const { data } = await api.post<AuthUser>("/users/me/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export async function removeMyAvatar(): Promise<AuthUser> {
  const { data } = await api.delete<AuthUser>("/users/me/avatar")
  return data
}

export function effectivePermissionCountFor(user: SystemUser): number {
  return computeEffectivePermissionCodes(user, getAllRolesSync()).length
}

/** True when the user is the last active Super Administrator — protected from deactivation/role change. */
export function isLastActiveSuperAdmin(user: Pick<SystemUser, "id" | "roleId" | "status">): boolean {
  const superAdminRole = getAllRolesSync().find((r) => r.name === "Super Administrator")
  if (!superAdminRole || user.roleId !== superAdminRole.id) return false
  const activeSuperAdmins = cachedUsers.filter((u) => u.roleId === superAdminRole.id && u.status === "Active")
  return activeSuperAdmins.length <= 1 && user.status === "Active"
}
