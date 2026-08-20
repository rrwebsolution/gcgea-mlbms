import * as React from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Check,
  CheckCircle2,
  ChevronsUpDown,
  FilePlus2,
  Loader2,
  ShieldAlert,
  Info,
  Layers,
  Users,
  ChevronRight,
  ChevronLeft,
  FileCheck,
  Building2,
  Calculator,
  X,
  Eye,
  FileText,
  Gift,
  Sparkles,
  ClipboardCheck,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { WizardStepIndicator } from "@/components/shared/WizardStepIndicator"
import { MemberSelectionStep } from "@/components/shared/MemberSelectionStep"
import { EligibilityChecklist, type EligibilityResult } from "@/components/shared/EligibilityChecklist"
import { FileUploader } from "@/components/shared/FileUploader"
import { ImagePreviewDialog } from "@/components/shared/ImagePreviewDialog"
import { PDFPreviewDialog } from "@/components/shared/PDFPreviewDialog"
import { FormSkeleton } from "@/components/shared/loaders/FormSkeleton"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { SaveDraftButton } from "@/components/shared/SaveDraftButton"
import { DraftStatusBadge } from "@/components/shared/DraftStatusBadge"
import { UnsavedChangesDialog } from "@/components/shared/UnsavedChangesDialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { BenefitsOfficerCommandSelect } from "@/features/benefits/components/BenefitsOfficerCommandSelect"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { getMember } from "@/services/members.service"
import { listAllContributions } from "@/services/contributions.service"
import { listAllDeductions } from "@/services/deductions.service"
import { listDeductionTypes } from "@/services/deduction-types.service"
import { getMemberLoans } from "@/services/loans.service"
import {
  createBenefitApplication,
  getBenefit,
  listBenefitTypes,
  getMemberBenefits,
  updateBenefitApplication,
  uploadBenefitDocument,
  type CreateBenefitApplicationInput,
} from "@/services/benefits.service"
import { loadSystemSettings } from "@/services/settings.service"
import { CASH_PABAON_PROGRAM_NAME, evaluateBenefitEligibility, resultFor } from "@/utils/eligibility"
import { computeProratedAmount, countDistinctPeriods } from "@/utils/proration"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"
import { useDraft } from "@/hooks/useDraft"
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges"
import { cn } from "@/lib/utils"
import { isImageFile, isPdfFile } from "@/lib/upload-validation"
import type { BenefitApplication, BenefitDocument } from "@/types"

const STEPS = ["Select Member", "Benefit Details", "Eligibility & Requirements", "Review & Submit"]
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const DEFAULT_SIBLING_SCHEDULE = [15000, 10000, 5000]
const NUCLEAR_MORTUARY_BENEFIT_NAME = "Mortuary Cash Assistance for Nuclear Family Member"
const RETIREMENT_BENEFIT_NAME = "Retirement and Separation Benefit"
type NuclearClaimSubjectType = "Member" | "Spouse" | "Child" | "Parent" | "Sibling"

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function extractRecipientNames(storedLabel: string): string[] {
  return storedLabel
    .split("; Claim Subject:")[0]
    .split(",")
    .map((name) => name.replace(/\s*\([^)]*\)\s*$/, "").trim())
    .filter(Boolean)
}

export default function CreateBenefitApplicationPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const { user, hasPermission } = useAuth()

  const { data: systemSettings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: loadSystemSettings,
    staleTime: 60_000,
  })
  const benefitSettings = systemSettings?.settings.benefit
  const siblingSchedule = [
    benefitSettings?.nuclearFamilyFirstSiblingAmount ?? DEFAULT_SIBLING_SCHEDULE[0],
    benefitSettings?.nuclearFamilySecondSiblingAmount ?? DEFAULT_SIBLING_SCHEDULE[1],
    benefitSettings?.nuclearFamilyThirdSiblingAmount ?? DEFAULT_SIBLING_SCHEDULE[2],
  ]
  const parentMortuaryAmount = benefitSettings?.nuclearFamilyParentAmount ?? 15000
  const canOverride =
    hasPermission("benefits.override_eligibility") && (benefitSettings?.allowEligibilityOverride ?? true)

  const { data: existingBenefit, isLoading: isLoadingBenefit } = useQuery({
    queryKey: ["benefits", id],
    queryFn: () => getBenefit(id!),
    enabled: isEdit,
  })

  const [step, setStep] = React.useState(1)
  const [memberId, setMemberId] = React.useState(() => searchParams.get("member") ?? "")

  React.useEffect(() => {
    const paramMemberId = searchParams.get("member")
    if (paramMemberId && paramMemberId !== memberId && !isEdit) {
      setMemberId(paramMemberId)
    }
  }, [searchParams, memberId, isEdit])

  React.useEffect(() => {
    if (!isEdit && user?.memberId && memberId !== user.memberId) {
      setMemberId(user.memberId)
    }
  }, [isEdit, user?.memberId, memberId])

  const [benefitTypeId, setBenefitTypeId] = React.useState("")
  const [requestedAmount, setRequestedAmount] = React.useState<number>()
  const [applicationDate, setApplicationDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [incidentDate, setIncidentDate] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [recipientType, setRecipientType] = React.useState<"Member" | "Beneficiary">("Member")
  const [recipientNames, setRecipientNames] = React.useState<string[]>([])
  const [claimSubjectType, setClaimSubjectType] = React.useState<NuclearClaimSubjectType | "">("")
  const [claimSubjectNames, setClaimSubjectNames] = React.useState<string[]>([])
  const [assignedOfficer, setAssignedOfficer] = React.useState(user?.fullName ?? "")
  const [remarks, setRemarks] = React.useState("")

  const [overrideEnabled, setOverrideEnabled] = React.useState(false)
  const [overrideReason, setOverrideReason] = React.useState("")
  const [overrideConfirmed, setOverrideConfirmed] = React.useState(false)
  const [showOverrideDialog, setShowOverrideDialog] = React.useState(false)

  const [siblingBeneficiaryIds, setSiblingBeneficiaryIds] = React.useState<string[]>([])
  const [requirements, setRequirements] = React.useState<Record<string, boolean>>({})
  const [requirementFiles, setRequirementFiles] = React.useState<Record<string, File>>({})
  const [supportingFiles, setSupportingFiles] = React.useState<File[]>([])
  const [isUploadingDocuments, setIsUploadingDocuments] = React.useState(false)
  const [supportingUploadProgress, setSupportingUploadProgress] = React.useState<Record<string, number>>({})

  const [agree, setAgree] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [successDialog, setSuccessDialog] = React.useState<{ id: string; applicationNumber: string } | null>(
    null
  )

  const { data: member } = useQuery({
    queryKey: ["members", memberId],
    queryFn: () => getMember(memberId),
    enabled: !!memberId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  })

  const { data: benefitTypes = [] } = useQuery({ queryKey: ["benefit-types"], queryFn: listBenefitTypes })
  const { data: deductionTypes = [] } = useQuery({ queryKey: ["deduction-types"], queryFn: listDeductionTypes })
  const { data: allContributions = [] } = useQuery({
    queryKey: ["contributions", "all"],
    queryFn: listAllContributions,
  })
  const { data: allDeductions = [] } = useQuery({ queryKey: ["deductions", "all"], queryFn: listAllDeductions })

  const benefitType = benefitTypes.find((bt) => bt.id === benefitTypeId)
  const retirementBenefitRestricted =
    (benefitSettings?.requireRetiredStatusForRetirementBenefit ?? true) && member?.retireeStatus !== "Retired"
  const pabaonDeductionType = deductionTypes.find((type) => type.code.toLowerCase() === "pabaon")

  const memberLoans = memberId ? getMemberLoans(memberId) : []
  const memberContributions = memberId
    ? allContributions.filter((c) => c.memberId === memberId && c.status === "Posted")
    : []
  const totalContributions = memberContributions.reduce((sum, c) => sum + c.amount, 0)
  const activeLoans = memberLoans.filter((l) => ["Active", "Overdue", "Released"].includes(l.status))
  const overdueLoans = memberLoans.filter((l) => l.status === "Overdue")
  const outstandingLoanBalance = activeLoans.reduce((sum, l) => sum + l.outstandingBalance, 0)
  const memberBenefits = memberId ? getMemberBenefits(memberId) : []

  const resetMonth = benefitSettings?.benefitYearResetMonth ?? "January"
  const resetMonthIndex = MONTH_NAMES.indexOf(resetMonth)
  const now = new Date()
  const benefitYearStart = new Date(now.getFullYear(), Math.max(0, resetMonthIndex), 1)
  if (benefitYearStart > now) benefitYearStart.setFullYear(benefitYearStart.getFullYear() - 1)

  const memberPabaonDeductions = memberId
    ? allDeductions.filter(
        (deduction) =>
          deduction.memberId === memberId &&
          deduction.status === "Posted" &&
          (deduction.deductionTypeId === pabaonDeductionType?.id ||
            deduction.deductionTypeCode?.toLowerCase() === "pabaon")
      )
    : []
  const memberDirectPabaonContributions = memberContributions.filter(
    (contribution) => contribution.contributionType === "Cash Pabaon"
  )
  const memberMonthlyDuesContributions = memberContributions.filter(
    (contribution) => contribution.contributionType === "Monthly Dues"
  )
  const monthlyDuesMonthCount = countDistinctPeriods(
    memberMonthlyDuesContributions.map((contribution) => contribution.contributionPeriod)
  )

  const pabaonPeriodsWithContribution = new Set(
    memberDirectPabaonContributions.map((contribution) => contribution.contributionPeriod)
  )
  const totalCashPabaonAmount =
    memberDirectPabaonContributions.reduce((sum, contribution) => sum + contribution.amount, 0) +
    memberPabaonDeductions
      .filter((deduction) => !pabaonPeriodsWithContribution.has(deduction.period))
      .reduce((sum, deduction) => sum + deduction.amount, 0)

  const latestContributionDate = [
    ...memberContributions.map((contribution) => contribution.paymentDate),
    ...memberPabaonDeductions.map((deduction) => deduction.paymentDate),
  ]
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0]

  const isNuclearMortuary = benefitType?.name === NUCLEAR_MORTUARY_BENEFIT_NAME
  const isSiblingSchedule = isNuclearMortuary && claimSubjectType === "Sibling"
  const siblingSiblingBeneficiaries =
    member?.beneficiaries.filter((beneficiary) =>
      /^(single brother|single sister)$/i.test(String(beneficiary.relationship ?? "").trim())
    ) ?? []
  const siblingScheduleTotal = siblingBeneficiaryIds
    .slice(0, 3)
    .reduce((sum, _id, i) => sum + siblingSchedule[i], 0)

  const allowedClaimSubjectTypes: NuclearClaimSubjectType[] =
    member?.civilStatus === "Married" ? ["Member", "Spouse", "Child"] : ["Member", "Parent", "Sibling"]

  const claimSubjectOptions =
    member?.beneficiaries.filter((beneficiary) => {
      if (claimSubjectType === "Spouse") return /spouse|husband|wife/i.test(beneficiary.relationship)
      if (claimSubjectType === "Child")
        return /^unmarried child$/i.test(String(beneficiary.relationship ?? "").trim())
      if (claimSubjectType === "Parent") return /parent|father|mother/i.test(beneficiary.relationship)
      if (claimSubjectType === "Sibling")
        return /^(single brother|single sister)$/i.test(String(beneficiary.relationship ?? "").trim())
      return false
    }) ?? []

  const eligibleSiblingIdKey = siblingSiblingBeneficiaries.map((b) => b.id).sort().join("|")
  const eligibleClaimSubjectNameKey = claimSubjectOptions.map((b) => b.fullName).sort().join("|")

  React.useEffect(() => {
    const eligibleIds = new Set(eligibleSiblingIdKey ? eligibleSiblingIdKey.split("|") : [])
    setSiblingBeneficiaryIds((current) => current.filter((id) => eligibleIds.has(id)))
  }, [eligibleSiblingIdKey])

  React.useEffect(() => {
    if (claimSubjectType === "Member") {
      setClaimSubjectNames(member?.fullName ? [member.fullName] : [])
      return
    }
    const eligibleNames = new Set(eligibleClaimSubjectNameKey ? eligibleClaimSubjectNameKey.split("|") : [])
    setClaimSubjectNames((current) => current.filter((name) => eligibleNames.has(name)))
  }, [eligibleClaimSubjectNameKey, claimSubjectType, member?.fullName])

  const siblingClaimSubjectNames = siblingBeneficiaryIds
    .map((id) => member?.beneficiaries.find((b) => b.id === id)?.fullName)
    .filter((name): name is string => Boolean(name))
  const effectiveClaimSubjectNames = isSiblingSchedule ? siblingClaimSubjectNames : claimSubjectNames

  React.useEffect(() => {
    if (!isNuclearMortuary || !member || claimSubjectType) return
    setClaimSubjectType("Member")
    setClaimSubjectNames([member.fullName])
  }, [isNuclearMortuary, member, claimSubjectType])

  const monthsPaid =
    benefitType?.prorationBasis === "pabaon"
      ? countDistinctPeriods([
          ...memberPabaonDeductions.map((deduction) => deduction.period),
          ...memberDirectPabaonContributions.map((contribution) => contribution.contributionPeriod),
        ])
      : countDistinctPeriods(memberContributions.map((c) => c.contributionPeriod))

  const pabaonResolutionScope =
    member?.membershipDate && member.membershipDate >= "2026-09-01" ? "new" : "legacy"
  const applicableProrationTiers =
    benefitType?.prorationBasis === "pabaon"
      ? benefitType.prorationTiers.filter(
          (tier) => tier.membershipScope === "all" || tier.membershipScope === pabaonResolutionScope
        )
      : benefitType?.prorationTiers ?? []

  const prorationPreview =
    benefitType && applicableProrationTiers.length > 0 && !isSiblingSchedule
      ? computeProratedAmount(
          applicableProrationTiers,
          benefitType.fyAmounts,
          benefitType.maximumAmount,
          monthsPaid,
          new Date(applicationDate).getFullYear()
        )
      : null

  const isComputedAmount = Boolean(prorationPreview) || isNuclearMortuary
  const minimumProrationMonths = applicableProrationTiers.length
    ? Math.min(...applicableProrationTiers.map((tier) => tier.minMonths))
    : 0

  React.useEffect(() => {
    if (isSiblingSchedule) {
      setRequestedAmount(siblingScheduleTotal)
    } else if (isNuclearMortuary && claimSubjectType === "Parent") {
      setRequestedAmount(parentMortuaryAmount)
    } else if (isNuclearMortuary && claimSubjectType === "Member" && prorationPreview) {
      setRequestedAmount(prorationPreview.amount)
    } else if (prorationPreview) {
      setRequestedAmount(prorationPreview.amount)
    } else if (benefitType) {
      setRequestedAmount((prev) => prev ?? benefitType.defaultAmount)
    }
  }, [
    benefitType,
    prorationPreview?.amount,
    isSiblingSchedule,
    siblingScheduleTotal,
    isNuclearMortuary,
    claimSubjectType,
    parentMortuaryAmount,
  ])

  React.useEffect(() => {
    if (benefitType) {
      setRequirements((prev) =>
        Object.fromEntries(benefitType.requiredDocuments.map((d) => [d, prev[d] ?? false]))
      )
      if (recipientType === "Member") {
        setRecipientNames(member?.fullName ? [member.fullName] : [])
      }
    }
  }, [benefitType, member, recipientType])

  const hydratedBenefitIdRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!existingBenefit) return
    if (hydratedBenefitIdRef.current === existingBenefit.id) return
    hydratedBenefitIdRef.current = existingBenefit.id
    setMemberId(existingBenefit.memberId)
    setBenefitTypeId(existingBenefit.benefitTypeId)
    setRequestedAmount(existingBenefit.requestedAmount || undefined)
    setIncidentDate(existingBenefit.incidentDate ?? "")
    setReason(existingBenefit.reason ?? "")
    setRecipientNames(extractRecipientNames(existingBenefit.beneficiaryOrRecipient ?? ""))
    setRequirements(
      Object.fromEntries((existingBenefit.requirements ?? []).map((r) => [r.label, r.completed]))
    )
    setStep(existingBenefit.draftCurrentStep ?? 1)
  }, [existingBenefit])

  React.useEffect(() => {
    if (!existingBenefit || benefitType?.name !== NUCLEAR_MORTUARY_BENEFIT_NAME || !member) return
    const storedSubjects = (existingBenefit.beneficiaryOrRecipient ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
    const storedType = storedSubjects[0]?.match(
      /\((Member|Spouse|Child|Parent|Sibling)\)$/
    )?.[1] as NuclearClaimSubjectType | undefined
    if (!storedType) return
    const names = storedSubjects.map((entry) =>
      entry.replace(/\s*\((Member|Spouse|Child|Parent|Sibling)\)$/, "").trim()
    )
    setClaimSubjectType(storedType)
    if (storedType === "Sibling") {
      setSiblingBeneficiaryIds(
        names
          .map((name) => member.beneficiaries.find((b) => b.fullName === name)?.id)
          .filter((id): id is string => Boolean(id))
          .slice(0, 3)
      )
    } else {
      setClaimSubjectNames(names.slice(0, 1))
    }
  }, [existingBenefit, benefitType, member])

  const isDraftContext = isEdit ? existingBenefit?.status === "Draft" : false

  const benefitDraft = useDraft<CreateBenefitApplicationInput, BenefitApplication>({
    draftId: isEdit ? id : undefined,
    create: createBenefitApplication,
    update: updateBenefitApplication,
    getId: (b) => b.id,
    onSaved: (b) => {
      queryClient.setQueryData(["benefits", b.id], b)
      queryClient.invalidateQueries({ queryKey: ["benefits"] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save draft."),
  })

  const currentBenefitId = id ?? benefitDraft.draftId
  const otherMemberBenefits = memberBenefits.filter((b) => b.id !== currentBenefitId)
  const priorBenefitOfType = otherMemberBenefits.filter(
    (b) =>
      b.benefitTypeId === benefitTypeId &&
      ["Released", "Completed"].includes(b.status) &&
      Boolean(b.releaseDate) &&
      new Date(b.releaseDate!) >= benefitYearStart
  )

  const currentRecipientNames = isNuclearMortuary ? effectiveClaimSubjectNames : recipientNames
  const pendingBenefitOfType =
    !(benefitSettings?.allowMultiplePendingApplications ?? false) &&
    otherMemberBenefits.some(
      (b) =>
        b.benefitTypeId === benefitTypeId &&
        ["Draft", "Submitted", "Under Review", "For Approval"].includes(b.status) &&
        extractRecipientNames(b.beneficiaryOrRecipient ?? "").some((name) =>
          currentRecipientNames.includes(name)
        )
    )

  const eligibilityItems =
    member && benefitType
      ? evaluateBenefitEligibility(
          member,
          benefitType,
          requestedAmount,
          priorBenefitOfType.length,
          pendingBenefitOfType,
          benefitType.name === CASH_PABAON_PROGRAM_NAME
            ? { recipientType, recipientNames, hasOutstandingObligations: overdueLoans.length > 0 }
            : undefined,
          benefitSettings?.requireRetiredStatusForRetirementBenefit ?? true
        )
      : []

  const eligibilityResult: EligibilityResult =
    eligibilityItems.length > 0 ? resultFor(eligibilityItems) : "Not Eligible"
  const isBlocked =
    eligibilityResult !== "Eligible" && !(overrideEnabled && overrideReason.trim() && overrideConfirmed)
  const requirementEntries = benefitType
    ? benefitType.requiredDocuments.map((label) => ({ label, completed: !!requirements[label] }))
    : []
  const missingRequirements = requirementEntries.filter((r) => !r.completed)

  const recipientName = recipientNames.join(", ")
  const recipientLabel = recipientNames
    .map((name) => {
      const beneficiary = member?.beneficiaries.find((item) => item.fullName === name)
      return recipientType === "Beneficiary" && beneficiary ? `${name} (${beneficiary.relationship})` : name
    })
    .join(", ")
  const resolvedRecipientName = isNuclearMortuary ? effectiveClaimSubjectNames.join(", ") : recipientName
  const storedRecipientLabel = isNuclearMortuary
    ? effectiveClaimSubjectNames.map((name) => `${name} (${claimSubjectType})`).join(", ")
    : recipientLabel

  const draftSnapshot: CreateBenefitApplicationInput = {
    memberId,
    benefitTypeId: benefitTypeId || undefined,
    requestedAmount,
    incidentDate: incidentDate || undefined,
    reason: reason || undefined,
    beneficiaryOrRecipient: resolvedRecipientName ? storedRecipientLabel : undefined,
    requirements: requirementEntries,
    asDraft: true,
    draftCurrentStep: step,
  }

  async function saveDraft() {
    if (!memberId) {
      toast.error("Select a member before saving a draft.")
      return
    }
    try {
      const benefit = await benefitDraft.save(draftSnapshot)
      const failedFiles = await uploadSupportingFiles(benefit)
      if (failedFiles.length > 0) {
        toast.warning(`Draft saved, but ${failedFiles.length} supporting file(s) failed to upload.`)
      } else {
        toast.success("Draft saved successfully.")
      }
    } catch {}
  }

  async function uploadSupportingFiles(
    benefit: BenefitApplication,
    filesToUpload: File[] = supportingFiles
  ): Promise<File[]> {
    if (filesToUpload.length === 0) return []
    setIsUploadingDocuments(true)
    const failed: File[] = []
    const uploaded: BenefitDocument[] = []
    try {
      for (const file of filesToUpload) {
        const key = fileKey(file)
        try {
          setSupportingUploadProgress((current) => ({ ...current, [key]: 0 }))
          const requirementLabel =
            Object.entries(requirementFiles).find(
              ([, requirementFile]) => fileKey(requirementFile) === key
            )?.[0] ?? "Additional Supporting Document"
          uploaded.push(
            await uploadBenefitDocument(
              benefit.id,
              file,
              (progress) => {
                setSupportingUploadProgress((current) => ({ ...current, [key]: progress }))
              },
              requirementLabel
            )
          )
        } catch {
          failed.push(file)
          setSupportingUploadProgress((current) => {
            const next = { ...current }
            delete next[key]
            return next
          })
        }
      }
      queryClient.setQueryData<BenefitApplication>(["benefits", benefit.id], (current) => ({
        ...(current ?? benefit),
        documents: [...(current?.documents ?? benefit.documents ?? []), ...uploaded],
      }))
      const attemptedKeys = new Set(filesToUpload.map(fileKey))
      setSupportingFiles((current) => {
        const untouched = current.filter((file) => !attemptedKeys.has(fileKey(file)))
        const retainedKeys = new Set(untouched.map(fileKey))
        return [...untouched, ...failed.filter((file) => !retainedKeys.has(fileKey(file)))]
      })
      if (failed.length === 0) setSupportingUploadProgress({})
      return failed
    } finally {
      setIsUploadingDocuments(false)
    }
  }

  const hasUnsavedChanges = Boolean(memberId) && !successDialog
  const { showPrompt: showUnsavedPrompt, promptLeave, resolvePrompt } = useUnsavedChanges(hasUnsavedChanges)

  function canProceedFromStep(s: number): boolean {
    if (s === 1) return Boolean(memberId)
    if (s === 2) {
      if (isSiblingSchedule && siblingBeneficiaryIds.length === 0) return false
      if (isNuclearMortuary && (!claimSubjectType || (!isSiblingSchedule && claimSubjectNames.length === 0)))
        return false
      return (
        !!benefitTypeId &&
        !!requestedAmount &&
        !!reason.trim() &&
        !!resolvedRecipientName.trim() &&
        !!assignedOfficer.trim() &&
        missingRequirements.length === 0
      )
    }
    if (s === 3) return !isBlocked
    return true
  }

  function goNext() {
    if (!canProceedFromStep(step)) {
      toast.error("Please complete all required fields before continuing.")
      return
    }
    const nextStep = Math.min(STEPS.length, step + 1)
    setStep(nextStep)
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1))
  }

  async function handleSubmit(asDraft: boolean) {
    if (!member) return
    if (!asDraft) {
      if (!benefitType || !requestedAmount) return
      if (isBlocked) {
        toast.error("This application cannot be submitted until eligibility is satisfied or overridden.")
        return
      }
      if (!agree) {
        toast.error("Please confirm that the information has been verified.")
        return
      }
    }
    setIsSubmitting(true)
    try {
      const payload: CreateBenefitApplicationInput = {
        memberId: member.id,
        benefitTypeId: benefitType?.id,
        requestedAmount,
        incidentDate: incidentDate || undefined,
        reason: reason || undefined,
        beneficiaryOrRecipient: resolvedRecipientName ? storedRecipientLabel : undefined,
        requirements: requirementEntries,
        asDraft: true,
        draftCurrentStep: step,
        overrideEligibility: !asDraft && overrideEnabled && overrideConfirmed,
        overrideReason: !asDraft && overrideEnabled ? overrideReason.trim() : undefined,
      }
      const draftBenefit = await benefitDraft.save(payload)
      const failedFiles = await uploadSupportingFiles(draftBenefit)
      if (asDraft) {
        if (failedFiles.length > 0)
          toast.warning(`Draft saved, but ${failedFiles.length} file(s) could not be uploaded.`)
        else toast.success("Draft saved successfully.")
      } else {
        const requiredFileKeys = new Set(Object.values(requirementFiles).map(fileKey))
        const failedRequiredFiles = failedFiles.filter((file) => requiredFileKeys.has(fileKey(file)))
        if (failedRequiredFiles.length > 0) {
          throw new Error(
            `Required document upload failed: ${failedRequiredFiles.map((file) => file.name).join(", ")}.`
          )
        }
        const benefit = await updateBenefitApplication(draftBenefit.id, { ...payload, asDraft: false })
        toast.success("Benefit application submitted successfully.")
        setSuccessDialog({ id: benefit.id, applicationNumber: benefit.applicationNumber })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save the benefit application.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetWizard() {
    setStep(1)
    setMemberId("")
    setBenefitTypeId("")
    setRequestedAmount(undefined)
    setIncidentDate("")
    setReason("")
    setRecipientNames([])
    setClaimSubjectType("")
    setClaimSubjectNames([])
    setRemarks("")
    setOverrideEnabled(false)
    setOverrideReason("")
    setOverrideConfirmed(false)
    setRequirements({})
    setRequirementFiles({})
    setSupportingFiles([])
    setSupportingUploadProgress({})
    setSiblingBeneficiaryIds([])
    setAgree(false)
    setSuccessDialog(null)
  }

  if (isEdit && isLoadingBenefit) {
    return <FormSkeleton fields={["select", "text", "date", "select"]} columns={2} showUpload />
  }

  return (
    <div className="mx-auto w-full space-y-8 pb-28">
      {/* Page Header */}
      <PageHeader
        title={isDraftContext ? "Continue Benefit Application Draft" : "Create Benefit Application"}
        description="Encode, compute, and file a mutual assistance or calamity claim based on verified physical documents."
        badge={isDraftContext ? <DraftStatusBadge status="Draft" /> : undefined}
      />

      {/* Step Indicator Card */}
      <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xs backdrop-blur-xs sm:p-5">
        <WizardStepIndicator steps={STEPS} currentStep={step} />
      </div>

      {/* STEP 1: Select Member */}
      {step === 1 && (
        <FormSection
          title={
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                <Users className="size-4" strokeWidth={2.2} />
              </div>
              <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
                Step 1 · Member Identification
              </span>
            </div>
          }
        >
          <MemberSelectionStep
            selectedMemberId={memberId || undefined}
            member={member}
            onSelect={setMemberId}
            totalContributions={totalContributions}
            outstandingLoanBalance={outstandingLoanBalance}
            activeLoanCount={activeLoans.length}
            overdueLoanCount={overdueLoans.length}
            disabled={!!user?.memberId}
            extra={
              memberBenefits.length > 0 ? (
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground shadow-2xs flex items-center gap-3 backdrop-blur-xs">
                  <Layers className="size-4 text-primary shrink-0" />
                  <span>
                    <strong className="text-foreground">Recent Benefit History: </strong>
                    {memberBenefits.slice(0, 3).map((b) => `${b.benefitTypeName} (${b.status})`).join(", ")}
                  </span>
                </div>
              ) : undefined
            }
          />
        </FormSection>
      )}

      {/* STEP 2: Benefit Details Form */}
      {step === 2 && (
        <FormSection
          title={
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                <Gift className="size-4" strokeWidth={2.2} />
              </div>
              <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
                Step 2 · Benefit Program &amp; Claim Particulars
              </span>
            </div>
          }
        >
          {member && (
            <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-2xs backdrop-blur-xs space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Users className="size-4" />
                <span>Selected Member Ledger Snapshot</span>
              </div>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                <ReviewRow label="Full Name" value={member.fullName} />
                <ReviewRow label="Member Number" value={member.memberNumber} isMono />
                <ReviewRow label="Office Agency" value={member.officeName} />
                <ReviewRow label="Retiree Status" value={member.retireeStatus} />
              </dl>

              <div className="border-t border-primary/15 pt-3">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                  <ReviewRow label="Posted Dues" value={formatCurrency(totalContributions)} isMono />
                  <ReviewRow label="Dues Tenure" value={`${monthlyDuesMonthCount} month(s)`} isMono />
                  <ReviewRow label="Pabaon Total" value={formatCurrency(totalCashPabaonAmount)} isMono />
                  <ReviewRow
                    label="Latest Ledger Payment"
                    value={latestContributionDate ? formatDateShort(latestContributionDate) : "None"}
                  />
                </dl>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-1.5 lg:col-span-3">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Application Date <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                type="date"
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
                className="h-10 font-mono text-xs shadow-2xs"
              />
            </div>

            <div className="space-y-1.5 lg:col-span-3">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Benefit Program <span className="text-destructive font-bold">*</span>
              </Label>
              <CommandSelect
                className="w-full h-10 text-xs shadow-2xs"
                value={benefitTypeId}
                onValueChange={(v) => {
                  const nextBenefitTypeId = v ?? ""
                  setBenefitTypeId(nextBenefitTypeId)
                  setRequirements({})
                  setRequirementFiles({})
                  setSupportingFiles([])
                  if (
                    benefitTypes.find((type) => type.id === nextBenefitTypeId)?.name !==
                    NUCLEAR_MORTUARY_BENEFIT_NAME
                  ) {
                    setClaimSubjectType("")
                    setClaimSubjectNames([])
                    setSiblingBeneficiaryIds([])
                  }
                }}
                options={benefitTypes
                  .filter(
                    (bt) =>
                      bt.status === "Active" &&
                      !(retirementBenefitRestricted && bt.name === RETIREMENT_BENEFIT_NAME)
                  )
                  .map((bt) => ({ value: bt.id, label: bt.name }))}
                placeholder="Select benefit program"
              />
              {retirementBenefitRestricted && (
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  Retirement benefit is locked because the member&apos;s status is not Retired.
                </p>
              )}
            </div>

            <div className="space-y-1.5 lg:col-span-3">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Requested Grant Amount <span className="text-destructive font-bold">*</span>
              </Label>
              {isComputedAmount ? (
                <div
                  className={cn(
                    "rounded-2xl border p-4 shadow-2xs space-y-1.5 backdrop-blur-xs",
                    prorationPreview && !prorationPreview.tier
                      ? "border-amber-500/30 bg-amber-500/[0.04]"
                      : "border-primary/30 bg-primary/[0.04]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5",
                        prorationPreview && !prorationPreview.tier ? "text-amber-600 dark:text-amber-400" : "text-primary"
                      )}
                    >
                      <Calculator className="size-3.5" /> Automated Formula Calculation
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full font-mono",
                        prorationPreview && !prorationPreview.tier
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {isSiblingSchedule
                        ? `${siblingBeneficiaryIds.length}/3 Sibling(s)`
                        : prorationPreview && !prorationPreview.tier
                          ? "Below Threshold"
                          : "Tier Scaled"}
                    </span>
                  </div>
                  <div className="font-heading text-2xl font-bold tracking-tight text-foreground font-mono">
                    {formatCurrency(requestedAmount ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isSiblingSchedule
                      ? siblingBeneficiaryIds.length === 0
                        ? `Select at least one single sibling. First selected sibling receives ${formatCurrency(siblingSchedule[0])}.`
                        : `${siblingBeneficiaryIds.length} qualified sibling(s) selected: ${siblingBeneficiaryIds.map((_id, index) => formatCurrency(siblingSchedule[index])).join(" + ")} = ${formatCurrency(siblingScheduleTotal)}.`
                      : isNuclearMortuary && claimSubjectType === "Parent"
                        ? `Configured parent mortuary benefit is fixed at ${formatCurrency(parentMortuaryAmount)}.`
                        : prorationPreview?.tier
                          ? `${monthsPaid} posted month(s) qualify for the ${prorationPreview.tier.minMonths}${prorationPreview.tier.maxMonths == null ? "+" : `–${prorationPreview.tier.maxMonths}`} month tier at ${prorationPreview.tier.percentage}%.`
                          : `${monthsPaid} month(s) verified. First tier requires ${minimumProrationMonths} months.`}
                  </p>
                </div>
              ) : (
                <CurrencyInput value={requestedAmount} onChange={setRequestedAmount} className="h-10 text-xs font-mono font-semibold" />
              )}
            </div>

            <div className="space-y-1.5 lg:col-span-3">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Incident Date
              </Label>
              <Input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="h-10 font-mono text-xs shadow-2xs"
              />
            </div>

            {/* Nuclear Mortuary Family Matrix */}
            {isNuclearMortuary && (
              <div className="rounded-2xl border border-primary/25 bg-primary/[0.025] p-5 shadow-2xs backdrop-blur-xs sm:col-span-2 lg:col-span-6 space-y-4">
                <div>
                  <p className="font-heading text-xs font-bold uppercase tracking-wider text-primary">
                    Nuclear Family Claim Subject Verification
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Married members may claim for spouse or unmarried children. Unmarried members may claim for living parents or up to three single siblings.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      Relationship Category <span className="text-destructive font-bold">*</span>
                    </Label>
                    <CommandSelect
                      className="h-10 w-full text-xs shadow-2xs"
                      value={claimSubjectType}
                      onValueChange={(value) => {
                        const nextType = (value ?? "") as NuclearClaimSubjectType | ""
                        setClaimSubjectType(nextType)
                        setClaimSubjectNames(nextType === "Member" && member?.fullName ? [member.fullName] : [])
                        setSiblingBeneficiaryIds([])
                        if (nextType === "Parent") {
                          setRequestedAmount(parentMortuaryAmount)
                        } else if (nextType !== "Sibling") {
                          setRequestedAmount(benefitType?.defaultAmount)
                        }
                      }}
                      options={allowedClaimSubjectTypes.map((type) => ({ value: type, label: type }))}
                      placeholder="Select relationship"
                      hideSearch
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      Designated Family Member <span className="text-destructive font-bold">*</span>
                    </Label>
                    {claimSubjectType === "Member" ? (
                      <div className="flex h-10 items-center rounded-xl border border-primary/20 bg-primary/5 px-3 text-xs font-semibold text-foreground">
                        {member?.fullName ?? "Selected member"}
                      </div>
                    ) : claimSubjectType === "Sibling" ? (
                      <div className="space-y-2">
                        <RecipientMultiSelect
                          values={siblingClaimSubjectNames}
                          onChange={(names) => {
                            setSiblingBeneficiaryIds(
                              names
                                .slice(0, 3)
                                .map(
                                  (name) =>
                                    siblingSiblingBeneficiaries.find((b) => b.fullName === name)?.id
                                )
                                .filter((id): id is string => Boolean(id))
                            )
                          }}
                          options={siblingSiblingBeneficiaries.map((b) => ({
                            value: b.fullName,
                            label: b.fullName,
                            description: b.relationship,
                          }))}
                          placeholder="Select up to three single siblings"
                        />
                        {siblingClaimSubjectNames.length > 0 && (
                          <div className="space-y-1 rounded-xl border border-primary/15 bg-background/80 p-3 text-xs">
                            {siblingClaimSubjectNames.map((name, index) => (
                              <div key={name} className="flex items-center justify-between gap-3">
                                <span className="truncate font-medium">
                                  {index + 1}. {name}
                                </span>
                                <span className="font-mono font-bold text-primary">
                                  {formatCurrency(siblingSchedule[index])}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <RecipientMultiSelect
                        values={claimSubjectNames}
                        onChange={(names) =>
                          setClaimSubjectNames(names.slice(claimSubjectType === "Parent" ? -2 : -1))
                        }
                        options={claimSubjectOptions.map((b) => ({
                          value: b.fullName,
                          label: b.fullName,
                          description: b.relationship,
                        }))}
                        placeholder={
                          claimSubjectType === "Parent"
                            ? "Select living parent(s)"
                            : "Select registered family member"
                        }
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {!isNuclearMortuary && (
              <>
                <div className="space-y-1.5 lg:col-span-2 lg:col-start-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    Recipient Type
                  </Label>
                  <CommandSelect
                    className="w-full h-10 text-xs shadow-2xs"
                    value={recipientType}
                    onValueChange={(v) => {
                      const nextType = (v ?? "Member") as "Member" | "Beneficiary"
                      setRecipientType(nextType)
                      setRecipientNames(nextType === "Member" && member ? [member.fullName] : [])
                    }}
                    options={[
                      { value: "Member", label: "Member (Direct Claim)" },
                      { value: "Beneficiary", label: "Designated Beneficiary" },
                    ]}
                    hideSearch
                  />
                </div>

                <div className="space-y-1.5 lg:col-span-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    Recipient Name <span className="text-destructive font-bold">*</span>
                  </Label>
                  {recipientType === "Member" ? (
                    <Input
                      value={member?.fullName ?? ""}
                      readOnly
                      className="h-10 rounded-xl bg-muted/20 text-xs font-semibold shadow-2xs"
                    />
                  ) : (
                    <RecipientMultiSelect
                      values={recipientNames}
                      onChange={setRecipientNames}
                      options={
                        member?.beneficiaries.map((b) => ({
                          value: b.fullName,
                          label: b.fullName,
                          description: b.relationship,
                        })) ?? []
                      }
                      placeholder="Select beneficiary"
                    />
                  )}
                </div>
              </>
            )}

            <div
              className={cn(
                "space-y-1.5 sm:col-span-2",
                isNuclearMortuary ? "lg:col-span-3 lg:col-start-1" : "lg:col-span-2"
              )}
            >
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Assigned Benefits Officer <span className="text-destructive font-bold">*</span>
              </Label>
              <BenefitsOfficerCommandSelect value={assignedOfficer} onValueChange={setAssignedOfficer} />
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-6">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Purpose / Justification Reason <span className="text-destructive font-bold">*</span>
              </Label>
              <Textarea
                rows={2}
                placeholder="e.g. Bereavement assistance, emergency hospitalization grant"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-xs bg-background resize-none shadow-2xs"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-6">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Additional Remarks
              </Label>
              <Textarea
                rows={2}
                placeholder="Operational notes (optional)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="text-xs bg-background resize-none shadow-2xs"
              />
            </div>
          </div>

          {/* Mandatory Requirement Uploads in Step 2 */}
          {benefitType && benefitType.requiredDocuments.length > 0 && (
            <div className="mt-6 space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.025] p-5 shadow-2xs">
              <div>
                <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-foreground">
                  <FileCheck className="size-4 text-primary" /> Mandatory Required Documents
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Attach all verified supporting documents before proceeding.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {benefitType.requiredDocuments.map((documentLabel) => (
                  <FileUploader
                    key={`${benefitType.id}-${documentLabel}`}
                    label={documentLabel}
                    required
                    disabled={isUploadingDocuments}
                    accept=".pdf,.jpg,.jpeg,.png"
                    acceptExtensions={["pdf", "jpg", "jpeg", "png"]}
                    fileName={requirementFiles[documentLabel]?.name}
                    fileSizeBytes={requirementFiles[documentLabel]?.size}
                    status="idle"
                    onUpload={(file) => {
                      const previous = requirementFiles[documentLabel]
                      setRequirementFiles((current) => ({ ...current, [documentLabel]: file }))
                      setSupportingFiles((current) => [
                        ...current.filter((item) => !previous || fileKey(item) !== fileKey(previous)),
                        file,
                      ])
                      setRequirements((current) => ({ ...current, [documentLabel]: true }))
                    }}
                    onRemove={() => {
                      const previous = requirementFiles[documentLabel]
                      setRequirementFiles((current) => {
                        const next = { ...current }
                        delete next[documentLabel]
                        return next
                      })
                      if (previous)
                        setSupportingFiles((current) =>
                          current.filter((item) => fileKey(item) !== fileKey(previous))
                        )
                      setRequirements((current) => ({ ...current, [documentLabel]: false }))
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Policy Guidelines Summary Card */}
          {benefitType && (
            <div className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Info className="size-4 text-primary" />
                <span>{benefitType.name} — Policy Guidelines</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                <div className="rounded-xl border border-border/50 bg-background/80 p-2.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Standard Rate</span>
                  <p className="font-mono font-bold text-foreground mt-0.5">
                    {formatCurrency(benefitType.defaultAmount)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/80 p-2.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Max Limit</span>
                  <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(benefitType.maximumAmount)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/80 p-2.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Tenure Required</span>
                  <p className="font-mono font-semibold text-foreground mt-0.5">
                    {benefitType.requiredMembershipMonths} months
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/80 p-2.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Frequency</span>
                  <p className="font-medium text-foreground mt-0.5">{benefitType.frequencyLimit}</p>
                </div>
              </div>
            </div>
          )}
        </FormSection>
      )}

      {/* STEP 3: Eligibility & Requirements Checklist */}
      {step === 3 && (
        <FormSection
          title={
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                <ClipboardCheck className="size-4" strokeWidth={2.2} />
              </div>
              <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
                Step 3 · Eligibility Verification &amp; Document Audit
              </span>
            </div>
          }
        >
          {eligibilityItems.length === 0 ? (
            <AlertBanner
              tone="warning"
              title="Incomplete claim details"
              description="Please select a valid member and benefit program in the previous steps."
            />
          ) : (
            <div className="space-y-6">
              <EligibilityChecklist items={eligibilityItems} result={eligibilityResult} />

              {eligibilityResult !== "Eligible" && canOverride && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4 shadow-xs">
                  <label className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-foreground cursor-pointer">
                    <Checkbox
                      checked={overrideEnabled}
                      onCheckedChange={(v) => setOverrideEnabled(!!v)}
                      className="size-4"
                    />
                    <span>Authorize Administrative Eligibility Override</span>
                  </label>

                  {overrideEnabled && (
                    <div className="mt-3 space-y-4 animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Override Justification <span className="text-destructive font-bold">*</span>
                        </Label>
                        <Textarea
                          rows={2}
                          placeholder="Document administrative justification for overriding criteria…"
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          className="text-xs bg-background resize-none"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                        <Checkbox
                          checked={overrideConfirmed}
                          onCheckedChange={(v) => setOverrideConfirmed(!!v)}
                        />
                        <span>I confirm authority to sanction this benefit grant override.</span>
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 text-xs font-semibold rounded-xl"
                        onClick={() => setShowOverrideDialog(true)}
                        disabled={!overrideReason.trim() || !overrideConfirmed}
                      >
                        <ShieldAlert className="size-3.5 text-amber-600" /> Apply Override
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Supporting Attachments Box */}
              <div className="space-y-3 pt-2">
                <p className="font-heading text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <FileCheck className="size-4 text-primary" /> Additional Supporting Attachments
                </p>
                <FileUploader
                  label="Upload Additional Credential Files (optional)"
                  description="Attach images or documents (PDF, JPG, PNG)"
                  multiple
                  disabled={isUploadingDocuments}
                  onFilesSelect={(files) => {
                    const known = new Set(supportingFiles.map(fileKey))
                    const newFiles = files.filter((file) => !known.has(fileKey(file)))
                    if (newFiles.length === 0) return
                    setSupportingFiles((current) => [...current, ...newFiles])

                    const savedBenefit =
                      existingBenefit ??
                      (benefitDraft.draftId
                        ? queryClient.getQueryData<BenefitApplication>(["benefits", benefitDraft.draftId])
                        : undefined)
                    if (savedBenefit) void uploadSupportingFiles(savedBenefit, newFiles)
                  }}
                />
                <SupportingFilesList
                  files={supportingFiles}
                  documents={existingBenefit?.documents ?? []}
                  uploadProgress={supportingUploadProgress}
                  onRemove={(file) => setSupportingFiles((current) => current.filter((item) => item !== file))}
                />
              </div>
            </div>
          )}
        </FormSection>
      )}

      {/* STEP 4: Review Block & Submission */}
      {step === 4 && member && benefitType && (
        <FormSection
          title={
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                <Sparkles className="size-4" strokeWidth={2.2} />
              </div>
              <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
                Step 4 · Final Review &amp; Consent
              </span>
            </div>
          }
        >
          <div className="space-y-5">
            <ReviewBlock title="Member Identification" icon={Users}>
              <ReviewRow label="Full Name" value={member.fullName} />
              <ReviewRow label="Member ID" value={member.memberNumber} isMono />
              <ReviewRow label="Office Agency" value={member.officeName} />
              <ReviewRow label="Benefits Officer" value={assignedOfficer} />
            </ReviewBlock>

            <ReviewBlock title="Benefit Claim Specifics" icon={Building2}>
              <ReviewRow label="Benefit Program" value={benefitType.name} />
              <ReviewRow label="Claim Amount" value={formatCurrency(requestedAmount ?? 0)} isMono />
              {isNuclearMortuary && (
                <ReviewRow
                  label="Claim Subject"
                  value={`${effectiveClaimSubjectNames.join(", ")} (${claimSubjectType || "Not selected"})`}
                />
              )}
              {!isNuclearMortuary && <ReviewRow label="Recipient Name" value={resolvedRecipientName} />}
              <ReviewRow label="Claim Purpose" value={reason} />
            </ReviewBlock>

            <ReviewBlock title="Eligibility Audit & Requirements" icon={ShieldAlert}>
              <ReviewRow label="Audit Status" value={eligibilityResult} />
              <ReviewRow
                label="Required Credentials"
                value={`${requirementEntries.filter((r) => r.completed).length} of ${requirementEntries.length} verified`}
              />
              {overrideEnabled && <ReviewRow label="Override Reason" value={overrideReason} />}
            </ReviewBlock>

            <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 text-xs font-semibold text-foreground cursor-pointer transition-colors hover:bg-muted/30">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5 size-4" />
              <span>I confirm that all physical application documents, claim particulars, and attached credentials have been reviewed and verified.</span>
            </label>
          </div>
        </FormSection>
      )}

      {/* Floating Action Toolbar */}
      <div className="sticky bottom-4 z-30 flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/85 px-5 py-3.5 shadow-xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 sm:px-6">
        <Button
          variant="outline"
          onClick={() => promptLeave(() => navigate("/benefits"))}
          className="h-9 rounded-xl px-4 text-xs font-semibold active:scale-95"
        >
          Cancel
        </Button>

        <div className="flex items-center gap-2.5">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={goBack}
              className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold active:scale-95"
            >
              <ChevronLeft className="size-3.5" /> Previous
            </Button>
          )}

          <SaveDraftButton
            status={benefitDraft.status}
            lastSavedAt={benefitDraft.lastSavedAt}
            onClick={saveDraft}
            disabled={!memberId || isSubmitting || isUploadingDocuments}
          />

          {step < STEPS.length ? (
            <Button
              variant="success"
              onClick={goNext}
              disabled={!canProceedFromStep(step)}
              className="h-9 gap-1.5 rounded-xl px-5 text-xs font-semibold active:scale-95 shadow-xs"
            >
              <span>Continue</span>
              <ChevronRight className="size-3.5" />
            </Button>
          ) : (
            <Button
              variant="success"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || isBlocked || !agree}
              aria-busy={isSubmitting}
              className="h-9 gap-1.5 rounded-xl px-6 text-xs font-semibold shadow-xs active:scale-95 transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FilePlus2 className="size-3.5" strokeWidth={2.2} />
              )}
              <span>{isSubmitting ? "Submitting…" : "Submit Claim Application"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Override Dialog */}
      <ConfirmDialog
        open={showOverrideDialog}
        onOpenChange={setShowOverrideDialog}
        title="Confirm eligibility override"
        description="Override will be permanently recorded in the benefit audit logs."
        confirmLabel="Apply Override"
        destructive
        onConfirm={() => {
          setShowOverrideDialog(false)
          toast.success("Eligibility override applied.")
        }}
      />

      {/* Unsaved Changes */}
      <UnsavedChangesDialog
        open={showUnsavedPrompt}
        onOpenChange={(open) => !open && resolvePrompt("stay")}
        isSaving={benefitDraft.status === "saving"}
        onSaveAndLeave={async () => {
          await saveDraft()
          resolvePrompt("leave")
        }}
        onLeaveWithoutSaving={() => resolvePrompt("leave")}
      />

      {/* Success Dialog */}
      <Dialog open={!!successDialog} onOpenChange={(open) => !open && setSuccessDialog(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-2xl">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm">
              <CheckCircle2 className="size-7" />
            </div>
            <DialogTitle className="text-center font-heading text-xl font-bold tracking-tight text-foreground">
              Benefit Claim Submitted
            </DialogTitle>
            <DialogDescription className="text-center text-xs leading-relaxed text-muted-foreground">
              Claim reference{" "}
              <span className="font-mono font-bold text-foreground">
                {successDialog?.applicationNumber}
              </span>{" "}
              successfully queued for administrative verification and approval.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-col">
            <Button
              className="w-full h-9 rounded-xl text-xs font-semibold shadow-xs active:scale-95"
              onClick={() => successDialog && navigate(`/benefits/${successDialog.id}`)}
            >
              View Benefit Claim Record
            </Button>
            <Button
              variant="outline"
              className="w-full h-9 rounded-xl text-xs font-semibold active:scale-95"
              onClick={resetWizard}
            >
              Create Another Application
            </Button>
            <Button
              variant="ghost"
              className="w-full h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/benefits")}
            >
              Return to Benefit Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SupportingFilesList({
  files,
  documents,
  uploadProgress,
  onRemove,
}: {
  files: File[]
  documents: BenefitDocument[]
  uploadProgress: Record<string, number>
  onRemove: (file: File) => void
}) {
  const [localEntries, setLocalEntries] = React.useState<Array<{ file: File; url: string }>>([])

  React.useEffect(() => {
    const entries = files.map((file) => ({ file, url: URL.createObjectURL(file) }))
    setLocalEntries(entries)
    return () => entries.forEach((entry) => URL.revokeObjectURL(entry.url))
  }, [files])

  const imageGallery = [
    ...localEntries.filter((entry) => isImageFile(entry.file.name)).map((entry) => ({
      url: entry.url,
      name: entry.file.name,
    })),
    ...documents.filter((document) => isImageFile(document.fileName)).map((document) => ({
      url: document.fileUrl,
      name: document.fileName,
    })),
  ]

  if (localEntries.length === 0 && documents.length === 0) return null

  return (
    <div className="mt-3 space-y-2">
      {localEntries.map(({ file, url }) => {
        const progress = uploadProgress[fileKey(file)]
        return (
          <SupportingFileRow
            key={`${file.name}-${file.size}-${file.lastModified}`}
            name={file.name}
            url={url}
            status={progress !== undefined ? "Uploading" : "Ready to upload"}
            progress={progress}
            imageGallery={imageGallery}
            onRemove={() => onRemove(file)}
          />
        )
      })}
      {documents.map((document) => (
        <SupportingFileRow
          key={document.id}
          name={document.fileName}
          url={document.fileUrl}
          status="Uploaded"
          imageGallery={imageGallery}
        />
      ))}
    </div>
  )
}

function SupportingFileRow({
  name,
  url,
  status,
  progress,
  imageGallery,
  onRemove,
}: {
  name: string
  url: string
  status: "Ready to upload" | "Uploading" | "Uploaded"
  progress?: number
  imageGallery: Array<{ url: string; name: string }>
  onRemove?: () => void
}) {
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const isImage = isImageFile(name)
  const isPdf = isPdfFile(name)
  const imageIndex = isImage ? Math.max(0, imageGallery.findIndex((image) => image.url === url)) : 0

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-2.5 shadow-2xs backdrop-blur-xs transition-all hover:border-border">
      <div className="flex min-w-0 items-center gap-3">
        {isImage ? (
          <img
            src={url}
            alt={name}
            className="size-9 shrink-0 rounded-lg border border-border/80 object-cover shadow-2xs"
          />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <FileText className="size-4" strokeWidth={2.2} />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-heading text-xs font-semibold text-foreground">{name}</p>
          <p
            className={cn(
              "text-[10px] font-medium",
              status === "Uploaded"
                ? "text-emerald-600 dark:text-emerald-400"
                : status === "Uploading"
                  ? "text-primary"
                  : "text-muted-foreground"
            )}
          >
            {status}
          </p>
          {status === "Uploading" && (
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1 w-32 max-w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${progress ?? 0}%` }}
                />
              </div>
              <span className="font-mono text-[9px] text-primary">{progress ?? 0}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {(isImage || isPdf) && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-lg hover:bg-muted/80 active:scale-90"
            aria-label={`Preview ${name}`}
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="size-3.5" />
          </Button>
        )}
        {onRemove && status !== "Uploading" && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-90"
            aria-label={`Remove ${name}`}
            onClick={onRemove}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      {isImage && (
        <ImagePreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          images={imageGallery}
          initialIndex={imageIndex}
        />
      )}
      {isPdf && (
        <PDFPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} url={url} name={name} />
      )}
    </div>
  )
}

function ReviewBlock({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/15 px-5 py-3.5">
        <Icon className="size-4 text-primary" />
        <p className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">{title}</p>
      </div>
      <dl className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">{children}</dl>
    </div>
  )
}

function ReviewRow({
  label,
  value,
  isMono,
}: {
  label: string
  value: string
  isMono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/30 pb-2.5 last:border-0 sm:border-b-0 sm:pb-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-heading text-xs font-semibold text-foreground truncate",
          isMono && "font-mono font-bold"
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function RecipientMultiSelect({
  values,
  onChange,
  options,
  placeholder,
  emptyText = "No registered recipient found.",
}: {
  values: string[]
  onChange: (values: string[]) => void
  options: Array<{ value: string; label: string; description: string }>
  placeholder: string
  emptyText?: string
}) {
  const [open, setOpen] = React.useState(false)
  const pendingScrollTop = React.useRef<number | null>(null)

  React.useLayoutEffect(() => {
    if (pendingScrollTop.current == null) return
    const scrollTop = pendingScrollTop.current
    const restoreScroll = () => window.scrollTo(window.scrollX, scrollTop)
    restoreScroll()
    const frame = requestAnimationFrame(restoreScroll)
    const timer = window.setTimeout(() => {
      restoreScroll()
      pendingScrollTop.current = null
    }, 50)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [values])

  function toggle(value: string) {
    pendingScrollTop.current = window.scrollY
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button
          type="button"
          variant="outline"
          className="min-h-10 h-auto w-full justify-between px-3 py-2 font-normal rounded-xl border-border/70 bg-background/80 shadow-2xs hover:bg-muted"
        >
          {values.length === 0 ? (
            <span className="text-muted-foreground text-xs">{placeholder}</span>
          ) : (
            <span className="flex min-w-0 flex-wrap gap-1.5">
              {values.map((value) => (
                <span
                  key={value}
                  className="flex max-w-full items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 pl-2 pr-1 py-0.5 text-[11px] font-semibold text-primary"
                >
                  <span className="truncate">{value}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return
                      e.preventDefault()
                      e.stopPropagation()
                      toggle(value)
                    }}
                    className="shrink-0 rounded-full p-0.5 hover:bg-primary/20"
                    aria-label={`Remove ${value}`}
                  >
                    <X className="size-3" />
                  </span>
                </span>
              ))}
            </span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--anchor-width] p-0 rounded-2xl overflow-hidden shadow-xl" align="start">
        <Command>
          <CommandInput placeholder="Search recipient…" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.description}`}
                  onSelect={() => toggle(option.value)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "size-4 mr-2",
                      values.includes(option.value) ? "opacity-100 text-primary" : "opacity-0"
                    )}
                  />
                  <div className="min-w-0">
                    <span className="block truncate font-heading text-xs font-semibold">{option.label}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}