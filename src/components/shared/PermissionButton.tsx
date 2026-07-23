import * as React from "react"
import { Loader2 } from "lucide-react"
import type { PermissionCode } from "@/types"
import { useAuth } from "@/contexts/AuthContext"
import { Button, buttonVariants } from "@/components/ui/button"
import type { VariantProps } from "class-variance-authority"

type ButtonElementProps = React.ComponentProps<typeof Button>

interface PermissionButtonProps extends ButtonElementProps, VariantProps<typeof buttonVariants> {
  permission?: PermissionCode
  anyOf?: PermissionCode[]
  disableInsteadOfHide?: boolean
  isLoading?: boolean
  /** Label shown in place of `children` while `isLoading` (e.g. "Approving…", "Releasing…"). Defaults to `children` unchanged. */
  loadingText?: React.ReactNode
}

function textContent(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(textContent).join(" ")
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textContent(node.props.children)
  return ""
}

export function PermissionButton({ permission, anyOf, disableInsteadOfHide, disabled, isLoading, loadingText, children, ...props }: PermissionButtonProps) {
  const { hasPermission, hasAnyPermission } = useAuth()
  const actionLabel = textContent(children).toLocaleLowerCase()
  const isCsvAction = actionLabel.includes("export csv")
  const isPrintOutsideReports = !window.location.pathname.startsWith("/reports")
    && actionLabel.includes("print")

  // PDF and Excel are the standard official report formats. Legacy CSV
  // actions remain available outside Report Center operational pages only.
  if (isCsvAction || isPrintOutsideReports) return null

  let allowed = true
  if (permission) allowed = allowed && hasPermission(permission)
  if (anyOf) allowed = allowed && hasAnyPermission(anyOf)

  const content = (
    <>
      {isLoading && <Loader2 className="animate-spin" aria-hidden="true" />}
      {isLoading && loadingText !== undefined ? loadingText : children}
    </>
  )

  if (!allowed) {
    if (!disableInsteadOfHide) return null
    return <Button {...props} disabled>{content}</Button>
  }

  return <Button {...props} disabled={disabled || isLoading}>{content}</Button>
}
