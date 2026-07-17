import { useNavigate, Link } from "react-router-dom"
import { KeyRound, LogOut, Settings, UserCircle } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/AuthContext"
import { initialsFromName } from "@/utils/format"
import { RoleIndicator } from "@/components/shared/RoleIndicator"
import { useHeaderDropdownSlot } from "@/contexts/HeaderDropdownContext"

export function UserMenu() {
  const { user, logout, hasPermission } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useHeaderDropdownSlot("profile")

  if (!user) return null

  async function handleLogout() {
    await logout()
    toast.success("You have been logged out successfully.")
    navigate("/login", { replace: true })
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="h-auto gap-2 px-1.5 py-1" />}
      >
        <Avatar className="size-7">
          <AvatarFallback className="bg-primary text-xs text-primary-foreground">{initialsFromName(user.fullName)}</AvatarFallback>
        </Avatar>
        <span className="hidden flex-col items-start leading-tight sm:flex">
          <span className="max-w-36 truncate text-sm font-medium text-foreground">{user.fullName}</span>
          <span className="text-[0.7rem] text-muted-foreground">{user.roleName}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col items-start gap-1 px-1.5 py-1.5">
          <span className="text-sm font-medium text-foreground">{user.fullName}</span>
          <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
          <RoleIndicator roleName={user.roleName} className="mt-0.5" />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/profile" />}>
          <UserCircle />
          My Profile
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/change-password" />}>
          <KeyRound />
          Change Password
        </DropdownMenuItem>
        {hasPermission("settings.view") && (
          <DropdownMenuItem render={<Link to="/admin/settings" />}>
            <Settings />
            Settings
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
