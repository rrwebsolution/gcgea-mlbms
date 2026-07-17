import type { PermissionCode } from "@/types"
import { useAuth } from "@/contexts/AuthContext"

interface UseRoutePermissionOptions {
  permission?: PermissionCode
  anyOf?: PermissionCode[]
}

/** Imperative version of the check `ProtectedRoute` performs, for conditional in-page sections. */
export function useRoutePermission({ permission, anyOf }: UseRoutePermissionOptions): boolean {
  const { hasPermission, hasAnyPermission } = useAuth()
  let allowed = true
  if (permission) allowed = allowed && hasPermission(permission)
  if (anyOf) allowed = allowed && hasAnyPermission(anyOf)
  return allowed
}
