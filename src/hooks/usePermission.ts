import { useAuth } from "@/contexts/AuthContext"

/** Thin, semantically-named wrapper around the auth context's permission checks. */
export function usePermission() {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth()
  return { hasPermission, hasAnyPermission, hasAllPermissions }
}
