import * as React from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type ButtonProps = React.ComponentProps<typeof Button>

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean
  /** Label shown in place of `children` while `isLoading` (e.g. "Saving…", "Posting…", "Importing…", "Approving…"). Defaults to `children` unchanged. */
  loadingText?: React.ReactNode
}

/** Standard button loading treatment app-wide: spinner + optional label swap + disabled, replacing the repeated `{isX && <Loader2 .../>} Label` inline pattern. */
export function LoadingButton({ isLoading, loadingText, disabled, children, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={disabled || isLoading} {...props}>
      {isLoading && <Loader2 className="animate-spin" aria-hidden="true" />}
      {isLoading && loadingText !== undefined ? loadingText : children}
    </Button>
  )
}
