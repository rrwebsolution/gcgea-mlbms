import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { officeSchema, type OfficeFormValues } from "@/schemas/office.schema"
import type { Office } from "@/types"

interface OfficeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  office?: Office
  onSubmit: (values: OfficeFormValues) => Promise<void>
}

export function OfficeFormDialog({ open, onOpenChange, office, onSubmit }: OfficeFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OfficeFormValues>({
    resolver: zodResolver(officeSchema),
    defaultValues: { code: "", name: "", description: "", status: "Active" },
  })

  React.useEffect(() => {
    if (open) {
      reset(office ? { code: office.code, name: office.name, description: office.description, status: office.status } : { code: "", name: "", description: "", status: "Active" })
    }
  }, [open, office, reset])

  async function handleFormSubmit(values: OfficeFormValues) {
    await onSubmit(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{office ? "Edit Office" : "Add Office"}</DialogTitle>
          <DialogDescription>{office ? "Update this office's details." : "Register a new office under the GCGEA."}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="office-code">
                Office Code <span className="text-destructive">*</span>
              </Label>
              <Input id="office-code" placeholder="e.g. CTO" aria-invalid={!!errors.code} {...register("code")} />
              {errors.code && <p className="text-xs font-medium text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="office-status">Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as "Active" | "Inactive")}>
                <SelectTrigger id="office-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="office-name">
              Office Name <span className="text-destructive">*</span>
            </Label>
            <Input id="office-name" placeholder="e.g. City Treasurer's Office" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name && <p className="text-xs font-medium text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="office-description">Description</Label>
            <Textarea id="office-description" rows={3} placeholder="Brief description of this office (optional)" {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {office ? "Save Changes" : "Add Office"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
