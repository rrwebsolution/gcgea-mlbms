import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Eye, EyeOff, Loader2, Save, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { PermissionMatrix } from "@/features/roles/components/PermissionMatrix"
import { RoleMultiSelect } from "@/features/users/components/RoleMultiSelect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { userFormSchema, type UserFormValues } from "@/schemas/user.schema"
import { createUser, getUser, isEmailTaken, isLastActiveSuperAdmin, isUsernameTaken, updateUser } from "@/services/users.service"
import { listAllRoles } from "@/services/roles.service"
import type { PermissionCode } from "@/types"

export default function UserFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: existingUser, isLoading: isLoadingUser } = useQuery({ queryKey: ["users", id], queryFn: () => getUser(id!), enabled: isEdit })
  const { data: allRoles = [] } = useQuery({ queryKey: ["roles", "all"], queryFn: listAllRoles })

  const [showPassword, setShowPassword] = React.useState(false)
  const [allowedPermissions, setAllowedPermissions] = React.useState<PermissionCode[]>([])
  const [deniedPermissions, setDeniedPermissions] = React.useState<PermissionCode[]>([])
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      fullName: "", username: "", email: "", contactNumber: "", password: "", confirmPassword: "",
      roleId: "", additionalRoleIds: [], status: "Active", requirePasswordChange: false, remarks: "",
    },
  })

  React.useEffect(() => {
    if (existingUser) {
      reset({
        fullName: existingUser.fullName,
        username: existingUser.username,
        email: existingUser.email,
        contactNumber: existingUser.contactNumber ?? "",
        password: "",
        confirmPassword: "",
        roleId: existingUser.roleId,
        additionalRoleIds: existingUser.additionalRoleIds,
        status: existingUser.status,
        requirePasswordChange: existingUser.requirePasswordChange,
        remarks: existingUser.remarks ?? "",
      })
      setAllowedPermissions(existingUser.allowedPermissions)
      setDeniedPermissions(existingUser.deniedPermissions)
    }
  }, [existingUser, reset])

  const roleId = watch("roleId")
  const additionalRoleIds = watch("additionalRoleIds")
  const selectedRole = allRoles.find((r) => r.id === roleId)
  const combinedRolePermissions = React.useMemo(() => {
    const ids = new Set([roleId, ...additionalRoleIds])
    const codes = new Set<PermissionCode>()
    for (const r of allRoles) {
      if (ids.has(r.id)) r.permissions.forEach((c) => codes.add(c))
    }
    return Array.from(codes)
  }, [roleId, additionalRoleIds, allRoles])

  const isProtectedSuperAdmin = isEdit && existingUser ? isLastActiveSuperAdmin(existingUser) : false

  async function onSubmit(values: UserFormValues) {
    if (isUsernameTaken(values.username, id)) {
      toast.error("This username is already taken.")
      return
    }
    if (isEmailTaken(values.email, id)) {
      toast.error("This email address is already in use.")
      return
    }
    if (!isEdit && (!values.password || values.password.length < 8)) {
      toast.error("A password of at least 8 characters is required for new users.")
      return
    }
    if (isProtectedSuperAdmin && values.status !== "Active") {
      toast.error("This is the last active Super Administrator and cannot be deactivated.")
      return
    }

    try {
      const payload = {
        fullName: values.fullName,
        username: values.username,
        email: values.email,
        contactNumber: values.contactNumber,
        roleId: values.roleId,
        additionalRoleIds: values.additionalRoleIds,
        status: values.status,
        requirePasswordChange: values.requirePasswordChange,
        allowedPermissions,
        deniedPermissions,
        remarks: values.remarks,
      }
      const user = isEdit && id ? await updateUser(id, payload) : await createUser(payload)
      toast.success(isEdit ? "User updated successfully." : "User created successfully.")
      queryClient.invalidateQueries({ queryKey: ["users"] })
      navigate(`/admin/users`, { state: { focusUserId: user.id } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save user.")
    }
  }

  async function onSubmitAddAnother(values: UserFormValues) {
    if (isUsernameTaken(values.username, id)) {
      toast.error("This username is already taken.")
      return
    }
    if (isEmailTaken(values.email, id)) {
      toast.error("This email address is already in use.")
      return
    }
    if (!values.password || values.password.length < 8) {
      toast.error("A password of at least 8 characters is required for new users.")
      return
    }
    try {
      await createUser({
        fullName: values.fullName, username: values.username, email: values.email, contactNumber: values.contactNumber,
        roleId: values.roleId, additionalRoleIds: values.additionalRoleIds, status: values.status,
        requirePasswordChange: values.requirePasswordChange, allowedPermissions, deniedPermissions, remarks: values.remarks,
      })
      toast.success("User created successfully.")
      queryClient.invalidateQueries({ queryKey: ["users"] })
      reset({ fullName: "", username: "", email: "", contactNumber: "", password: "", confirmPassword: "", roleId: "", additionalRoleIds: [], status: "Active", requirePasswordChange: false, remarks: "" })
      setAllowedPermissions([])
      setDeniedPermissions([])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save user.")
    }
  }

  async function onSubmitConfigurePermissions(values: UserFormValues) {
    if (isUsernameTaken(values.username, id)) {
      toast.error("This username is already taken.")
      return
    }
    if (isEmailTaken(values.email, id)) {
      toast.error("This email address is already in use.")
      return
    }
    try {
      const payload = {
        fullName: values.fullName, username: values.username, email: values.email, contactNumber: values.contactNumber,
        roleId: values.roleId, additionalRoleIds: values.additionalRoleIds, status: values.status,
        requirePasswordChange: values.requirePasswordChange, allowedPermissions, deniedPermissions, remarks: values.remarks,
      }
      const user = isEdit && id ? await updateUser(id, payload) : await createUser(payload)
      toast.success("User saved. Configure detailed permissions below.")
      queryClient.invalidateQueries({ queryKey: ["users"] })
      navigate(`/admin/users/${user.id}/permissions`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save user.")
    }
  }

  if (isEdit && isLoadingUser) {
    return <p className="text-sm text-muted-foreground">Loading user…</p>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-16">
      <PageHeader title={isEdit ? `Edit User — ${existingUser?.fullName ?? ""}` : "Add User"} description="Create or update a GCGEA MLBMS staff account." />

      {isProtectedSuperAdmin && (
        <AlertBanner tone="warning" title="Protected account" description="This is the last active Super Administrator. Their role, status cannot be changed to a non-administrator state or deactivated." />
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e) }} noValidate className="space-y-5">
        <FormSection title="Account Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
              <Input id="fullName" placeholder="e.g. Juan Dela Cruz" {...register("fullName")} aria-invalid={!!errors.fullName} />
              {errors.fullName && <p className="text-xs font-medium text-destructive">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
              <Input id="username" placeholder="e.g. jdelacruz" {...register("username")} aria-invalid={!!errors.username} />
              {errors.username && <p className="text-xs font-medium text-destructive">{errors.username.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" placeholder="e.g. jdelacruz@gcgea.gingoog.gov.ph" {...register("email")} aria-invalid={!!errors.email} />
              {errors.email && <p className="text-xs font-medium text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input id="contactNumber" placeholder="09XXXXXXXXX" {...register("contactNumber")} aria-invalid={!!errors.contactNumber} />
              {errors.contactNumber && <p className="text-xs font-medium text-destructive">{errors.contactNumber.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">
                Password {!isEdit && <span className="text-destructive">*</span>}
              </Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} className="pr-9" placeholder={isEdit ? "Leave blank to keep current password" : "At least 8 characters"} {...register("password")} aria-invalid={!!errors.password} />
                <Button type="button" variant="ghost" size="icon-sm" className="absolute top-1/2 right-1 -translate-y-1/2" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password visibility">
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {errors.password && <p className="text-xs font-medium text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type={showPassword ? "text" : "password"} placeholder="Re-enter password" {...register("confirmPassword")} aria-invalid={!!errors.confirmPassword} />
              {errors.confirmPassword && <p className="text-xs font-medium text-destructive">{errors.confirmPassword.message}</p>}
            </div>
          </div>
        </FormSection>

        <FormSection title="Roles" description="Assign a primary role and any additional roles this user should carry.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Primary Role <span className="text-destructive">*</span></Label>
              <Select value={roleId} onValueChange={(v) => setValue("roleId", v ?? "", { shouldDirty: true, shouldValidate: true })} disabled={isProtectedSuperAdmin}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent>
                  {allRoles.filter((r) => r.status === "Active").map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roleId && <p className="text-xs font-medium text-destructive">{errors.roleId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Additional Roles</Label>
              <RoleMultiSelect roles={allRoles} selectedIds={additionalRoleIds} excludeId={roleId} onChange={(ids) => setValue("additionalRoleIds", ids, { shouldDirty: true })} />
            </div>
          </div>
          {selectedRole && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <ShieldCheck className="size-3.5" /> Inherited access: {combinedRolePermissions.length} permission(s) from {1 + additionalRoleIds.length} role(s)
              </span>
            </div>
          )}
        </FormSection>

        <FormSection title="Account Status">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Account Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as UserFormValues["status"], { shouldDirty: true })} disabled={isProtectedSuperAdmin}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 self-end pb-1.5 text-sm text-foreground">
              <Checkbox checked={watch("requirePasswordChange")} onCheckedChange={(v) => setValue("requirePasswordChange", !!v, { shouldDirty: true })} />
              Require Password Change on First Login
            </label>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Remarks</Label>
              <Textarea rows={2} placeholder="Additional notes about this account (optional)" {...register("remarks")} />
            </div>
          </div>
        </FormSection>

        <FormSection title="Additional Allowed Permissions" description="Grant specific permissions beyond what this user's roles already provide.">
          <PermissionMatrix
            selected={allowedPermissions}
            onChange={(codes) => {
              setAllowedPermissions(codes)
              setDeniedPermissions((prev) => prev.filter((c) => !codes.includes(c)))
            }}
          />
        </FormSection>

        <FormSection title="Explicitly Denied Permissions" description="Revoke specific permissions even if a role would otherwise grant them. Direct deny always wins.">
          <PermissionMatrix
            selected={deniedPermissions}
            onChange={(codes) => {
              setDeniedPermissions(codes)
              setAllowedPermissions((prev) => prev.filter((c) => !codes.includes(c)))
            }}
          />
        </FormSection>

        <div className="sticky bottom-0 -mx-4 flex flex-wrap justify-end gap-2 border-t border-border bg-card px-4 py-3 sm:mx-0 sm:rounded-xl sm:border sm:shadow-sm">
          <Button type="button" variant="outline" onClick={() => (isDirty ? setShowLeaveConfirm(true) : navigate("/admin/users"))} disabled={isSubmitting}>
            Cancel
          </Button>
          {!isEdit && (
            <Button type="button" variant="secondary" disabled={isSubmitting} onClick={handleSubmit(onSubmitAddAnother)}>
              Save and Add Another
            </Button>
          )}
          <Button type="button" variant="secondary" disabled={isSubmitting} onClick={handleSubmit(onSubmitConfigurePermissions)}>
            Save and Configure Permissions
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
            {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Save User"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        title="Discard unsaved changes?"
        description="You have unsaved changes on this form. Leaving now will discard them."
        confirmLabel="Discard Changes"
        destructive
        onConfirm={() => {
          setShowLeaveConfirm(false)
          navigate("/admin/users")
        }}
      />
    </div>
  )
}
