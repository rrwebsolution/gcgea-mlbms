import * as React from "react"
import { useAuth } from "@/contexts/AuthContext"

interface RoleGuardProps {
  role: string | string[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function RoleGuard({ role, fallback = null, children }: RoleGuardProps) {
  const { hasRole } = useAuth()
  if (!hasRole(role)) return <>{fallback}</>
  return <>{children}</>
}
