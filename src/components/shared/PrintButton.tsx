import { Printer } from "lucide-react"
import { toast } from "sonner"
import { PermissionButton } from "@/components/shared/PermissionButton"
import type { PermissionCode } from "@/types"

interface PrintButtonProps {
  permission?: PermissionCode
  label?: string
  onPrint?: () => void
}

export function PrintButton({ permission, label = "Print", onPrint }: PrintButtonProps) {
  return (
    <PermissionButton
      permission={permission}
      variant="outline"
      size="sm"
      onClick={onPrint ?? (() => toast.info("Preparing document for printing…"))}
    >
      <Printer />
      {label}
    </PermissionButton>
  )
}
