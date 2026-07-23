import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { FormSkeleton } from "@/components/shared/loaders/FormSkeleton"
import { PermissionMatrix } from "@/features/roles/components/PermissionMatrix"
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { roleFormSchema, type RoleFormValues } from "@/schemas/role.schema"
import {
  createRole,
  generateRoleCode,
  getRole,
  isRoleCodeTaken,
  isRoleNameTaken,
  listAllRoles,
  updateRole,
} from "@/services/roles.service"
import { listAllUsers } from "@/services/users.service"
import { ALL_PERMISSION_CODES, PERMISSION_PRESETS, permissionCodesForPreset } from "@/constants/permissions"
import type { PermissionCode, PermissionPreset } from "@/types"

export default function RoleFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: existingRole, isLoading: isLoadingRole } = useQuery({
    queryKey: ["roles", id],
    queryFn: () => getRole(id!),
    enabled: isEdit,
  })
  const { data: allRoles = [] } = useQuery({ queryKey: ["roles", "all"], queryFn: listAllRoles })
  const { data: allUsers = [] } = useQuery({ queryKey: ["users", "all"], queryFn: listAllUsers })

  useBreadcrumbExtra(isEdit ? existingRole?.name : "Add Role")

  const [permissions, setPermissions] = React.useState<PermissionCode[]>([])
  const [preset, setPreset] = React.useState<PermissionPreset>("custom")
  const [copySourceId, setCopySourceId] = React.useState<string>("")
  const [codeManuallyEdited, setCodeManuallyEdited] = React.useState(isEdit)
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: "", code: "", description: "", status: "Active" },
  })

  React.useEffect(() => {
    if (existingRole) {
      reset({ name: existingRole.name, code: existingRole.code, description: existingRole.description, status: existingRole.status })
      setPermissions(existingRole.permissions)
      setCodeManuallyEdited(true)
    }
  }, [existingRole, reset])

  const name = watch("name")

  React.useEffect(() => {
    if (!isEdit && !codeManuallyEdited) {
      setValue("code", generateRoleCode(name || ""), { shouldValidate: false })
    }
  }, [name, isEdit, codeManuallyEdited, setValue])

  const isSuperAdmin = existingRole?.name === "Super Administrator"
  const affectedUserCount = existingRole ? allUsers.filter((u) => u.roleId === existingRole.id || u.additionalRoleIds.includes(existingRole.id)).length : 0

  function applyPreset(value: PermissionPreset) {
    setPreset(value)
    if (value !== "copy_existing") {
      setPermissions(isSuperAdmin ? ALL_PERMISSION_CODES : permissionCodesForPreset(value))
    }
  }

  function applyCopySource(roleId: string) {
    setCopySourceId(roleId)
    const source = allRoles.find((r) => r.id === roleId)
    if (source) setPermissions(source.permissions)
  }

  function validateUniqueness(values: RoleFormValues): boolean {
    if (isRoleNameTaken(values.name, id)) {
      toast.error("A role with this name already exists.")
      return false
    }
    if (isRoleCodeTaken(values.code, id)) {
      toast.error("A role with this code already exists.")
      return false
    }
    return true
  }

  async function saveRole(values: RoleFormValues) {
    const finalPermissions = isSuperAdmin ? ALL_PERMISSION_CODES : permissions
    if (isEdit && id) {
      return updateRole(id, { ...values, permissions: finalPermissions })
    }
    return createRole({ ...values, permissions: finalPermissions })
  }

  async function onSubmit(values: RoleFormValues) {
    if (!validateUniqueness(values)) return
    try {
      const role = await saveRole(values)
      toast.success(isEdit ? "Role updated successfully." : "Role created successfully.")
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      navigate(`/admin/roles/${role.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save role.")
    }
  }

  async function onSubmitAddAnother(values: RoleFormValues) {
    if (!validateUniqueness(values)) return
    try {
      await saveRole(values)
      toast.success("Role created successfully.")
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      reset({ name: "", code: "", description: "", status: "Active" })
      setPermissions([])
      setPreset("custom")
      setCodeManuallyEdited(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save role.")
    }
  }

  if (isEdit && isLoadingRole) {
    return <FormSkeleton fields={["text", "text", "select"]} columns={2} />
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-16">
      <PageHeader title={isEdit ? `Edit Role — ${existingRole?.name ?? ""}` : "Add Role"} description="Define a role and the permissions it grants across the system." />

      {isEdit && existingRole?.isSystemRole && (
        <AlertBanner
          tone="warning"
          title="This is a protected system role"
          description={
            isSuperAdmin
              ? "The Super Administrator role must always retain full access. Permissions cannot be reduced for this role."
              : `Changes here affect ${affectedUserCount} user(s) currently assigned to this role. System roles cannot be deleted, but their permissions and description may be adjusted.`
          }
        />
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit(onSubmit)(e)
        }}
        noValidate
        className="space-y-5"
      >
        <FormSection title="Role Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="role-name">
                Role Name <span className="text-destructive">*</span>
              </Label>
              <Input id="role-name" placeholder="e.g. Branch Coordinator" {...register("name")} aria-invalid={!!errors.name} />
              {errors.name && <p className="text-xs font-medium text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-code">
                Role Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="role-code"
                placeholder="e.g. BRANCH_COORD"
                {...register("code")}
                onChange={(e) => {
                  setCodeManuallyEdited(true)
                  setValue("code", e.target.value, { shouldValidate: true })
                }}
                aria-invalid={!!errors.code}
              />
              {errors.code ? (
                <p className="text-xs font-medium text-destructive">{errors.code.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Auto-generated from the role name. Editable.</p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="role-description">Description</Label>
              <Textarea id="role-description" rows={2} placeholder="What is this role responsible for?" {...register("description")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-status">Status</Label>
              <CommandSelect
                className="w-full"
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as "Active" | "Inactive", { shouldDirty: true })}
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                ]}
                hideSearch
              />
            </div>
          </div>
        </FormSection>

        <FormSection title="Permission Preset" description="Choose a starting point, then fine-tune individual permissions below.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CommandSelect
              className="w-full"
              value={preset}
              onValueChange={(v) => applyPreset(v as PermissionPreset)}
              disabled={isSuperAdmin}
              options={PERMISSION_PRESETS.map((opt) => ({ value: opt.value, label: opt.label }))}
            />
            {preset === "copy_existing" && (
              <CommandSelect
                className="w-full"
                value={copySourceId}
                onValueChange={(v) => applyCopySource(v ?? "")}
                placeholder="Select a role to copy from"
                searchPlaceholder="Search roles…"
                options={allRoles.filter((r) => r.id !== id).map((r) => ({ value: r.id, label: `${r.name} (${r.permissions.length} permissions)` }))}
              />
            )}
          </div>
          {preset !== "custom" && <p className="mt-2 text-xs text-muted-foreground">{PERMISSION_PRESETS.find((p) => p.value === preset)?.description}</p>}
        </FormSection>

        <FormSection title="Permissions" description={isSuperAdmin ? "Locked — the Super Administrator always has full access." : "Check or uncheck individual permissions."}>
          <PermissionMatrix
            selected={isSuperAdmin ? ALL_PERMISSION_CODES : permissions}
            onChange={(codes) => {
              setPermissions(codes)
              setPreset("custom")
            }}
            lockedCodes={isSuperAdmin ? ALL_PERMISSION_CODES : []}
          />
        </FormSection>

        <div className="sticky bottom-0 -mx-4 flex flex-wrap justify-end gap-2 border-t border-border bg-card px-4 py-3 sm:mx-0 sm:border sm:shadow-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => (isDirty ? setShowLeaveConfirm(true) : navigate("/admin/roles"))}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {!isEdit && (
            <Button type="button" variant="secondary" disabled={isSubmitting} aria-busy={isSubmitting} onClick={handleSubmit(onSubmitAddAnother)}>
              {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Saving…" : "Save and Add Another"}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
            {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Save Role"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        title="Discard unsaved changes?"
        description="You have unsaved changes to this role. Leaving now will discard them."
        confirmLabel="Discard Changes"
        destructive
        onConfirm={() => {
          setShowLeaveConfirm(false)
          navigate("/admin/roles")
        }}
      />
    </div>
  )
}
