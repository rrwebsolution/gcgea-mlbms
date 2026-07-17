import * as React from "react"
import type { PermissionCode } from "@/types"
import { useAuth } from "@/contexts/AuthContext"
import { Button, buttonVariants } from "@/components/ui/button"
import type { VariantProps } from "class-variance-authority"

type ButtonElementProps = React.ComponentProps<typeof Button>

interface PermissionButtonProps extends ButtonElementProps, VariantProps<typeof buttonVariants> {
  permission?: PermissionCode
  anyOf?: PermissionCode[]
  disableInsteadOfHide?: boolean
}

export function PermissionButton({ permission, anyOf, disableInsteadOfHide, disabled, ...props }: PermissionButtonProps) {
  const { hasPermission, hasAnyPermission } = useAuth()

  let allowed = true
  if (permission) allowed = allowed && hasPermission(permission)
  if (anyOf) allowed = allowed && hasAnyPermission(anyOf)

  if (!allowed) {
    if (!disableInsteadOfHide) return null
    return <Button {...props} disabled />
  }

  return <Button {...props} disabled={disabled} />
}
