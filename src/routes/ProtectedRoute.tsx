import { Navigate, Outlet, useLocation } from "react-router-dom"
import type { PermissionCode } from "@/types"
import { useAuth } from "@/contexts/AuthContext"
import { AppLoader } from "@/components/shared/AppLoader"

interface ProtectedRouteProps {
  permission?: PermissionCode
  anyOf?: PermissionCode[]
}

export function ProtectedRoute({ permission, anyOf }: ProtectedRouteProps) {
  const { isAuthenticated, isInitializing, hasPermission, hasAnyPermission } = useAuth()
  const location = useLocation()

  if (isInitializing) {
    return <AppLoader isLoading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  let allowed = true
  if (permission) allowed = allowed && hasPermission(permission)
  if (anyOf) allowed = allowed && hasAnyPermission(anyOf)

  if (!allowed) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
