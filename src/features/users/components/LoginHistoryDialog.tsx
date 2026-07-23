import { useQuery } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { DialogSkeleton } from "@/components/shared/loaders/DialogSkeleton"
import { getLoginHistory } from "@/services/users.service"
import { formatDateTime } from "@/utils/format"
import type { SystemUser } from "@/types"

interface LoginHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: SystemUser | null
}

export function LoginHistoryDialog({ open, onOpenChange, user }: LoginHistoryDialogProps) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["login-history", user?.id],
    queryFn: () => getLoginHistory(user!.id),
    enabled: open && !!user,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Login History</DialogTitle>
          <DialogDescription>{user?.fullName}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <DialogSkeleton rows={4} />
        ) : history.length === 0 ? (
          <EmptyState title="No login history" description="This user has no recorded login attempts yet." className="border-none" />
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-auto">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="block text-foreground">{formatDateTime(h.loginAt)}</span>
                  <span className="block text-xs text-muted-foreground">{h.device} · {h.ipAddress}</span>
                </span>
                <span className={h.status === "Success" ? "text-success" : "text-destructive"}>{h.status}</span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
