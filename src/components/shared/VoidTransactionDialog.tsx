import { ReasonDialog } from "@/components/shared/ReasonDialog"

interface VoidTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionLabel: string
  isLoading?: boolean
  onConfirm: (reason: string) => void
}

export function VoidTransactionDialog({ open, onOpenChange, transactionLabel, isLoading, onConfirm }: VoidTransactionDialogProps) {
  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Void ${transactionLabel}?`}
      description="Voiding creates an audit trail entry and reverses this transaction's effect on the member's balance. Posted financial transactions cannot be permanently deleted."
      reasonLabel="Void Reason"
      reasonPlaceholder="Explain why this transaction is being voided…"
      confirmLabel="Void Transaction"
      destructive
      isLoading={isLoading}
      onConfirm={onConfirm}
    />
  )
}
