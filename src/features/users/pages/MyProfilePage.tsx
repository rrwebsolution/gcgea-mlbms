import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "@/components/shared/PageHeader"
import { RoleIndicator } from "@/components/shared/RoleIndicator"
import { FormSection } from "@/components/shared/FormSection"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { getLoginHistory } from "@/services/users.service"
import { initialsFromName, formatDateTime } from "@/utils/format"

export default function MyProfilePage() {
  const { user } = useAuth()
  const { data: loginHistory = [] } = useQuery({
    queryKey: ["login-history", user?.id],
    queryFn: () => getLoginHistory(user!.id),
    enabled: !!user,
  })

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="My Profile" description="Your account information and recent login activity." />
      <FormSection title="Account Information">
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            <AvatarFallback className="bg-primary text-primary-foreground">{initialsFromName(user.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-heading text-base font-semibold text-foreground">{user.fullName}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <RoleIndicator roleName={user.roleName} className="mt-1.5" />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Username</dt>
          <dd className="text-right font-medium text-foreground">{user.username}</dd>
          <dt className="text-muted-foreground">Account Status</dt>
          <dd className="text-right font-medium text-foreground">{user.status}</dd>
          <dt className="text-muted-foreground">Last Login</dt>
          <dd className="text-right font-medium text-foreground">{formatDateTime(user.lastLoginAt)}</dd>
        </dl>
      </FormSection>

      <FormSection title="Recent Login Activity">
        {loginHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No login history available.</p>
        ) : (
          <ul className="divide-y divide-border">
            {loginHistory.map((h) => (
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
      </FormSection>
    </div>
  )
}
