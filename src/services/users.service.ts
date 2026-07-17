import type { LoginHistoryEntry, PaginatedResponse, PaginationParams, PermissionCode, SystemUser } from "@/types"
import { simulateDelay } from "./http"
import { MOCK_USERS, MOCK_LOGIN_HISTORY } from "./mock-data/users"
import { paginate, sortBy } from "@/utils/paginate"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { getAllRolesSync } from "./roles.service"
import { computeEffectivePermissionCodes } from "@/utils/effective-permissions"

let users: SystemUser[] = readStorage<SystemUser[]>(STORAGE_KEYS.users, MOCK_USERS)

function persist() {
  writeStorage(STORAGE_KEYS.users, users)
}

export function isUsernameTaken(username: string, excludeId?: string): boolean {
  return users.some((u) => u.id !== excludeId && u.username.toLowerCase() === username.trim().toLowerCase())
}

export function isEmailTaken(email: string, excludeId?: string): boolean {
  return users.some((u) => u.id !== excludeId && u.email.toLowerCase() === email.trim().toLowerCase())
}

export interface UserListParams extends PaginationParams {
  status?: string
  roleId?: string
}

export async function listUsers(params: UserListParams = {}): Promise<PaginatedResponse<SystemUser>> {
  let items = users
  if (params.search) {
    const term = params.search.toLowerCase()
    items = items.filter(
      (u) => u.fullName.toLowerCase().includes(term) || u.username.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
    )
  }
  if (params.status) items = items.filter((u) => u.status === params.status)
  if (params.roleId) items = items.filter((u) => u.roleId === params.roleId || u.additionalRoleIds.includes(params.roleId!))
  items = sortBy(items, params.sortBy, params.sortDir)
  return simulateDelay(paginate(items, params.page, params.perPage))
}

export async function listAllUsers(): Promise<SystemUser[]> {
  return simulateDelay(users, 150)
}

export function getAllUsersSync(): SystemUser[] {
  return users
}

export async function getUser(id: string): Promise<SystemUser | undefined> {
  return simulateDelay(users.find((u) => u.id === id))
}

export interface CreateUserInput {
  fullName: string
  username: string
  email: string
  contactNumber?: string
  roleId: string
  additionalRoleIds: string[]
  status: SystemUser["status"]
  requirePasswordChange: boolean
  allowedPermissions: PermissionCode[]
  deniedPermissions: PermissionCode[]
  remarks?: string
}

export async function createUser(input: CreateUserInput): Promise<SystemUser> {
  const role = getAllRolesSync().find((r) => r.id === input.roleId)
  const newUser: SystemUser = {
    id: `usr-${Date.now()}`,
    fullName: input.fullName,
    username: input.username,
    email: input.email,
    contactNumber: input.contactNumber,
    roleId: input.roleId,
    roleName: role?.name ?? "",
    additionalRoleIds: input.additionalRoleIds,
    additionalPermissions: [],
    allowedPermissions: input.allowedPermissions,
    deniedPermissions: input.deniedPermissions,
    requirePasswordChange: input.requirePasswordChange,
    remarks: input.remarks,
    status: input.status,
    createdAt: new Date().toISOString(),
  }
  users = [newUser, ...users]
  persist()
  return simulateDelay(newUser, 450)
}

export async function updateUser(id: string, input: Partial<CreateUserInput>): Promise<SystemUser> {
  const idx = users.findIndex((u) => u.id === id)
  if (idx === -1) throw new Error("User not found")
  const role = input.roleId ? getAllRolesSync().find((r) => r.id === input.roleId) : undefined
  const updated: SystemUser = {
    ...users[idx],
    ...input,
    roleName: role?.name ?? users[idx].roleName,
  }
  users = users.map((u, i) => (i === idx ? updated : u))
  persist()
  return simulateDelay(updated, 400)
}

export async function toggleUserStatus(id: string): Promise<SystemUser> {
  const idx = users.findIndex((u) => u.id === id)
  if (idx === -1) throw new Error("User not found")
  const nextStatus = users[idx].status === "Active" ? "Inactive" : "Active"
  const updated: SystemUser = { ...users[idx], status: nextStatus }
  users = users.map((u, i) => (i === idx ? updated : u))
  persist()
  return simulateDelay(updated, 350)
}

export async function updateUserPermissions(id: string, allowed: PermissionCode[], denied: PermissionCode[]): Promise<SystemUser> {
  const idx = users.findIndex((u) => u.id === id)
  if (idx === -1) throw new Error("User not found")
  const updated: SystemUser = { ...users[idx], allowedPermissions: allowed, deniedPermissions: denied }
  users = users.map((u, i) => (i === idx ? updated : u))
  persist()
  return simulateDelay(updated, 400)
}

export async function updateUserRoles(id: string, roleId: string, additionalRoleIds: string[]): Promise<SystemUser> {
  const idx = users.findIndex((u) => u.id === id)
  if (idx === -1) throw new Error("User not found")
  const role = getAllRolesSync().find((r) => r.id === roleId)
  const updated: SystemUser = { ...users[idx], roleId, roleName: role?.name ?? users[idx].roleName, additionalRoleIds }
  users = users.map((u, i) => (i === idx ? updated : u))
  persist()
  return simulateDelay(updated, 400)
}

export async function resetUserPassword(id: string): Promise<void> {
  const user = users.find((u) => u.id === id)
  if (!user) throw new Error("User not found")
  await simulateDelay(null, 400)
}

export async function getLoginHistory(userId: string): Promise<LoginHistoryEntry[]> {
  return simulateDelay(MOCK_LOGIN_HISTORY.filter((h) => h.userId === userId))
}

export function effectivePermissionCountFor(user: SystemUser): number {
  return computeEffectivePermissionCodes(user, getAllRolesSync()).length
}

/** True when the user is the last active Super Administrator — protected from deactivation/role change. */
export function isLastActiveSuperAdmin(user: Pick<SystemUser, "id" | "roleId" | "status">): boolean {
  const superAdminRole = getAllRolesSync().find((r) => r.name === "Super Administrator")
  if (!superAdminRole || user.roleId !== superAdminRole.id) return false
  const activeSuperAdmins = users.filter((u) => u.roleId === superAdminRole.id && u.status === "Active")
  return activeSuperAdmins.length <= 1 && user.status === "Active"
}
