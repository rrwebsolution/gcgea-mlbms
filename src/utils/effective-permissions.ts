import type { EffectivePermissionEntry, PermissionCode, PermissionSource, Role, SystemUser } from "@/types"
import { ALL_PERMISSIONS } from "@/constants/permissions"

export function getUserRoles(user: Pick<SystemUser, "roleId" | "additionalRoleIds">, roles: Role[]): Role[] {
  const ids = [user.roleId, ...(user.additionalRoleIds ?? [])]
  return roles.filter((r) => ids.includes(r.id))
}

/**
 * Effective permission precedence (highest wins):
 *   1. Direct deny  -> always No Access, regardless of any role grant or direct allow
 *   2. Direct allow -> Access, when no direct deny exists
 *   3. Role grant   -> Access, when no direct deny exists (primary or additional role)
 *   4. Nothing      -> No Access
 */
export function computeEffectivePermissionCodes(
  user: Pick<SystemUser, "roleId" | "additionalRoleIds" | "allowedPermissions" | "deniedPermissions">,
  roles: Role[]
): PermissionCode[] {
  const userRoles = getUserRoles(user, roles)
  const roleGranted = new Set<PermissionCode>(userRoles.flatMap((r) => r.permissions ?? []))
  const denied = new Set(user.deniedPermissions ?? [])

  const effective = new Set<PermissionCode>()
  for (const code of roleGranted) {
    if (!denied.has(code)) effective.add(code)
  }
  for (const code of user.allowedPermissions ?? []) {
    if (!denied.has(code)) effective.add(code)
  }
  return Array.from(effective)
}

export function computeEffectivePermissionEntries(
  user: Pick<SystemUser, "roleId" | "additionalRoleIds" | "allowedPermissions" | "deniedPermissions">,
  roles: Role[]
): EffectivePermissionEntry[] {
  const userRoles = getUserRoles(user, roles)
  const primaryRole = userRoles.find((r) => r.id === user.roleId)
  const additionalRoles = userRoles.filter((r) => r.id !== user.roleId)

  return ALL_PERMISSIONS.map((perm) => {
    const sources: Exclude<PermissionSource, "none" | "direct_deny">[] = []
    if (primaryRole?.permissions?.includes(perm.code)) sources.push("primary_role")
    if (additionalRoles.some((r) => r.permissions?.includes(perm.code))) sources.push("additional_role")

    const isDenied = (user.deniedPermissions ?? []).includes(perm.code)
    const isAllowed = (user.allowedPermissions ?? []).includes(perm.code)
    const directSetting: "allow" | "deny" | null = isDenied ? "deny" : isAllowed ? "allow" : null

    const hasGrant = sources.length > 0 || isAllowed
    const effective = !isDenied && hasGrant

    return {
      code: perm.code,
      label: perm.label,
      group: perm.group,
      description: perm.description,
      sources,
      directSetting,
      effective,
    }
  })
}

export function permissionSourceLabel(entry: EffectivePermissionEntry): string {
  if (entry.directSetting === "deny") return "Direct Deny"
  if (entry.directSetting === "allow" && entry.sources.length === 0) return "Direct Allow"
  if (entry.sources.includes("primary_role")) return "Primary Role"
  if (entry.sources.includes("additional_role")) return "Additional Role"
  if (entry.directSetting === "allow") return "Direct Allow"
  return "No Access"
}
