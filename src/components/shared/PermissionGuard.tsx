import * as React from "react"
import type { PermissionCode } from "@/types"
import { useAuth } from "@/contexts/AuthContext"

interface PermissionGuardProps {
  permission?: PermissionCode
  anyOf?: PermissionCode[]
  allOf?: PermissionCode[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGuard({ permission, anyOf, allOf, fallback = null, children }: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth()

  let allowed = true
  if (permission) allowed = allowed && hasPermission(permission)
  if (anyOf) allowed = allowed && hasAnyPermission(anyOf)
  if (allOf) allowed = allowed && hasAllPermissions(allOf)

  if (!allowed) return <>{fallback}</>
  return <>{children}</>
}
