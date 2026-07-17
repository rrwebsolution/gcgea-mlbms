import type { PaginatedResponse, PaginationParams, PermissionCode, Role } from "@/types"
import { simulateDelay } from "./http"
import { MOCK_ROLES } from "./mock-data/roles"
import { paginate, sortBy } from "@/utils/paginate"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"

let roles: Role[] = readStorage<Role[]>(STORAGE_KEYS.roles, MOCK_ROLES)

function persist() {
  writeStorage(STORAGE_KEYS.roles, roles)
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export function generateRoleCode(name: string): string {
  return slugify(name) || "new_role"
}

export function isRoleNameTaken(name: string, excludeId?: string): boolean {
  return roles.some((r) => r.id !== excludeId && r.name.trim().toLowerCase() === name.trim().toLowerCase())
}

export function isRoleCodeTaken(code: string, excludeId?: string): boolean {
  return roles.some((r) => r.id !== excludeId && r.code.toLowerCase() === code.toLowerCase())
}

export interface RoleListParams extends PaginationParams {
  status?: string
  roleType?: "System" | "Custom"
}

export async function listRoles(params: RoleListParams = {}): Promise<PaginatedResponse<Role>> {
  let items = roles
  if (params.search) {
    const term = params.search.toLowerCase()
    items = items.filter((r) => r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term))
  }
  if (params.status) items = items.filter((r) => r.status === params.status)
  if (params.roleType) items = items.filter((r) => (params.roleType === "System" ? r.isSystemRole : !r.isSystemRole))
  items = sortBy(items, params.sortBy, params.sortDir)
  return simulateDelay(paginate(items, params.page, params.perPage))
}

export async function listAllRoles(): Promise<Role[]> {
  return simulateDelay(roles, 150)
}

export function getAllRolesSync(): Role[] {
  return roles
}

export async function getRole(id: string): Promise<Role | undefined> {
  return simulateDelay(roles.find((r) => r.id === id))
}

export interface CreateRoleInput {
  name: string
  code: string
  description?: string
  status: "Active" | "Inactive"
  permissions: PermissionCode[]
}

export async function createRole(input: CreateRoleInput): Promise<Role> {
  const now = new Date().toISOString()
  const newRole: Role = {
    id: `role-${Date.now()}`,
    name: input.name,
    code: input.code,
    description: input.description ?? "",
    isSystemRole: false,
    status: input.status,
    permissions: input.permissions,
    userCount: 0,
    createdAt: now,
    updatedAt: now,
  }
  roles = [newRole, ...roles]
  persist()
  return simulateDelay(newRole, 400)
}

export async function updateRole(id: string, input: Partial<CreateRoleInput>): Promise<Role> {
  const idx = roles.findIndex((r) => r.id === id)
  if (idx === -1) throw new Error("Role not found")
  const updated: Role = { ...roles[idx], ...input, updatedAt: new Date().toISOString() }
  roles = roles.map((r, i) => (i === idx ? updated : r))
  persist()
  return simulateDelay(updated, 400)
}

export async function duplicateRole(id: string): Promise<Role> {
  const source = roles.find((r) => r.id === id)
  if (!source) throw new Error("Role not found")
  let candidateName = `${source.name} (Copy)`
  let suffix = 2
  while (isRoleNameTaken(candidateName)) {
    candidateName = `${source.name} (Copy ${suffix})`
    suffix++
  }
  const now = new Date().toISOString()
  const newRole: Role = {
    id: `role-${Date.now()}`,
    name: candidateName,
    code: generateRoleCode(candidateName),
    description: source.description,
    isSystemRole: false,
    status: "Active",
    permissions: [...source.permissions],
    userCount: 0,
    createdAt: now,
    updatedAt: now,
  }
  roles = [newRole, ...roles]
  persist()
  return simulateDelay(newRole, 400)
}

export async function toggleRoleStatus(id: string): Promise<Role> {
  const idx = roles.findIndex((r) => r.id === id)
  if (idx === -1) throw new Error("Role not found")
  const updated: Role = { ...roles[idx], status: roles[idx].status === "Active" ? "Inactive" : "Active", updatedAt: new Date().toISOString() }
  roles = roles.map((r, i) => (i === idx ? updated : r))
  persist()
  return simulateDelay(updated, 300)
}

export async function deleteRole(id: string): Promise<void> {
  const role = roles.find((r) => r.id === id)
  if (!role) throw new Error("Role not found")
  if (role.isSystemRole) throw new Error("System roles cannot be deleted.")
  roles = roles.filter((r) => r.id !== id)
  persist()
  await simulateDelay(null, 300)
}

export async function updateRolePermissions(id: string, permissions: PermissionCode[]): Promise<Role> {
  const idx = roles.findIndex((r) => r.id === id)
  if (idx === -1) throw new Error("Role not found")
  const updated: Role = { ...roles[idx], permissions, updatedAt: new Date().toISOString() }
  roles = roles.map((r, i) => (i === idx ? updated : r))
  persist()
  return simulateDelay(updated, 400)
}
