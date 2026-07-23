import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { 
  User as UserIcon, 
  Mail, 
  ShieldCheck, 
  Clock, 
  Laptop, 
  Smartphone, 
  Activity,
  Camera,
  Loader2,
  Trash2,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { RoleIndicator } from "@/components/shared/RoleIndicator"
import { FormSection } from "@/components/shared/FormSection"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { getLoginHistory, removeMyAvatar, uploadMyAvatar } from "@/services/users.service"
import { initialsFromName, formatDateTime } from "@/utils/format"

export default function MyProfilePage() {
  const { user, updateCurrentUser } = useAuth()
  const [isUploading, setIsUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const { data: loginHistory = [] } = useQuery({
    queryKey: ["login-history", user?.id],
    queryFn: () => getLoginHistory(user!.id),
    enabled: !!user,
  })

  if (!user) return null

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please select a JPG, PNG, or WebP image.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile image must not exceed 5 MB.")
      return
    }

    setIsUploading(true)
    try {
      updateCurrentUser(await uploadMyAvatar(file))
      toast.success("Profile image updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload profile image.")
    } finally {
      setIsUploading(false)
    }
  }

  async function handleRemoveAvatar() {
    setIsUploading(true)
    try {
      updateCurrentUser(await removeMyAvatar())
      toast.success("Profile image removed.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove profile image.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 md:px-0">
      <PageHeader 
        title="My Profile" 
        description="Your account information and recent login activity." 
      />

      {/* Main Profile Info Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
        {/* Subtle decorative radial gradients for UI depth */}
        <div className="absolute top-0 right-0 -mr-12 -mt-12 size-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 size-32 rounded-full bg-primary/3 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="flex shrink-0 flex-col items-center gap-2">
          <Avatar size="lg" className="size-20 border-2 border-background shadow-md">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={`${user.fullName} profile`} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
              {initialsFromName(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
          <div className="flex gap-1">
            <Button type="button" size="sm" variant="outline" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
              {isUploading ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
              {user.avatarUrl ? "Change" : "Upload"}
            </Button>
            {user.avatarUrl && (
              <Button type="button" size="icon-sm" variant="ghost" disabled={isUploading} aria-label="Remove profile image" onClick={handleRemoveAvatar}>
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            )}
          </div>
          </div>
          
          <div className="text-center sm:text-left space-y-1.5 pt-1 flex-1">
            <h3 className="font-heading text-lg font-bold text-foreground tracking-tight">{user.fullName}</h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-center sm:justify-start gap-1.5 text-xs md:text-sm text-muted-foreground">
              <span className="flex items-center justify-center sm:justify-start gap-2">
                <Mail className="size-4 text-muted-foreground/60" />
                {user.email}
              </span>
            </div>
            <div className="pt-1 flex justify-center sm:justify-start">
              <RoleIndicator roleName={user.roleName} />
            </div>
          </div>
        </div>

        {/* Detailed Account Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-border/50">
          <ProfileFieldCard label="Username" value={user.username} icon={UserIcon} />
          <ProfileFieldCard 
            label="Account Status" 
            value={user.status} 
            icon={ShieldCheck} 
            status={user.status === "Active" ? "success" : "default"} 
          />
          <ProfileFieldCard label="Last Login" value={formatDateTime(user.lastLoginAt)} icon={Clock} />
        </div>
      </div>

      {/* Recent Login History Section */}
      <FormSection title="Recent Login Activity">
        {loginHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/5 rounded-xl border border-dashed border-border/60">
            <Activity className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-medium text-foreground/80">No login history available</p>
            <p className="text-xs text-muted-foreground mt-0.5">Your sessions will appear here as you log in.</p>
          </div>
        ) : (
          /* Added max-height, vertical scrolling, padding, and styled scrollbar tracks */
          <div className="max-h-[360px] overflow-y-auto pr-2 divide-y divide-border/50 scrollbar-thin [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/15 [&::-webkit-scrollbar-thumb]:rounded-full">
            {loginHistory.map((h) => {
              const DeviceIcon = getDeviceIcon(h.device)
              const isSuccess = h.status === "Success"
              
              return (
                <div key={h.id} className="flex items-start justify-between py-4 first:pt-0 last:pb-0 gap-4 group">
                  <div className="flex gap-3">
                    <div className={`p-2.5 rounded-xl border shrink-0 transition-all duration-200 ${
                      isSuccess 
                        ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/10" 
                        : "bg-rose-500/5 border-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500/10"
                    }`}>
                      <DeviceIcon className="size-4" />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-sm font-semibold text-foreground">
                        {formatDateTime(h.loginAt)}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{h.device}</span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="font-mono text-[10px] bg-muted border border-border/40 px-1.5 py-0.5 rounded">
                          {h.ipAddress}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                    isSuccess 
                      ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                      : "bg-rose-500/5 border-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}>
                    <span className={`size-1.5 rounded-full ${isSuccess ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                    {h.status}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </FormSection>
    </div>
  )
}

/* Local UI Helper Components & Logic */

function getDeviceIcon(device: string) {
  const normalized = device.toLowerCase()
  if (
    normalized.includes("phone") || 
    normalized.includes("mobile") || 
    normalized.includes("ios") || 
    normalized.includes("android")
  ) {
    return Smartphone
  }
  return Laptop
}

function ProfileFieldCard({
  label,
  value,
  icon: Icon,
  status = "default"
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  status?: "default" | "success"
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/5 p-4 flex flex-col justify-between space-y-2 transition-all hover:bg-muted/10">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">{label}</span>
        <Icon className="size-4 text-muted-foreground/50" />
      </div>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs md:text-sm font-semibold text-foreground truncate">{value}</span>
        {status === "success" && (
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        )}
      </div>
    </div>
  )
}
