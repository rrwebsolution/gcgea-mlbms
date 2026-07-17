import { Link, useNavigate } from "react-router-dom"
import { ShieldAlert, ArrowLeft, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { ORGANIZATION } from "@/constants/organization"

export default function UnauthorizedPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="size-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold text-foreground">Access Restricted</h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          You do not have permission to view this page{user ? ` as ${user.roleName}` : ""}. If you believe this is an
          error, please contact your {ORGANIZATION.acronym} System Administrator.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft />
          Go Back
        </Button>
        <Button render={<Link to="/dashboard" />}>
          <LayoutDashboard />
          Return to Dashboard
        </Button>
      </div>
    </div>
  )
}
