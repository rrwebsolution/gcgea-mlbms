import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Save, Sparkles, User, FileText, Briefcase, FilePlus2, Landmark, X, Eye } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { OfficeCommandSelect } from "@/components/shared/OfficeCommandSelect"
import { FileUploader } from "@/components/shared/FileUploader"
import { DocumentGallery, type DocumentGalleryItem } from "@/components/shared/DocumentGallery"
import { ImagePreviewDialog } from "@/components/shared/ImagePreviewDialog"
import { PDFPreviewDialog } from "@/components/shared/PDFPreviewDialog"
import { AddressCommandSelect } from "@/components/shared/AddressCommandSelect"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { FormSkeleton } from "@/components/shared/loaders/FormSkeleton"
import { SaveDraftButton } from "@/components/shared/SaveDraftButton"
import { DraftStatusBadge } from "@/components/shared/DraftStatusBadge"
import { DraftCompletionBar } from "@/components/shared/DraftCompletionBar"
import { UnsavedChangesDialog } from "@/components/shared/UnsavedChangesDialog"
import { BeneficiaryFieldArray } from "@/features/members/components/BeneficiaryFieldArray"
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { useDraft } from "@/hooks/useDraft"
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft"
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { memberSchema, type MemberFormValues } from "@/schemas/member.schema"
import {
  createMember,
  createMemberDraft,
  deleteMemberDocument,
  getMember,
  removeMemberPhoto,
  submitMemberDraft,
  updateMember,
  updateMemberDraft,
  uploadMemberDocument,
  uploadMemberPhoto,
  type MemberDraftInput,
} from "@/services/members.service"
import { calculateAge, calculateDurationLabel, formatDateShort } from "@/utils/format"
import { listEmploymentStatuses } from "@/services/employment-statuses.service"
import { DOCUMENT_EXTENSIONS, DOCUMENT_MIME_TYPES, IMAGE_EXTENSIONS, IMAGE_MIME_TYPES, isImageFile, isPdfFile, type UploadStatus } from "@/lib/upload-validation"
import { cn } from "@/lib/utils"
import type { ApiValidationError } from "@/lib/api"
import type { DocumentCategory, Member } from "@/types"

const DOCUMENT_CATEGORIES: DocumentCategory[] = ["Valid ID", "Appointment Document", "Payslip", "Membership Form", "Other Supporting Document"]

interface SlotState {
  status: UploadStatus
  progress: number
}

const IDLE_SLOT: SlotState = { status: "idle", progress: 0 }

function basenameFromUrl(url?: string): string | undefined {
  if (!url) return undefined
  try {
    const path = new URL(url).pathname
    return decodeURIComponent(path.split("/").pop() || "profile-photo")
  } catch {
    return "profile-photo"
  }
}

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
  const { data: employmentStatuses = [] } = useQuery({
    queryKey: ["employment-statuses"],
    queryFn: listEmploymentStatuses,
  })

  useBreadcrumbExtra(isEdit ? existingMember?.fullName : undefined)

  const [isDirty, setIsDirty] = React.useState(false)
  const [completionPercentage, setCompletionPercentage] = React.useState<number | undefined>(existingMember?.draftCompletionPercentage)
  const [profilePhoto, setProfilePhoto] = React.useState<File | null>(null)
  const [documents, setDocuments] = React.useState<Partial<Record<DocumentCategory, File | null>>>({})
  const [otherDocuments, setOtherDocuments] = React.useState<File[]>([])
  const [validIdError, setValidIdError] = React.useState(false)
  const [appointmentDocumentError, setAppointmentDocumentError] = React.useState(false)
  const [membershipFormError, setMembershipFormError] = React.useState(false)
  const [payslipError, setPayslipError] = React.useState(false)
  const [selectedLocationLabel, setSelectedLocationLabel] = React.useState<string | undefined>()

  const [photoSlot, setPhotoSlot] = React.useState<SlotState>(IDLE_SLOT)
  const [docSlots, setDocSlots] = React.useState<Record<DocumentCategory, SlotState>>(
    Object.fromEntries(DOCUMENT_CATEGORIES.map((c) => [c, IDLE_SLOT])) as Record<DocumentCategory, SlotState>
  )
  const [photoResetKey, setPhotoResetKey] = React.useState(0)
  const [docResetKeys, setDocResetKeys] = React.useState<Record<DocumentCategory, number>>(
    Object.fromEntries(DOCUMENT_CATEGORIES.map((c) => [c, 0])) as Record<DocumentCategory, number>
  )
  const [removeTarget, setRemoveTarget] = React.useState<
    { kind: "photo" } | { kind: "document"; category: DocumentCategory; documentId: string } | null
  >(null)

  const photoAbortRef = React.useRef<AbortController | null>(null)
  const docAbortRefs = React.useRef<Partial<Record<DocumentCategory, AbortController>>>({})

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    control,
    reset,
    setError,
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
      employmentStatus: "",
      membershipType: "Regular",
      membershipDate: "",
      membershipStatus: "Active",
      netPay: undefined,
      retireeStatus: "Not Retired",
      remarks: "",
      beneficiaries: [],
    },
  })

  React.useEffect(() => {
    if (existingMember) {
      reset({
        memberNumber: existingMember.memberNumber,
        employeeNumber: existingMember.employeeNumber ?? "",
        surname: existingMember.surname ?? "",
        firstName: existingMember.firstName ?? "",
        middleName: existingMember.middleName ?? "",
        suffix: existingMember.suffix ?? "",
        sex: existingMember.sex ?? "Male",
        birthdate: existingMember.birthdate ?? "",
        civilStatus: existingMember.civilStatus ?? "Single",
        permanentAddress: existingMember.permanentAddress ?? "",
        cellphoneNumber: existingMember.cellphoneNumber ?? "",
        email: existingMember.email ?? "",
        nameOfSpouse: existingMember.nameOfSpouse ?? "",
        officeId: existingMember.officeId ?? "",
        position: existingMember.position ?? "",
        dateOfRegularAppointment: existingMember.dateOfRegularAppointment ?? "",
        employmentStatus: existingMember.employmentStatus ?? "Permanent",
        membershipType: existingMember.membershipType ?? "Regular",
        membershipDate: existingMember.membershipDate ?? "",
        membershipStatus: existingMember.membershipStatus ?? "Active",
        netPay: existingMember.netPay ?? undefined,
        retireeStatus: existingMember.retireeStatus ?? "Not Retired",
        remarks: existingMember.remarks ?? "",
        beneficiaries: existingMember.beneficiaries,
      }, {
        // Live photo/document uploads refresh the member query. Preserve
        // fields the user has already changed (especially Monthly Net Pay)
        // so that refresh cannot replace unsaved form input with the older
        // value still stored on the server.
        keepDirtyValues: true,
      })
      setCompletionPercentage(existingMember.draftCompletionPercentage)
    }
  }, [existingMember, reset])

  React.useEffect(() => {
    if (isEdit || employmentStatuses.length === 0 || getValues("employmentStatus")) return
    const firstActiveStatus = employmentStatuses.find((status) => status.isActive)
    if (firstActiveStatus) {
      setValue("employmentStatus", firstActiveStatus.name, { shouldDirty: false })
    }
  }, [employmentStatuses, getValues, isEdit, setValue])

  React.useEffect(() => {
    setIsDirty(Object.keys(dirtyFields).length > 0)
  }, [dirtyFields])

  const { showPrompt: showUnsavedPrompt, promptLeave, resolvePrompt } = useUnsavedChanges(isDirty)

  const birthdate = watch("birthdate")
  const dateOfRegularAppointment = watch("dateOfRegularAppointment")
  const membershipDate = watch("membershipDate")
  const civilStatus = watch("civilStatus")
  const officeId = watch("officeId")
  const permanentAddress = watch("permanentAddress")

  // ---- Profile photo: live mutations (edit mode only) ----
  const photoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      photoAbortRef.current = new AbortController()
      setPhotoSlot({ status: "uploading", progress: 0 })
      return uploadMemberPhoto(id!, file, (progress) => setPhotoSlot({ status: "uploading", progress }), photoAbortRef.current.signal)
    },
    onSuccess: (member) => {
      setPhotoSlot({ status: "uploaded", progress: 100 })
      queryClient.setQueryData(["members", id], member)
      queryClient.invalidateQueries({ queryKey: ["members"] })
      toast.success("Profile photo updated.")
    },
    onError: (err: Error) => {
      if (err.name === "CanceledError" || err.message === "canceled") {
        setPhotoSlot(IDLE_SLOT)
        setPhotoResetKey((k) => k + 1)
        return
      }
      setPhotoSlot({ status: "failed", progress: 0 })
      toast.error(err.message || "Failed to upload profile photo.")
    },
  })

  const photoRemoveMutation = useMutation({
    mutationFn: () => removeMemberPhoto(id!),
    onSuccess: (member) => {
      setPhotoSlot(IDLE_SLOT)
      setPhotoResetKey((k) => k + 1)
      queryClient.setQueryData(["members", id], member)
      queryClient.invalidateQueries({ queryKey: ["members"] })
      toast.success("Profile photo removed.")
    },
    onError: (err: Error) => toast.error(err.message || "Failed to remove profile photo."),
  })

  // ---- Documents: live mutations (edit mode only) ----
  const documentUploadMutation = useMutation({
    mutationFn: async ({ category, file, existingDocId }: { category: DocumentCategory; file: File; existingDocId?: string }) => {
      const controller = new AbortController()
      docAbortRefs.current[category] = controller
      setDocSlots((prev) => ({ ...prev, [category]: { status: "uploading", progress: 0 } }))
      // Keep the existing document until its replacement has uploaded
      // successfully. This prevents a failed/cancelled replacement from
      // permanently removing the member's current file.
      let member = await uploadMemberDocument(
        id!,
        category,
        file,
        (progress) => setDocSlots((prev) => ({ ...prev, [category]: { status: "uploading", progress } })),
        controller.signal
      )
      if (existingDocId) {
        await deleteMemberDocument(id!, existingDocId)
        member = (await getMember(id!)) ?? member
      }
      return member
    },
    onSuccess: (member, variables) => {
      setDocSlots((prev) => ({ ...prev, [variables.category]: { status: "uploaded", progress: 100 } }))
      queryClient.setQueryData(["members", id], member)
      queryClient.invalidateQueries({ queryKey: ["members"] })
      toast.success("Document uploaded.")
    },
    onError: (err: Error, variables) => {
      if (err.name === "CanceledError" || err.message === "canceled") {
        setDocSlots((prev) => ({ ...prev, [variables.category]: IDLE_SLOT }))
        setDocResetKeys((prev) => ({ ...prev, [variables.category]: prev[variables.category] + 1 }))
        return
      }
      setDocSlots((prev) => ({ ...prev, [variables.category]: { status: "failed", progress: 0 } }))
      toast.error(err.message || "Failed to upload document.")
    },
  })

  const documentRemoveMutation = useMutation({
    mutationFn: async ({ category, documentId }: { category: DocumentCategory; documentId: string }) => {
      await deleteMemberDocument(id!, documentId)
      return category
    },
    onSuccess: (category) => {
      setDocSlots((prev) => ({ ...prev, [category]: IDLE_SLOT }))
      setDocResetKeys((prev) => ({ ...prev, [category]: prev[category] + 1 }))
      queryClient.invalidateQueries({ queryKey: ["members", id] })
      queryClient.invalidateQueries({ queryKey: ["members"] })
      toast.success("Document removed.")
    },
    onError: (err: Error) => toast.error(err.message || "Failed to remove document."),
  })

  const otherDocumentsUploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      let member = existingMember!
      for (const file of files) {
        member = await uploadMemberDocument(id!, "Other Supporting Document", file)
      }
      return (await getMember(id!)) ?? member
    },
    onSuccess: (member) => {
      queryClient.setQueryData(["members", id], member)
      queryClient.invalidateQueries({ queryKey: ["members"] })
      toast.success("Supporting documents uploaded.")
    },
    onError: (err: Error) => toast.error(err.message || "Failed to upload supporting documents."),
  })

  function handlePhotoUpload(file: File) {
    if (isEdit) {
      photoUploadMutation.mutate(file)
    } else {
      setProfilePhoto(file)
      setPhotoSlot(IDLE_SLOT)
    }
  }

  function handlePhotoRemoveClick() {
    if (isEdit && existingMember?.profilePhotoUrl) {
      setRemoveTarget({ kind: "photo" })
    } else {
      setProfilePhoto(null)
      setPhotoSlot(IDLE_SLOT)
      setPhotoResetKey((k) => k + 1)
    }
  }

  function handleDocumentUpload(category: DocumentCategory, file: File) {
    if (category === "Valid ID") setValidIdError(false)
    if (category === "Appointment Document") setAppointmentDocumentError(false)
    if (category === "Membership Form") setMembershipFormError(false)
    if (category === "Payslip") setPayslipError(false)
    if (isEdit) {
      const existingDoc = existingMember?.documents.find((d) => d.category === category)
      documentUploadMutation.mutate({ category, file, existingDocId: existingDoc?.id })
    } else {
      setDocuments((prev) => ({ ...prev, [category]: file }))
      setDocSlots((prev) => ({ ...prev, [category]: IDLE_SLOT }))
    }
  }

  function handleDocumentRemoveClick(category: DocumentCategory) {
    const existingDoc = existingMember?.documents.find((d) => d.category === category)
    if (isEdit && existingDoc) {
      setRemoveTarget({ kind: "document", category, documentId: existingDoc.id })
    } else {
      setDocuments((prev) => ({ ...prev, [category]: null }))
      setDocSlots((prev) => ({ ...prev, [category]: IDLE_SLOT }))
      setDocResetKeys((prev) => ({ ...prev, [category]: prev[category] + 1 }))
    }
  }

  function confirmRemove() {
    if (!removeTarget) return
    if (removeTarget.kind === "photo") {
      photoRemoveMutation.mutate(undefined, { onSettled: () => setRemoveTarget(null) })
    } else {
      documentRemoveMutation.mutate(
        { category: removeTarget.category, documentId: removeTarget.documentId },
        { onSettled: () => setRemoveTarget(null) }
      )
    }
  }

  const isAnyLiveUploadInProgress = photoSlot.status === "uploading" || Object.values(docSlots).some((s) => s.status === "uploading") || otherDocumentsUploadMutation.isPending

  const wasExistingDraft = isEdit ? existingMember?.isDraft === true : false
  const memberDraft = useDraft<MemberDraftInput, Member>({
    draftId: wasExistingDraft ? id : undefined,
    create: createMemberDraft,
    update: updateMemberDraft,
    getId: (m) => m.id,
    onSaved: (m) => {
      setCompletionPercentage(m.draftCompletionPercentage)
      queryClient.setQueryData(["members", m.id], m)
      queryClient.invalidateQueries({ queryKey: ["members"] })
    },
    onError: (err) => {
      const apiError = err as ApiValidationError
      toast.error(apiError.message || "Failed to save draft.")
    },
  })
  const isDraftContext = wasExistingDraft || Boolean(memberDraft.draftId)

  async function saveDraft() {
    const values = getValues()
    const payload: MemberDraftInput = { ...values, beneficiaries: values.beneficiaries, asDraft: true }
    try {
      await memberDraft.save(payload)
      toast.success("Draft saved successfully.")
    } catch {}
  }

  useAutosaveDraft(
    watch(),
    async (values) => {
      const payload: MemberDraftInput = { ...values, beneficiaries: values.beneficiaries, asDraft: true }
      try {
        await memberDraft.save(payload, { silent: true })
      } catch {
        // already surfaced via memberDraft's onError toast
      }
    },
    {
      enabled: isDirty && Boolean(memberDraft.draftId) && !isAnyLiveUploadInProgress && (!isEdit || wasExistingDraft) && memberDraft.status !== "saving",
      delayMs: 30000,
    }
  )

  const mutation = useMutation({
    mutationFn: async (values: MemberFormValues) => {
      const payload = { ...values, beneficiaries: values.beneficiaries }
      const targetId = id ?? memberDraft.draftId
      let member = !targetId
        ? await createMember(payload)
        : isDraftContext
          ? await submitMemberDraft(targetId, payload)
          : await updateMember(targetId, payload)
      const uploadFailures: string[] = []

      if (!isEdit) {
        if (profilePhoto) {
          setPhotoSlot({ status: "uploading", progress: 0 })
          try {
            member = await uploadMemberPhoto(member.id, profilePhoto, (progress) => setPhotoSlot({ status: "uploading", progress }))
            setPhotoSlot({ status: "uploaded", progress: 100 })
          } catch {
            setPhotoSlot({ status: "failed", progress: 0 })
            uploadFailures.push("Profile Photo")
          }
        }
        for (const [category, file] of Object.entries(documents) as [DocumentCategory, File | null][]) {
          if (!file) continue
          setDocSlots((prev) => ({ ...prev, [category]: { status: "uploading", progress: 0 } }))
          try {
            member = await uploadMemberDocument(member.id, category, file, (progress) => setDocSlots((prev) => ({ ...prev, [category]: { status: "uploading", progress } })))
            setDocSlots((prev) => ({ ...prev, [category]: { status: "uploaded", progress: 100 } }))
          } catch {
            setDocSlots((prev) => ({ ...prev, [category]: { status: "failed", progress: 0 } }))
            uploadFailures.push(category)
          }
        }
        for (const file of otherDocuments) {
          try {
            member = await uploadMemberDocument(member.id, "Other Supporting Document", file)
          } catch {
            uploadFailures.push(file.name)
          }
        }
      }

      // Always use the authoritative server response after all attachments.
      // The create/update response predates document uploads and otherwise
      // overwrites the detail cache with an empty documents array.
      member = (await getMember(member.id)) ?? member
      return { member, uploadFailures }
    },
    onSuccess: ({ member, uploadFailures }) => {
      queryClient.setQueryData(["members", member.id], member)
      if (uploadFailures.length > 0) {
        toast.warning(`Member saved, but these files could not be uploaded: ${uploadFailures.join(", ")}. Open Edit Member Information to retry.`)
      } else {
        toast.success(
          isEdit
            ? "Member profile updated successfully."
            : member.approvalStatus === "approved"
              ? "Member successfully registered and activated."
              : "Member registration was submitted for approval."
        )
      }
      queryClient.invalidateQueries({ queryKey: ["members"] })
      navigate(`/members/${member.id}`)
    },
    onError: (error: unknown) => {
      const apiError = error as ApiValidationError
      if (apiError.errors) {
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          setError(field as never, { type: "server", message: messages[0] })
        })
      }
      toast.error(apiError.message || "Failed to save member profile. Please review the highlighted fields and try again.")
    },
  })

  const isSaving = isSubmitting || mutation.isPending

  async function onSubmit(values: MemberFormValues) {
    const hasValidId = Boolean(
      documents["Valid ID"]
      || existingMember?.documents.some((document) => document.category === "Valid ID")
    )
    const hasAppointmentDocument = Boolean(
      documents["Appointment Document"]
      || existingMember?.documents.some((document) => document.category === "Appointment Document")
    )
    const hasMembershipForm = Boolean(
      documents["Membership Form"]
      || existingMember?.documents.some((document) => document.category === "Membership Form")
    )
    const requiresPayslip = Number(values.netPay ?? 0) > 0
    const hasPayslip = Boolean(
      documents.Payslip
      || existingMember?.documents.some((document) => document.category === "Payslip")
    )
    if (!hasValidId) {
      setValidIdError(true)
      toast.error("Valid ID is required. Upload the document in Section 5 before saving.")
      return
    }
    setValidIdError(false)
    if (!hasAppointmentDocument) {
      setAppointmentDocumentError(true)
      toast.error("Appointment Document is required under Employment Documents.")
      return
    }
    setAppointmentDocumentError(false)
    if (!hasMembershipForm) {
      setMembershipFormError(true)
      toast.error("Membership Form is required under Membership Documents.")
      return
    }
    setMembershipFormError(false)
    if (requiresPayslip && !hasPayslip) {
      setPayslipError(true)
      toast.error("Net Take Home Pay is required when Monthly Net Pay is provided.")
      return
    }
    setPayslipError(false)
    try {
      await mutation.mutateAsync(values)
    } catch {}
  }

  function handleCancelClick() {
    promptLeave(() => navigate(isEdit ? `/members/${id}` : "/members"))
  }

  if (isEdit && isLoadingMember) {
    return <FormSkeleton fields={["text", "text", "text", "select", "date", "select"]} columns={3} showAvatar showUpload />
  }

  const photoHasFile = Boolean(profilePhoto || existingMember?.profilePhotoUrl)
  const photoDisplayStatus: UploadStatus = photoSlot.status !== "idle" ? photoSlot.status : photoHasFile ? "uploaded" : "idle"

  const hasMonthlyNetPay = Number(watch("netPay") ?? 0) > 0
  const hasNetTakeHomePayDocument = Boolean(
    documents.Payslip
    || existingMember?.documents.some((document) => document.category === "Payslip")
  )
  const visibleDocumentCategories = DOCUMENT_CATEGORIES.filter(
    (category) => category !== "Payslip" || hasMonthlyNetPay || hasNetTakeHomePayDocument
  )
  const documentGalleryItems: DocumentGalleryItem[] = visibleDocumentCategories.filter((category) => category !== "Other Supporting Document").map((category) => {
    const existingDoc = existingMember?.documents.find((d) => d.category === category)
    const hasFile = Boolean(documents[category] || existingDoc)
    const slot = docSlots[category]
    const displayStatus: UploadStatus = slot.status !== "idle" ? slot.status : hasFile ? "uploaded" : "idle"

    return {
      category,
      node: (
        <div className="rounded-xl border border-border/60 bg-card p-1 transition-all hover:border-border hover:shadow-xs">
          <FileUploader
            key={`${category}-${docResetKeys[category]}`}
            label={category === "Payslip" ? "Net Take Home Pay" : category}
            required={
              category === "Valid ID"
              || category === "Appointment Document"
              || category === "Membership Form"
              || (category === "Payslip" && hasMonthlyNetPay)
            }
            accept={DOCUMENT_MIME_TYPES}
            acceptExtensions={DOCUMENT_EXTENSIONS}
            fileName={existingDoc?.fileName}
            fileUrl={existingDoc?.fileUrl}
            uploadedAt={existingDoc ? formatDateShort(existingDoc.uploadedAt) : undefined}
            status={displayStatus}
            progress={slot.progress}
            onUpload={(file) => handleDocumentUpload(category, file)}
            onReplace={(file) => handleDocumentUpload(category, file)}
            onRemove={hasFile ? () => handleDocumentRemoveClick(category) : undefined}
            onCancel={() => {
              docAbortRefs.current[category]?.abort()
            }}
          />
        </div>
      ),
    }
  })
  const existingOtherDocuments = existingMember?.documents.filter((document) => document.category === "Other Supporting Document") ?? []
  documentGalleryItems.push({
    category: "Other Supporting Document",
    node: (
      <div className="rounded-xl border border-border/60 bg-card p-3 space-y-3 transition-all hover:border-border hover:shadow-xs">
        <FileUploader
          label="Other Supporting Documents (optional)"
          description="Upload one or more optional images or documents."
          accept={DOCUMENT_MIME_TYPES}
          acceptExtensions={DOCUMENT_EXTENSIONS}
          multiple
          disabled={otherDocumentsUploadMutation.isPending}
          onFilesSelect={(files) => {
            if (isEdit) {
              otherDocumentsUploadMutation.mutate(files)
              return
            }
            setOtherDocuments((current) => {
              const known = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`))
              return [...current, ...files.filter((file) => !known.has(`${file.name}:${file.size}:${file.lastModified}`))]
            })
          }}
        />
        {(existingOtherDocuments.length > 0 || otherDocuments.length > 0) && (
          <div className="space-y-2">
            {existingOtherDocuments.map((document) => (
              <OtherDocumentRow key={document.id} name={document.fileName} url={document.fileUrl} status={`Uploaded ${formatDateShort(document.uploadedAt)}`} onRemove={() => setRemoveTarget({ kind: "document", category: document.category, documentId: document.id })} />
            ))}
            {otherDocuments.map((file) => (
              <OtherDocumentRow key={`${file.name}-${file.size}-${file.lastModified}`} file={file} status="Ready to upload" onRemove={() => setOtherDocuments((current) => current.filter((item) => item !== file))} />
            ))}
          </div>
        )}
      </div>
    ),
  })

  return (
    <div className="mx-auto space-y-8 pb-20 px-4 sm:px-0">
      <PageHeader
        title={isDraftContext ? "Continue Member Draft" : isEdit ? "Edit Member Information" : "Member Registration"}
        description="Encode the member's information based on submitted physical documents."
        actions={isDraftContext && <DraftStatusBadge status="Draft" />}
      />

      {isDraftContext && (
        <div className="rounded-xl border border-warning/20 bg-warning/5 px-5 py-4 shadow-sm flex flex-col gap-2.5 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-warning" />
          <div className="flex items-center gap-2 pl-2">
            <Sparkles className="size-4 text-warning animate-pulse" />
            <p className="text-xs font-semibold text-foreground">
              {(isEdit ? existingMember?.draftReferenceNo : undefined) ?? "Draft Registration Progress"}
            </p>
          </div>
          <DraftCompletionBar percentage={completionPercentage ?? 0} className="mt-1 pl-2" />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        
        {/* SECTION 1: Personal Information */}
        <FormSection 
          title={
            <span className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-background border border-border/60 shadow-xs">
                <User className="size-4 text-primary" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">Section 1 · Personal Information</span>
            </span>
          }
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Input fields panel */}
            <div className="lg:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {isEdit && (
                <Field label="Member Number">
                  <Input value={existingMember?.memberNumber ?? ""} disabled className="bg-muted/40 font-mono text-sm" />
                </Field>
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
                <CommandSelect
                  className="w-full h-10"
                  value={watch("sex")}
                  onValueChange={(v) => setValue("sex", v as "Male" | "Female", { shouldDirty: true })}
                  options={[
                    { value: "Male", label: "Male" },
                    { value: "Female", label: "Female" },
                  ]}
                  placeholder="Select sex"
                  hideSearch
                />
              </Field>
              <Field label="Birthdate" required error={errors.birthdate?.message}>
                <Input type="date" {...register("birthdate")} aria-invalid={!!errors.birthdate} />
              </Field>
              <Field label="Age" isCalculated>
                <Input 
                  value={birthdate ? `${calculateAge(birthdate)} years old` : "—"} 
                  disabled 
                  className="bg-muted/10 border-dashed border-amber-500/30 text-foreground/80 font-medium cursor-not-allowed select-none"
                />
              </Field>
              <Field label="Civil Status" required>
                <CommandSelect
                  className="w-full h-10"
                  value={watch("civilStatus")}
                  onValueChange={(v) => setValue("civilStatus", v as MemberFormValues["civilStatus"], { shouldDirty: true })}
                  options={[
                    { value: "Single", label: "Single" },
                    { value: "Married", label: "Married" },
                    { value: "Widowed", label: "Widowed" },
                    { value: "Separated", label: "Separated" },
                    { value: "Divorced", label: "Divorced" },
                  ]}
                  placeholder="Select civil status"
                  hideSearch
                />
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
                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/5 p-4 shadow-sm transition-all hover:bg-muted/10 duration-200">
                  <AddressCommandSelect
                    value={selectedLocationLabel}
                    placeholder="Search barangay, city, municipality, or province…"
                    onSelect={(formatted) => {
                      setSelectedLocationLabel(formatted)
                      const base = (permanentAddress ?? "").replace(/,\s*[^,]+,\s*[^,]+$/, "").trim()
                      const combined = base ? `${base}, ${formatted}` : formatted
                      setValue("permanentAddress", combined, { shouldDirty: true, shouldValidate: true })
                    }}
                  />
                  <Textarea
                    rows={2}
                    placeholder="House/Unit No., Street, Barangay"
                    {...register("permanentAddress")}
                    aria-invalid={!!errors.permanentAddress}
                    className="bg-background shadow-none resize-none"
                  />
                </div>
              </Field>
            </div>

            {/* Profile photo uploader panel */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-4 bg-muted/5 rounded-xl border border-border/50 p-4 shadow-xs">
                <FileUploader
                  key={`photo-${photoResetKey}`}
                  label="Profile Photo"
                  description="Upload a recent 2x2 photo."
                  variant="avatar"
                  accept={IMAGE_MIME_TYPES}
                  acceptExtensions={IMAGE_EXTENSIONS}
                  fileName={profilePhoto?.name ?? basenameFromUrl(existingMember?.profilePhotoUrl)}
                  fileUrl={existingMember?.profilePhotoUrl}
                  status={photoDisplayStatus}
                  progress={photoSlot.progress}
                  onUpload={handlePhotoUpload}
                  onReplace={handlePhotoUpload}
                  onRemove={photoHasFile ? handlePhotoRemoveClick : undefined}
                  onCancel={() => photoAbortRef.current?.abort()}
                />
              </div>
            </div>
          </div>
        </FormSection>

        {/* SECTION 2: Employment Information */}
        <FormSection 
          title={
            <span className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-background border border-border/60 shadow-xs">
                <Briefcase className="size-4 text-primary" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">Section 2 · Employment Information</span>
            </span>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Present Office" required error={errors.officeId?.message}>
              <OfficeCommandSelect value={officeId} onValueChange={(v) => setValue("officeId", v, { shouldDirty: true })} valueField="id" />
            </Field>
            <Field label="Occupation / Position" required error={errors.position?.message}>
              <Input placeholder="e.g. Administrative Officer II" {...register("position")} aria-invalid={!!errors.position} />
            </Field>
            <Field label="Date of Regular Appointment" required error={errors.dateOfRegularAppointment?.message}>
              <Input type="date" {...register("dateOfRegularAppointment")} aria-invalid={!!errors.dateOfRegularAppointment} />
            </Field>
            <Field label="Length of Government Service" isCalculated>
              <Input 
                value={dateOfRegularAppointment ? calculateDurationLabel(dateOfRegularAppointment) : "—"} 
                disabled 
                className="bg-muted/10 border-dashed border-amber-500/30 text-foreground/80 font-medium cursor-not-allowed select-none"
              />
            </Field>
            <Field label="Employment Status" required error={errors.employmentStatus?.message}>
              <CommandSelect
                className="w-full h-10"
                value={watch("employmentStatus")}
                onValueChange={(v) => setValue("employmentStatus", v as MemberFormValues["employmentStatus"], { shouldDirty: true })}
                options={employmentStatuses
                  .filter((status) => status.isActive || status.name === watch("employmentStatus"))
                  .map((status) => ({ value: status.name, label: status.name }))}
                placeholder="Select employment status"
                hideSearch
              />
            </Field>
          </div>
        </FormSection>

        {/* SECTION 3: Membership Information */}
        <FormSection 
          title={
            <span className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-background border border-border/60 shadow-xs">
                <Landmark className="size-4 text-primary" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">Section 3 · Membership Information</span>
            </span>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Membership Type" required>
              <CommandSelect
                className="w-full h-10"
                value={watch("membershipType")}
                onValueChange={(v) => setValue("membershipType", v as MemberFormValues["membershipType"], { shouldDirty: true })}
                options={[
                  { value: "Regular", label: "Regular" },
                  { value: "Associate", label: "Associate" },
                  { value: "Honorary", label: "Honorary" },
                ]}
                placeholder="Select membership type"
                hideSearch
              />
            </Field>
            <Field label="Date as GCGEA Member" required error={errors.membershipDate?.message}>
              <Input type="date" {...register("membershipDate")} aria-invalid={!!errors.membershipDate} />
            </Field>
            <Field label="Length of Membership" isCalculated>
              <Input 
                value={membershipDate ? calculateDurationLabel(membershipDate) : "—"} 
                disabled 
                className="bg-muted/10 border-dashed border-amber-500/30 text-foreground/80 font-medium cursor-not-allowed select-none"
              />
            </Field>
            <Field label="Membership Status" required>
              <CommandSelect
                className="w-full h-10"
                value={watch("membershipStatus")}
                onValueChange={(v) => setValue("membershipStatus", v as MemberFormValues["membershipStatus"], { shouldDirty: true })}
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                  { value: "Suspended", label: "Suspended" },
                  { value: "Terminated", label: "Terminated" },
                  { value: "Deceased", label: "Deceased" },
                ]}
                placeholder="Select membership status"
                hideSearch
              />
            </Field>
            <Field label="Retiree Status" required>
              <CommandSelect
                className="w-full h-10"
                value={watch("retireeStatus")}
                onValueChange={(v) => setValue("retireeStatus", v as MemberFormValues["retireeStatus"], { shouldDirty: true })}
                options={[
                  { value: "Not Retired", label: "Not Retired" },
                  { value: "Retired", label: "Retired" },
                ]}
                placeholder="Select retiree status"
                hideSearch
              />
            </Field>
            <Field label="Monthly Net Pay" error={errors.netPay?.message}>
              <CurrencyInput value={watch("netPay")} onChange={(v) => setValue("netPay", v, { shouldDirty: true })} placeholder="Optional — used for income-tiered loan products" />
            </Field>
            <Field label="Remarks" className="sm:col-span-2">
              <Textarea rows={2} placeholder="Additional notes about this member (optional)" {...register("remarks")} className="bg-background" />
            </Field>
          </div>
        </FormSection>

        {/* SECTION 4: Beneficiaries */}
        <FormSection title="Section 4 · Beneficiaries" description="Add one or more beneficiaries for this member.">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
            <BeneficiaryFieldArray control={control} register={register} errors={errors} civilStatus={civilStatus} />
          </div>
        </FormSection>

        {/* SECTION 5: Documents */}
        <FormSection 
          title={
            <span className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-background border border-border/60 shadow-xs">
                <FileText className="size-4 text-primary" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">Section 5 · Documents</span>
            </span>
          } 
          description="Upload scanned copies of supporting documents."
        >
          <div className="rounded-xl border border-border bg-muted/15 p-4 sm:p-6 shadow-sm">
            {validIdError && (
              <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
                Valid ID is required. Upload a PDF or image before saving the member.
              </p>
            )}
            {appointmentDocumentError && (
              <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
                Appointment Document is required under Employment Documents.
              </p>
            )}
            {membershipFormError && (
              <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
                Membership Form is required under Membership Documents.
              </p>
            )}
            {payslipError && hasMonthlyNetPay && (
              <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
                Net Take Home Pay is required because Monthly Net Pay has been provided.
              </p>
            )}
            <DocumentGallery items={documentGalleryItems} />
          </div>
        </FormSection>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-4 z-15 flex items-center justify-end gap-3 border border-border/65 bg-background/80 backdrop-blur-md px-6 py-4 shadow-lg transition-all duration-200">
          {isAnyLiveUploadInProgress && (
            <p className="mr-auto text-xs text-muted-foreground flex items-center gap-1.5 animate-pulse">
              <span className="size-1.5 rounded-full bg-primary animate-ping" />
              Waiting for uploads to finish…
            </p>
          )}
          <Button type="button" variant="outline" onClick={handleCancelClick} disabled={isSaving} className="h-9 text-xs">
            Cancel
          </Button>
          {(!isEdit || wasExistingDraft) && (
            <SaveDraftButton
              status={memberDraft.status}
              lastSavedAt={memberDraft.lastSavedAt}
              onClick={saveDraft}
              label="Save as Draft"
              disabled={isSaving || isAnyLiveUploadInProgress}
            />
          )}
          <Button type="submit" variant="success" disabled={isSaving || isAnyLiveUploadInProgress} aria-busy={isSaving} className="h-9 text-xs gap-1.5 shadow-sm active:scale-97 transition-all">
            {isSaving ? <Loader2 className="animate-spin size-4" aria-hidden="true" /> : isDraftContext ? <FilePlus2 className="size-4" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
            {isSaving ? "Saving changes…" : isDraftContext ? "Submit Registration" : isEdit ? "Save Changes" : "Register Member"}
          </Button>
        </div>
      </form>

      {/* Dialog: Unsaved changes on leave */}
      <UnsavedChangesDialog
        open={showUnsavedPrompt}
        onOpenChange={(open) => !open && resolvePrompt("stay")}
        isSaving={memberDraft.status === "saving"}
        onSaveAndLeave={async () => {
          await saveDraft()
          resolvePrompt("leave")
        }}
        onLeaveWithoutSaving={() => resolvePrompt("leave")}
      />

      {/* Dialog: Confirm Photo/Doc Deletion */}
      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title={removeTarget?.kind === "photo" ? "Remove profile photo?" : "Remove document?"}
        description={
          removeTarget?.kind === "photo"
            ? "This will permanently delete the member's current profile photo."
            : "This will permanently delete this document from the member's record."
        }
        confirmLabel="Remove"
        destructive
        isLoading={photoRemoveMutation.isPending || documentRemoveMutation.isPending}
        onConfirm={confirmRemove}
      />
    </div>
  )
}

function OtherDocumentRow({ file, name, url, status, onRemove }: { file?: File; name?: string; url?: string; status: string; onRemove: () => void }) {
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [localUrl, setLocalUrl] = React.useState<string>()
  const fileName = file?.name ?? name ?? "Supporting document"

  React.useEffect(() => {
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setLocalUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  const previewUrl = localUrl ?? url
  const isImage = isImageFile(fileName)
  const isPdf = isPdfFile(fileName)

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {isImage && previewUrl ? <img src={previewUrl} alt={fileName} className="size-10 shrink-0 rounded-md border border-border object-cover" /> : <FileText className="size-5 shrink-0 text-primary" />}
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">{fileName}</p>
          <p className="text-[11px] text-muted-foreground">{status}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {previewUrl && (isImage || isPdf) && <Button type="button" variant="ghost" size="icon-sm" aria-label={`Preview ${fileName}`} onClick={() => setPreviewOpen(true)}><Eye className="size-3.5" /></Button>}
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${fileName}`} onClick={onRemove}><X className="size-3.5" /></Button>
      </div>
      {isImage && previewUrl && <ImagePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} images={[{ url: previewUrl, name: fileName }]} />}
      {isPdf && previewUrl && <PDFPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} url={previewUrl} name={fileName} />}
    </div>
  )
}

function Field({
  label,
  required,
  error,
  className,
  children,
  isCalculated,
}: {
  label: string
  required?: boolean
  error?: string
  className?: string
  children: React.ReactNode
  isCalculated?: boolean
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90 flex items-center gap-1.5">
        {label}
        {required && <span className="text-destructive font-bold">*</span>}
        {isCalculated && (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full select-none">
            <Sparkles className="size-2.5" aria-hidden="true" />
            Calculated
          </span>
        )}
      </Label>
      <div className="relative">
        {children}
      </div>
      {error && (
        <p className="text-xs font-medium text-destructive mt-1 animate-in fade-in-50 slide-in-from-top-1 duration-150">
          {error}
        </p>
      )}
    </div>
  )
}
