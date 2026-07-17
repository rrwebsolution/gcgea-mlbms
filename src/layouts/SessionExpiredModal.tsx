import { useNavigate } from "react-router-dom"
import { Clock } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"

export function SessionExpiredModal() {
  const { sessionExpired, dismissSessionExpired } = useAuth()
  const navigate = useNavigate()

  function handleContinue() {
    dismissSessionExpired()
    navigate("/login", { replace: true })
  }

  return (
    <Dialog open={sessionExpired} onOpenChange={(open) => !open && handleContinue()}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-warning/15 text-warning">
            <Clock className="size-5" />
          </div>
          <DialogTitle className="text-center">Session Expired</DialogTitle>
          <DialogDescription className="text-center">
            Your session has expired for security reasons. Please log in again to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="w-full" onClick={handleContinue}>
            Return to Login
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
