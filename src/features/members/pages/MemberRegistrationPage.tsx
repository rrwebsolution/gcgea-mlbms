import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { FileUploader } from "@/components/shared/FileUploader"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { BeneficiaryFieldArray } from "@/features/members/components/BeneficiaryFieldArray"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { memberSchema, type MemberFormValues } from "@/schemas/member.schema"
import { createMember, getMember, updateMember } from "@/services/members.service"
import { calculateAge, calculateDurationLabel } from "@/utils/format"
import type { DocumentCategory } from "@/types"

const DOCUMENT_CATEGORIES: DocumentCategory[] = ["Valid ID", "Appointment Document", "Payslip", "Membership Form", "Other Supporting Document"]

export default function MemberRegistrationPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: existingMember, isLoading: isLoadingMember } = useQuery({
    queryKey: ["members", id],
    queryFn: () => getMember(id!),
    enabled: isEdit,
  })

  const [isDirty, setIsDirty] = React.useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false)
  const [profilePhoto, setProfilePhoto] = React.useState<File | null>(null)
  const [documents, setDocuments] = React.useState<Partial<Record<DocumentCategory, File | null>>>({})

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      employeeNumber: "",
      surname: "",
      firstName: "",
      middleName: "",
      suffix: "",
      sex: "Male",
      birthdate: "",
      civilStatus: "Single",
      permanentAddress: "",
      cellphoneNumber: "",
      email: "",
      nameOfSpouse: "",
      officeId: "",
      position: "",
      dateOfRegularAppointment: "",
      employmentStatus: "Permanent",
      membershipType: "Regular",
      membershipDate: "",
      membershipStatus: "Active",
      retireeStatus: "Not Retired",
      remarks: "",
      beneficiaries: [],
    },
  })

  React.useEffect(() => {
    if (existingMember) {
      reset({
        memberNumber: existingMember.memberNumber,
        employeeNumber: existingMember.employeeNumber,
        surname: existingMember.surname,
        firstName: existingMember.firstName,
        middleName: existingMember.middleName ?? "",
        suffix: existingMember.suffix ?? "",
        sex: existingMember.sex,
        birthdate: existingMember.birthdate,
        civilStatus: existingMember.civilStatus,
        permanentAddress: existingMember.permanentAddress,
        cellphoneNumber: existingMember.cellphoneNumber,
        email: existingMember.email ?? "",
        nameOfSpouse: existingMember.nameOfSpouse ?? "",
        officeId: existingMember.officeId,
        position: existingMember.position,
        dateOfRegularAppointment: existingMember.dateOfRegularAppointment,
        employmentStatus: existingMember.employmentStatus,
        membershipType: existingMember.membershipType,
        membershipDate: existingMember.membershipDate,
        membershipStatus: existingMember.membershipStatus,
        retireeStatus: existingMember.retireeStatus,
        remarks: existingMember.remarks ?? "",
        beneficiaries: existingMember.beneficiaries,
      })
    }
  }, [existingMember, reset])

  React.useEffect(() => {
    setIsDirty(Object.keys(dirtyFields).length > 0)
  }, [dirtyFields])

  React.useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  const birthdate = watch("birthdate")
  const dateOfRegularAppointment = watch("dateOfRegularAppointment")
  const membershipDate = watch("membershipDate")
  const officeId = watch("officeId")

  const mutation = useMutation({
    mutationFn: async (values: MemberFormValues) => {
      const officeName = values.officeId
      const memberId = id ?? "pending"
      const payload = {
        ...values,
        officeName,
        officeId: values.officeId,
        beneficiaries: values.beneficiaries.map((b, idx) => ({
          ...b,
          id: b.id ?? `${memberId}-ben-${idx + 1}`,
          memberId,
        })),
      }
      if (isEdit && id) {
        return updateMember(id, payload)
      }
      return createMember(payload)
    },
    onSuccess: (member) => {
      toast.success(isEdit ? "Member profile updated successfully." : "Member registered successfully.")
      queryClient.invalidateQueries({ queryKey: ["members"] })
      navigate(`/members/${member.id}`)
    },
  })

  function onSubmit(values: MemberFormValues) {
    mutation.mutate(values)
  }

  function handleCancelClick() {
    if (isDirty) setShowCancelConfirm(true)
    else navigate(isEdit ? `/members/${id}` : "/members")
  }

  if (isEdit && isLoadingMember) {
    return <p className="text-sm text-muted-foreground">Loading member profile…</p>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-16">
      <PageHeader
        title={isEdit ? "Edit Member Information" : "Member Registration"}
        description="Encode the member's information based on submitted physical documents."
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <FormSection title="Section 1 · Personal Information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isEdit && (
              <div className="space-y-1.5">
                <Label>Member Number</Label>
                <Input value={existingMember?.memberNumber ?? ""} disabled />
              </div>
            )}
            <Field label="Employee Number" required error={errors.employeeNumber?.message}>
              <Input placeholder="e.g. 2024-00123" {...register("employeeNumber")} aria-invalid={!!errors.employeeNumber} />
            </Field>
            <Field label="Surname" required error={errors.surname?.message}>
              <Input placeholder="e.g. Dela Cruz" {...register("surname")} aria-invalid={!!errors.surname} />
            </Field>
            <Field label="First Name" required error={errors.firstName?.message}>
              <Input placeholder="e.g. Juan" {...register("firstName")} aria-invalid={!!errors.firstName} />
            </Field>
            <Field label="Middle Name" error={errors.middleName?.message}>
              <Input placeholder="e.g. Santos (optional)" {...register("middleName")} />
            </Field>
            <Field label="Suffix" error={errors.suffix?.message}>
              <Input placeholder="Jr., Sr., III" {...register("suffix")} />
            </Field>
            <Field label="Sex" required>
              <Select value={watch("sex")} onValueChange={(v) => setValue("sex", v as "Male" | "Female", { shouldDirty: true })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Birthdate" required error={errors.birthdate?.message}>
              <Input type="date" {...register("birthdate")} aria-invalid={!!errors.birthdate} />
            </Field>
            <Field label="Age (automatically calculated)">
              <Input value={birthdate ? `${calculateAge(birthdate)} years old` : "—"} disabled />
            </Field>
            <Field label="Civil Status" required>
              <Select value={watch("civilStatus")} onValueChange={(v) => setValue("civilStatus", v as MemberFormValues["civilStatus"], { shouldDirty: true })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married">Married</SelectItem>
                  <SelectItem value="Widowed">Widowed</SelectItem>
                  <SelectItem value="Separated">Separated</SelectItem>
                  <SelectItem value="Divorced">Divorced</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Name of Spouse">
              <Input placeholder="Full name (if married)" {...register("nameOfSpouse")} />
            </Field>
            <Field label="Cellphone Number" required error={errors.cellphoneNumber?.message}>
              <Input placeholder="09XXXXXXXXX" {...register("cellphoneNumber")} aria-invalid={!!errors.cellphoneNumber} />
            </Field>
            <Field label="Email Address" error={errors.email?.message}>
              <Input type="email" placeholder="e.g. jdelacruz@gcgea.gingoog.gov.ph" {...register("email")} aria-invalid={!!errors.email} />
            </Field>
            <Field label="Permanent Address" required error={errors.permanentAddress?.message} className="sm:col-span-2">
              <Textarea rows={2} placeholder="House/Unit No., Street, Barangay, City/Municipality" {...register("permanentAddress")} aria-invalid={!!errors.permanentAddress} />
            </Field>
          </div>
          <div className="pt-2">
            <FileUploader
              label="Profile Photo"
              description="Upload a recent 2x2 photo (JPG or PNG)."
              accept="image/*"
              fileName={profilePhoto?.name}
              onFileSelect={setProfilePhoto}
            />
          </div>
        </FormSection>

        <FormSection title="Section 2 · Employment Information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Present Office" required error={errors.officeId?.message}>
              <OfficeSelect value={officeId} onValueChange={(v) => setValue("officeId", v, { shouldDirty: true })} />
            </Field>
            <Field label="Occupation / Position" required error={errors.position?.message}>
              <Input placeholder="e.g. Administrative Officer II" {...register("position")} aria-invalid={!!errors.position} />
            </Field>
            <Field label="Date of Regular Appointment" required error={errors.dateOfRegularAppointment?.message}>
              <Input type="date" {...register("dateOfRegularAppointment")} aria-invalid={!!errors.dateOfRegularAppointment} />
            </Field>
            <Field label="Length of Government Service (automatically calculated)">
              <Input value={dateOfRegularAppointment ? calculateDurationLabel(dateOfRegularAppointment) : "—"} disabled />
            </Field>
            <Field label="Employment Status" required>
              <Select value={watch("employmentStatus")} onValueChange={(v) => setValue("employmentStatus", v as MemberFormValues["employmentStatus"], { shouldDirty: true })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Permanent">Permanent</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                  <SelectItem value="Job Order">Job Order</SelectItem>
                  <SelectItem value="Contractual">Contractual</SelectItem>
                  <SelectItem value="Co-terminus">Co-terminus</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </FormSection>

        <FormSection title="Section 3 · Membership Information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Membership Type" required>
              <Select value={watch("membershipType")} onValueChange={(v) => setValue("membershipType", v as MemberFormValues["membershipType"], { shouldDirty: true })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Associate">Associate</SelectItem>
                  <SelectItem value="Honorary">Honorary</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date as GCGEA Member" required error={errors.membershipDate?.message}>
              <Input type="date" {...register("membershipDate")} aria-invalid={!!errors.membershipDate} />
            </Field>
            <Field label="Length of Membership (automatically calculated)">
              <Input value={membershipDate ? calculateDurationLabel(membershipDate) : "—"} disabled />
            </Field>
            <Field label="Membership Status" required>
              <Select value={watch("membershipStatus")} onValueChange={(v) => setValue("membershipStatus", v as MemberFormValues["membershipStatus"], { shouldDirty: true })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                  <SelectItem value="Terminated">Terminated</SelectItem>
                  <SelectItem value="Deceased">Deceased</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Retiree Status" required>
              <Select value={watch("retireeStatus")} onValueChange={(v) => setValue("retireeStatus", v as MemberFormValues["retireeStatus"], { shouldDirty: true })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Retired">Not Retired</SelectItem>
                  <SelectItem value="Retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Remarks" className="sm:col-span-2">
              <Textarea rows={2} placeholder="Additional notes about this member (optional)" {...register("remarks")} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Section 4 · Beneficiaries" description="Add one or more beneficiaries for this member.">
          <BeneficiaryFieldArray control={control} register={register} errors={errors} />
        </FormSection>

        <FormSection title="Section 5 · Documents" description="Upload scanned copies of supporting documents.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {DOCUMENT_CATEGORIES.map((category) => (
              <FileUploader
                key={category}
                label={category}
                fileName={documents[category]?.name}
                onFileSelect={(file) => setDocuments((prev) => ({ ...prev, [category]: file }))}
              />
            ))}
          </div>
        </FormSection>

        <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-border bg-card px-4 py-3 sm:mx-0 sm:rounded-xl sm:border sm:shadow-sm">
          <Button type="button" variant="outline" onClick={handleCancelClick} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
            {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Register Member"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Discard unsaved changes?"
        description="You have unsaved changes on this form. If you leave now, your changes will be lost."
        confirmLabel="Discard Changes"
        destructive
        onConfirm={() => {
          setShowCancelConfirm(false)
          navigate(isEdit ? `/members/${id}` : "/members")
        }}
      />
    </div>
  )
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}
