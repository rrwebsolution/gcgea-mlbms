import type { PaginatedResponse, PaginationParams, PermissionCode, Role } from "@/types"
import { api, getPaginated } from "@/lib/api"

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

// Best-effort synchronous cache of the last successful listAllRoles() fetch —
// backs isRoleNameTaken/isRoleCodeTaken/getAllRolesSync() for call sites that
// need a role list without an explicit fetch. Empty until the first call resolves.
let cachedRoles: Role[] = []

export function isRoleNameTaken(name: string, excludeId?: string): boolean {
  return cachedRoles.some((r) => r.id !== excludeId && r.name.trim().toLowerCase() === name.trim().toLowerCase())
}

export function isRoleCodeTaken(code: string, excludeId?: string): boolean {
  return cachedRoles.some((r) => r.id !== excludeId && r.code.toLowerCase() === code.toLowerCase())
}

export interface RoleListParams extends PaginationParams {
  status?: string
  roleType?: "System" | "Custom"
}

export async function listRoles(params: RoleListParams = {}): Promise<PaginatedResponse<Role>> {
  return getPaginated<Role>("/roles", params)
}

export async function listAllRoles(): Promise<Role[]> {
  const { data } = await api.get<Role[]>("/roles/all")
  cachedRoles = data
  return data
}

export function getAllRolesSync(): Role[] {
  return cachedRoles
}

export async function getRole(id: string): Promise<Role | undefined> {
  const { data } = await api.get<Role>(`/roles/${id}`)
  return data
}

export interface CreateRoleInput {
  name: string
  code: string
  description?: string
  status: "Active" | "Inactive"
  permissions: PermissionCode[]
}

export async function createRole(input: CreateRoleInput): Promise<Role> {
  const { data } = await api.post<Role>("/roles", input)
  return data
}

export async function updateRole(id: string, input: Partial<CreateRoleInput>): Promise<Role> {
  const { data } = await api.put<Role>(`/roles/${id}`, input)
  return data
}

export async function duplicateRole(id: string): Promise<Role> {
  const { data } = await api.post<Role>(`/roles/${id}/duplicate`)
  return data
}

export async function toggleRoleStatus(id: string): Promise<Role> {
  const { data } = await api.patch<Role>(`/roles/${id}/toggle-status`)
  return data
}

export async function deleteRole(id: string): Promise<void> {
  await api.delete(`/roles/${id}`)
}

export async function updateRolePermissions(id: string, permissions: PermissionCode[]): Promise<Role> {
  const { data } = await api.put<Role>(`/roles/${id}/permissions`, { permissions })
  return data
}
