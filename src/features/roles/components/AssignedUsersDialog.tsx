import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { listAllUsers } from "@/services/users.service"
import { USER_STATUS_TONE } from "@/constants/status"
import { initialsFromName } from "@/utils/format"
import type { Role } from "@/types"

interface AssignedUsersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role | null
}

export function AssignedUsersDialog({ open, onOpenChange, role }: AssignedUsersDialogProps) {
  const { data: users = [] } = useQuery({ queryKey: ["users", "all"], queryFn: listAllUsers, enabled: open })
  const assigned = role ? users.filter((u) => u.roleId === role.id || u.additionalRoleIds.includes(role.id)) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Users assigned to {role?.name}</DialogTitle>
          <DialogDescription>{assigned.length} user{assigned.length !== 1 ? "s" : ""} currently hold this role, as primary or additional.</DialogDescription>
        </DialogHeader>
        {assigned.length === 0 ? (
          <EmptyState title="No users assigned" description="No user currently has this role." className="border-none" />
        ) : (
          <ul className="max-h-80 space-y-1 overflow-auto">
            {assigned.map((u) => (
              <li key={u.id}>
                <Link
                  to={`/admin/users/${u.id}/edit`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted"
                >
                  <Avatar size="sm">
                    <AvatarFallback className="bg-primary text-[0.6rem] text-primary-foreground">{initialsFromName(u.fullName)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{u.fullName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {u.username} · {u.roleId === role?.id ? "Primary" : "Additional"}
                    </span>
                  </span>
                  <StatusBadge label={u.status} tone={USER_STATUS_TONE[u.status]} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
