import * as React from "react"
import { useNavigate, Link } from "react-router-dom"
import { KeyRound, Loader2, LogOut, Settings, UserCircle, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { cn } from "@/lib/utils" // Assumes standard shadcn utility helper

export function UserMenu() {
  const { user, logout, hasPermission } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useHeaderDropdownSlot("profile")
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  if (!user) return null

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
      toast.success("You have been logged out successfully.")
      navigate("/login", { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  const initials = initialsFromName(user.fullName)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button 
            variant="ghost" 
            className="h-10 gap-2.5 px-2 py-1.5 hover:bg-accent data-[state=open]:bg-accent rounded-lg transition-colors duration-200" 
          />
        }
      >
        <div className="relative flex-shrink-0">
          <Avatar className="size-8 border border-border/50 shadow-sm">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          {/* Optional status dot */}
          <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
        </div>
        
        <span className="hidden flex-col items-start text-left leading-tight sm:flex">
          <span className="max-w-28 truncate text-xs font-semibold text-foreground">
            {user.fullName}
          </span>
          <span className="max-w-28 truncate text-[0.65rem] font-medium text-muted-foreground/80">
            {user.roleName}
          </span>
        </span>
        
        <ChevronDown 
          className={cn(
            "hidden size-3.5 text-muted-foreground/70 transition-transform duration-200 sm:block",
            open && "rotate-180"
          )} 
        />
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64 p-1.5" sideOffset={8}>
        {/* Profile Card Header */}
        <DropdownMenuLabel className="flex items-center gap-3 px-2.5 py-3 font-normal">
          <Avatar className="size-10 border border-border/40">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
            <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 space-y-0.5">
            <span className="text-sm font-semibold text-foreground truncate leading-none">
              {user.fullName}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {user.email}
            </span>
            <div className="pt-1">
              <RoleIndicator roleName={user.roleName} className="text-[10px] py-0.5 px-1.5 inline-flex" />
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="-mx-1.5 my-1.5" />
        
        {/* Navigation Group */}
        <div className="space-y-0.5">
          <DropdownMenuItem 
            render={<Link to="/profile" />}
            className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-md cursor-pointer transition-colors"
          >
            <UserCircle className="size-4 text-muted-foreground" />
            <span>My Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            render={<Link to="/change-password" />}
            className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-md cursor-pointer transition-colors"
          >
            <KeyRound className="size-4 text-muted-foreground" />
            <span>Change Password</span>
          </DropdownMenuItem>

          {hasPermission("settings.view") && (
            <DropdownMenuItem 
              render={<Link to="/admin/settings" />}
              className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-md cursor-pointer transition-colors"
            >
              <Settings className="size-4 text-muted-foreground" />
              <span>Settings</span>
            </DropdownMenuItem>
          )}
        </div>

        <DropdownMenuSeparator className="-mx-1.5 my-1.5" />
        
        {/* Destructive Action */}
        <DropdownMenuItem 
          variant="destructive" 
          disabled={isLoggingOut} 
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-md cursor-pointer transition-colors focus:bg-destructive/10 focus:text-destructive disabled:pointer-events-none"
        >
          {isLoggingOut ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4 text-destructive" />
          )}
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
