import { useNavigate } from "react-router-dom"
import { RotateCw } from "lucide-react"
import { toast } from "sonner"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { LoanApplication } from "@/types"

interface ReloanButtonProps {
  loan: LoanApplication
  eligible: boolean
  /** Shown in a tooltip/toast when the loan is not reloan-eligible yet. */
  blockedReason?: string
  size?: "sm" | "default"
  variant?: "default" | "outline" | "secondary"
}

/** Permission-aware, but always clickable for authorized users; eligibility failures are explained on click. */
export function ReloanButton({ loan, eligible, blockedReason, size = "sm", variant = "outline" }: ReloanButtonProps) {
  const navigate = useNavigate()

  const button = (
    <PermissionButton
      permission="loans.reloan"
      disableInsteadOfHide
      size={size}
      variant={variant}
      className="gap-1.5"
      onClick={() => {
        if (!eligible) {
          toast.error(blockedReason ?? "This loan is not yet eligible for reloan.")
          return
        }
        navigate(`/loans/${loan.id}/reloan`)
      }}
    >
      <RotateCw className="size-3.5" />
      Reloan
    </PermissionButton>
  )

  if (eligible || !blockedReason) return button

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-block">{button}</span>} />
      <TooltipContent>{blockedReason}</TooltipContent>
    </Tooltip>
  )
}
