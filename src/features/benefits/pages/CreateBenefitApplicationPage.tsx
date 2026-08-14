import * as React from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { 
  AlertTriangle, 
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
  FileText
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
import { StatusBadge } from "@/components/shared/StatusBadge"
import { SaveDraftButton } from "@/components/shared/SaveDraftButton"
import { DraftStatusBadge } from "@/components/shared/DraftStatusBadge"
import { UnsavedChangesDialog } from "@/components/shared/UnsavedChangesDialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { BenefitsOfficerCommandSelect } from "@/features/benefits/components/BenefitsOfficerCommandSelect"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { getMember, missingProfileFields } from "@/services/members.service"
import { listAllContributions } from "@/services/contributions.service"
import { listAllDeductions } from "@/services/deductions.service"
import { listDeductionTypes } from "@/services/deduction-types.service"
import { getMemberLoans } from "@/services/loans.service"
import { createBenefitApplication, getBenefit, listBenefitTypes, getMemberBenefits, updateBenefitApplication, uploadBenefitDocument, type CreateBenefitApplicationInput } from "@/services/benefits.service"
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
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

/** Policy defaults used while system settings are loading or for older saved settings. */
const DEFAULT_SIBLING_SCHEDULE = [15000, 10000, 5000]
const NUCLEAR_MORTUARY_BENEFIT_NAME = "Mortuary Cash Assistance for Nuclear Family Member"
const RETIREMENT_BENEFIT_NAME = "Retirement and Separation Benefit"
type NuclearClaimSubjectType = "Member" | "Spouse" | "Child" | "Parent" | "Sibling"

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

/** Plain recipient/claim-subject names out of a stored `beneficiaryOrRecipient` label (strips any trailing "(Relationship)" or "(ClaimSubjectType)" suffix). */
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
  const canOverride = hasPermission("benefits.override_eligibility") && (benefitSettings?.allowEligibilityOverride ?? true)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

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

  /** Up to 3 beneficiary ids, in claim order — Nuclear Mortuary sibling schedule (unmarried member) only. */
  const [siblingBeneficiaryIds, setSiblingBeneficiaryIds] = React.useState<string[]>([])

  const [requirements, setRequirements] = React.useState<Record<string, boolean>>({})
  const [requirementFiles, setRequirementFiles] = React.useState<Record<string, File>>({})
  const [supportingFiles, setSupportingFiles] = React.useState<File[]>([])
  const [isUploadingDocuments, setIsUploadingDocuments] = React.useState(false)
  const [supportingUploadProgress, setSupportingUploadProgress] = React.useState<Record<string, number>>({})

  const [agree, setAgree] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [successDialog, setSuccessDialog] = React.useState<{ id: string; applicationNumber: string } | null>(null)

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
  const { data: allContributions = [] } = useQuery({ queryKey: ["contributions", "all"], queryFn: listAllContributions })
  const { data: allDeductions = [] } = useQuery({ queryKey: ["deductions", "all"], queryFn: listAllDeductions })
  const benefitType = benefitTypes.find((bt) => bt.id === benefitTypeId)
  const retirementBenefitRestricted = (benefitSettings?.requireRetiredStatusForRetirementBenefit ?? true)
    && member?.retireeStatus !== "Retired"
  const pabaonDeductionType = deductionTypes.find((type) => type.code.toLowerCase() === "pabaon")

  const memberLoans = memberId ? getMemberLoans(memberId) : []
  const memberContributions = memberId ? allContributions.filter((c) => c.memberId === memberId && c.status === "Posted") : []
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
    ? allDeductions.filter((deduction) =>
        deduction.memberId === memberId
        && deduction.status === "Posted"
        && (
          deduction.deductionTypeId === pabaonDeductionType?.id
          || deduction.deductionTypeCode?.toLowerCase() === "pabaon"
        )
      )
    : []
  const memberDirectPabaonContributions = memberContributions.filter((contribution) => contribution.contributionType === "Cash Pabaon")
  const memberMonthlyDuesContributions = memberContributions.filter((contribution) => contribution.contributionType === "Monthly Dues")
  const monthlyDuesMonthCount = countDistinctPeriods(
    memberMonthlyDuesContributions.map((contribution) => contribution.contributionPeriod)
  )
  // Cash Pabaon can be posted either as its own contribution or as a payroll deduction —
  // but a payroll-deducted one always gets mirrored into a matching Contribution record
  // too (ContributionController::postCashPabaonContribution), so summing both ledgers
  // as-is would double-count every payroll-deducted month. Only fall back to a period's
  // Deduction amount when no Contribution record exists for that period (legacy/imported
  // data predating the auto-mirroring) — same period-based de-dup as the month count below.
  const pabaonPeriodsWithContribution = new Set(memberDirectPabaonContributions.map((contribution) => contribution.contributionPeriod))
  const totalCashPabaonAmount = memberDirectPabaonContributions.reduce((sum, contribution) => sum + contribution.amount, 0)
    + memberPabaonDeductions
        .filter((deduction) => !pabaonPeriodsWithContribution.has(deduction.period))
        .reduce((sum, deduction) => sum + deduction.amount, 0)
  const monthlyDuesFundTotals = memberMonthlyDuesContributions
    .flatMap((contribution) => contribution.fundAllocations ?? [])
    .reduce<Record<string, number>>((totals, allocation) => {
      totals[allocation.fundName] = (totals[allocation.fundName] ?? 0) + allocation.allocatedAmount
      return totals
    }, {})
  const cashPabaonMonthCount = countDistinctPeriods([
    ...memberPabaonDeductions.map((deduction) => deduction.period),
    ...memberDirectPabaonContributions.map((contribution) => contribution.contributionPeriod),
  ])
  const latestContributionDate = [
    ...memberContributions.map((contribution) => contribution.paymentDate),
    ...memberPabaonDeductions.map((deduction) => deduction.paymentDate),
  ].filter(Boolean).sort((left, right) => right.localeCompare(left))[0]

  const isNuclearMortuary = benefitType?.name === NUCLEAR_MORTUARY_BENEFIT_NAME
  const isSiblingSchedule = isNuclearMortuary && claimSubjectType === "Sibling"
  const siblingSiblingBeneficiaries = member?.beneficiaries.filter((beneficiary) =>
    /^(single brother|single sister)$/i.test(String(beneficiary.relationship ?? "").trim())
  ) ?? []
  const siblingScheduleTotal = siblingBeneficiaryIds.slice(0, 3).reduce((sum, _id, i) => sum + siblingSchedule[i], 0)
  const allowedClaimSubjectTypes: NuclearClaimSubjectType[] = member?.civilStatus === "Married"
    ? ["Member", "Spouse", "Child"]
    : ["Member", "Parent", "Sibling"]
  const claimSubjectOptions = member?.beneficiaries.filter((beneficiary) => {
    if (claimSubjectType === "Spouse") return /spouse|husband|wife/i.test(beneficiary.relationship)
    if (claimSubjectType === "Child") return /^unmarried child$/i.test(String(beneficiary.relationship ?? "").trim())
    if (claimSubjectType === "Parent") return /parent|father|mother/i.test(beneficiary.relationship)
    if (claimSubjectType === "Sibling") return /^(single brother|single sister)$/i.test(String(beneficiary.relationship ?? "").trim())
    return false
  }) ?? []
  const eligibleSiblingIdKey = siblingSiblingBeneficiaries.map((beneficiary) => beneficiary.id).sort().join("|")
  const eligibleClaimSubjectNameKey = claimSubjectOptions.map((beneficiary) => beneficiary.fullName).sort().join("|")

  React.useEffect(() => {
    const eligibleIds = new Set(eligibleSiblingIdKey ? eligibleSiblingIdKey.split("|") : [])
    setSiblingBeneficiaryIds((current) => current.filter((beneficiaryId) => eligibleIds.has(beneficiaryId)))
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
    .map((beneficiaryId) => member?.beneficiaries.find((beneficiary) => beneficiary.id === beneficiaryId)?.fullName)
    .filter((name): name is string => Boolean(name))
  const effectiveClaimSubjectNames = isSiblingSchedule ? siblingClaimSubjectNames : claimSubjectNames

  React.useEffect(() => {
    if (!isNuclearMortuary || !member || claimSubjectType) return
    setClaimSubjectType("Member")
    setClaimSubjectNames([member.fullName])
  }, [isNuclearMortuary, member, claimSubjectType])

  const monthsPaid = benefitType?.prorationBasis === "pabaon"
    ? countDistinctPeriods([
        ...memberPabaonDeductions.map((deduction) => deduction.period),
        ...memberDirectPabaonContributions.map((contribution) => contribution.contributionPeriod),
      ])
    : countDistinctPeriods(memberContributions.map((c) => c.contributionPeriod))
  const pabaonResolutionScope = member?.membershipDate && member.membershipDate >= "2026-09-01" ? "new" : "legacy"
  const applicableProrationTiers = benefitType?.prorationBasis === "pabaon"
    ? benefitType.prorationTiers.filter((tier) => tier.membershipScope === "all" || tier.membershipScope === pabaonResolutionScope)
    : benefitType?.prorationTiers ?? []
  const prorationPreview = benefitType && applicableProrationTiers.length > 0 && !isSiblingSchedule
    ? computeProratedAmount(applicableProrationTiers, benefitType.fyAmounts, benefitType.maximumAmount, monthsPaid, new Date(applicationDate).getFullYear())
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [benefitType, prorationPreview?.amount, isSiblingSchedule, siblingScheduleTotal, isNuclearMortuary, claimSubjectType, parentMortuaryAmount])

  React.useEffect(() => {
    if (benefitType) {
      setRequirements((prev) => Object.fromEntries(benefitType.requiredDocuments.map((d) => [d, prev[d] ?? false])))
      if (recipientType === "Member") {
        setRecipientNames(member?.fullName ? [member.fullName] : [])
      }
    }
  }, [benefitType, member, recipientType])

  const hydratedBenefitIdRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!existingBenefit) return
    // Only hydrate local wizard state the first time a draft is opened.
    // The query cache is rewritten with the server response after a manual
    // save, which changes `existingBenefit`'s reference. Re-running this
    // after that would snap the step
    // (and any in-flight edits) back to whatever was last persisted.
    if (hydratedBenefitIdRef.current === existingBenefit.id) return
    hydratedBenefitIdRef.current = existingBenefit.id
    setMemberId(existingBenefit.memberId)
    setBenefitTypeId(existingBenefit.benefitTypeId)
    setRequestedAmount(existingBenefit.requestedAmount || undefined)
    setIncidentDate(existingBenefit.incidentDate ?? "")
    setReason(existingBenefit.reason ?? "")
    setRecipientNames(extractRecipientNames(existingBenefit.beneficiaryOrRecipient ?? ""))
    setRequirements(Object.fromEntries((existingBenefit.requirements ?? []).map((r) => [r.label, r.completed])))
    setStep(existingBenefit.draftCurrentStep ?? 1)
  }, [existingBenefit])

  React.useEffect(() => {
    if (!existingBenefit || benefitType?.name !== NUCLEAR_MORTUARY_BENEFIT_NAME || !member) return
    const storedSubjects = (existingBenefit.beneficiaryOrRecipient ?? "").split(",").map((entry) => entry.trim()).filter(Boolean)
    const storedType = storedSubjects[0]?.match(/\((Member|Spouse|Child|Parent|Sibling)\)$/)?.[1] as NuclearClaimSubjectType | undefined
    if (!storedType) return
    const names = storedSubjects.map((entry) => entry.replace(/\s*\((Member|Spouse|Child|Parent|Sibling)\)$/, "").trim())
    setClaimSubjectType(storedType)
    if (storedType === "Sibling") {
      setSiblingBeneficiaryIds(
        names.map((name) => member.beneficiaries.find((beneficiary) => beneficiary.fullName === name)?.id).filter((id): id is string => Boolean(id)).slice(0, 3)
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

  // An existing draft is itself present in the member's benefits list, so it
  // must be excluded here to avoid counting the draft as its own duplicate.
  const currentBenefitId = id ?? benefitDraft.draftId
  const otherMemberBenefits = memberBenefits.filter((b) => b.id !== currentBenefitId)
  const priorBenefitOfType = otherMemberBenefits.filter((b) =>
    b.benefitTypeId === benefitTypeId
    && ["Released", "Completed"].includes(b.status)
    && Boolean(b.releaseDate)
    && new Date(b.releaseDate!) >= benefitYearStart
  )
  // A "duplicate" pending application is one for the same benefit type AND the same
  // recipient/claim subject — e.g. two separate pending claims for two different
  // children under the same benefit type are not duplicates of each other.
  const currentRecipientNames = isNuclearMortuary ? effectiveClaimSubjectNames : recipientNames
  const pendingBenefitOfType = !(benefitSettings?.allowMultiplePendingApplications ?? false)
    && otherMemberBenefits.some((b) =>
      b.benefitTypeId === benefitTypeId
      && ["Draft", "Submitted", "Under Review", "For Approval"].includes(b.status)
      && extractRecipientNames(b.beneficiaryOrRecipient ?? "").some((name) => currentRecipientNames.includes(name))
    )

  const eligibilityItems = member && benefitType
    ? evaluateBenefitEligibility(
        member,
        benefitType,
        requestedAmount,
        priorBenefitOfType.length,
        pendingBenefitOfType,
        benefitType.name === CASH_PABAON_PROGRAM_NAME
          ? { recipientType, recipientNames, hasOutstandingObligations: overdueLoans.length > 0 }
          : undefined,
        benefitSettings?.requireRetiredStatusForRetirementBenefit ?? true,
      )
    : []
  const eligibilityResult: EligibilityResult = eligibilityItems.length > 0 ? resultFor(eligibilityItems) : "Not Eligible"
  const isBlocked = eligibilityResult !== "Eligible" && !(overrideEnabled && overrideReason.trim() && overrideConfirmed)
  const missingMemberProfileFields = member ? missingProfileFields(member) : []
  const missingMemberSectionLabel = missingMemberProfileFields.some((field) => ["Email Address", "Cellphone Number", "Permanent Address"].includes(field))
    ? "Personal Information"
    : missingMemberProfileFields.includes("Beneficiaries")
      ? "Beneficiaries"
      : "Documents"

  const requirementEntries = benefitType ? benefitType.requiredDocuments.map((label) => ({ label, completed: !!requirements[label] })) : []
  const missingRequirements = requirementEntries.filter((r) => !r.completed)

  const recipientName = recipientNames.join(", ")
  const recipientLabel = recipientNames.map((name) => {
    const beneficiary = member?.beneficiaries.find((item) => item.fullName === name)
    return recipientType === "Beneficiary" && beneficiary ? `${name} (${beneficiary.relationship})` : name
  }).join(", ")
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
        toast.warning(`Draft saved, but these files could not be uploaded: ${failedFiles.map((file) => file.name).join(", ")}.`)
      } else {
        toast.success("Draft saved successfully.")
      }
    } catch {}
  }

  async function uploadSupportingFiles(benefit: BenefitApplication, filesToUpload: File[] = supportingFiles): Promise<File[]> {
    if (filesToUpload.length === 0) return []
    setIsUploadingDocuments(true)
    const failed: File[] = []
    const uploaded: BenefitDocument[] = []
    try {
      for (const file of filesToUpload) {
        const key = fileKey(file)
        try {
          setSupportingUploadProgress((current) => ({ ...current, [key]: 0 }))
          const requirementLabel = Object.entries(requirementFiles).find(([, requirementFile]) => fileKey(requirementFile) === key)?.[0]
            ?? "Additional Supporting Document"
          uploaded.push(await uploadBenefitDocument(benefit.id, file, (progress) => {
            setSupportingUploadProgress((current) => ({ ...current, [key]: progress }))
          }, requirementLabel))
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
      if (isNuclearMortuary && (!claimSubjectType || (!isSiblingSchedule && claimSubjectNames.length === 0))) return false
      return !!benefitTypeId && !!requestedAmount && !!reason.trim() && !!resolvedRecipientName.trim() && !!assignedOfficer.trim()
        && missingRequirements.length === 0
    }
    if (s === 3) return !isBlocked
    return true
  }

  function goNext() {
    if (!canProceedFromStep(step)) {
      toast.error("Please complete the required fields before continuing.")
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
        toast.error("This application cannot be submitted until eligibility is met or overridden.")
        return
      }
      if (!agree) {
        toast.error("Please confirm the information has been reviewed and is accurate.")
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
      // Files require an application id. Persist as Draft first, upload every
      // requirement, and only then transition to Submitted so a failed upload
      // can never leave an incomplete application in the approval workflow.
      const draftBenefit = await benefitDraft.save(payload)
      const failedFiles = await uploadSupportingFiles(draftBenefit)
      if (asDraft) {
        if (failedFiles.length > 0) toast.warning(`Draft saved, but ${failedFiles.length} supporting file(s) could not be uploaded.`)
        else toast.success("Draft saved successfully.")
      } else {
        const requiredFileKeys = new Set(Object.values(requirementFiles).map(fileKey))
        const failedRequiredFiles = failedFiles.filter((file) => requiredFileKeys.has(fileKey(file)))
        if (failedRequiredFiles.length > 0) {
          throw new Error(`Required document upload failed: ${failedRequiredFiles.map((file) => file.name).join(", ")}. The application remains a draft.`)
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
    <div className="mx-auto w-full space-y-6 pb-24">
      {/* Page Header */}
      <PageHeader
        title={isDraftContext ? "Continue Benefit Application Draft" : "Create Benefit Application"}
        description="Encode a benefit application based on physical documents submitted by the member."
        badge={isDraftContext ? <DraftStatusBadge status="Draft" /> : undefined}
      />

      {/* Step Indicator Card */}
      <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 shadow-xs">
        <WizardStepIndicator steps={STEPS} currentStep={step} />
      </div>

      {/* STEP 1: Select Member */}
      {step === 1 && (
        <FormSection title="Step 1 · Select Member">
          <MemberSelectionStep
            selectedMemberId={memberId || undefined}
            member={member}
            onSelect={setMemberId}
            totalContributions={totalContributions}
            outstandingLoanBalance={outstandingLoanBalance}
            activeLoanCount={activeLoans.length}
            overdueLoanCount={overdueLoans.length}
            extra={
              memberBenefits.length > 0 ? (
                <div className="rounded-xl border border-border/50 bg-muted/30 p-4 text-xs text-muted-foreground shadow-2xs flex items-center gap-3">
                  <Layers className="size-4 text-primary shrink-0" />
                  <span>
                    <strong className="text-foreground">Recent Benefits Record: </strong>
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
        <FormSection title="Step 2 · Benefit Details & Purpose">
          {member && (
            <div className="mb-5 rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Users className="size-4" />
                Selected Member
              </div>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ReviewRow label="Full Name" value={member.fullName} />
                <ReviewRow label="Member Number" value={member.memberNumber} />
                <ReviewRow label="Office" value={member.officeName} />
                <ReviewRow label="Membership Status" value={member.membershipStatus} />
                <ReviewRow label="Retiree Status" value={member.retireeStatus} />
              </dl>
              <div className="mt-4 border-t border-primary/15 pt-4">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Layers className="size-3.5 text-primary" />
                  Contribution Snapshot
                </div>
                <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <ReviewRow label="Posted Contribution Amount" value={formatCurrency(totalContributions)} />
                  <ReviewRow label="Monthly Dues Months" value={String(monthlyDuesMonthCount)} />
                  <ReviewRow label="Cash Pabaon Months" value={String(cashPabaonMonthCount)} />
                  <ReviewRow label="Total Cash Pabaon Amount" value={formatCurrency(totalCashPabaonAmount)} />
                  <ReviewRow label="Latest Posted Payment" value={latestContributionDate ? formatDateShort(latestContributionDate) : "No posted payment"} />
                </dl>
              </div>
              {Object.keys(monthlyDuesFundTotals).length > 0 && (
                <div className="mt-4 border-t border-primary/15 pt-4">
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Layers className="size-3.5 text-primary" />
                    Monthly Dues — Fund Allocation Totals
                  </div>
                  <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {Object.entries(monthlyDuesFundTotals).map(([fundName, total]) => (
                      <ReviewRow key={fundName} label={fundName} value={formatCurrency(total)} />
                    ))}
                  </dl>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-2 lg:col-span-3">
              <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                Application Date <span className="text-destructive font-bold">*</span>
              </Label>
              <Input 
                type="date" 
                value={applicationDate} 
                onChange={(e) => setApplicationDate(e.target.value)} 
                className="h-10 text-sm rounded-xl" 
              />
            </div>
            
            <div className="space-y-2 lg:col-span-3">
              <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                Benefit Type <span className="text-destructive font-bold">*</span>
              </Label>
              <CommandSelect
                className="w-full h-10 text-sm bg-background border-border hover:bg-accent/40 transition-all rounded-xl"
                value={benefitTypeId}
                onValueChange={(v) => {
                  const nextBenefitTypeId = v ?? ""
                  setBenefitTypeId(nextBenefitTypeId)
                  setRequirements({})
                  setRequirementFiles({})
                  setSupportingFiles([])
                  if (benefitTypes.find((type) => type.id === nextBenefitTypeId)?.name !== NUCLEAR_MORTUARY_BENEFIT_NAME) {
                    setClaimSubjectType("")
                    setClaimSubjectNames([])
                    setSiblingBeneficiaryIds([])
                  }
                }}
                options={benefitTypes
                  .filter((bt) => bt.status === "Active" && !(retirementBenefitRestricted && bt.name === RETIREMENT_BENEFIT_NAME))
                  .map((bt) => ({ value: bt.id, label: bt.name }))}
                placeholder="Select benefit program type"
              />
              {retirementBenefitRestricted && (
                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  Retirement and Separation Benefit is unavailable because this member&apos;s Retiree Status is not Retired.
                </p>
              )}
            </div>

            <div className="space-y-2 lg:col-span-3">
              <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                Requested Amount <span className="text-destructive font-bold">*</span>
              </Label>
              {isComputedAmount ? (
                /* Computed Amount Display Banner */
                <div className={cn(
                  "rounded-2xl border p-4 shadow-2xs space-y-1.5 relative overflow-hidden",
                  prorationPreview && !prorationPreview.tier
                    ? "border-warning/40 bg-warning/[0.06]"
                    : "border-primary/30 bg-primary/[0.03]"
                )}>
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1",
                      prorationPreview && !prorationPreview.tier ? "text-warning" : "text-primary"
                    )}>
                      <Calculator className="size-3.5" /> Automated System Calculation
                    </span>
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      prorationPreview && !prorationPreview.tier ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
                    )}>
                      {isSiblingSchedule
                        ? `${siblingBeneficiaryIds.length}/3 Selected`
                        : prorationPreview && !prorationPreview.tier
                          ? "Below Minimum"
                          : "Fixed Formula"}
                    </span>
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(requestedAmount ?? 0)}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isSiblingSchedule
                      ? siblingBeneficiaryIds.length === 0
                        ? `Select at least one qualified single sibling. The first selected sibling receives ${formatCurrency(siblingSchedule[0])}.`
                        : `${siblingBeneficiaryIds.length} qualified sibling${siblingBeneficiaryIds.length > 1 ? "s" : ""} selected. Automated schedule: ${siblingBeneficiaryIds.map((_id, index) => formatCurrency(siblingSchedule[index])).join(" + ")} = ${formatCurrency(siblingScheduleTotal)}.`
                      : isNuclearMortuary && claimSubjectType === "Parent"
                        ? `${claimSubjectNames.length} living parent${claimSubjectNames.length === 1 ? "" : "s"} selected. The configured parent mortuary amount is ${formatCurrency(parentMortuaryAmount)}.`
                      : isNuclearMortuary && claimSubjectType === "Member"
                        ? prorationPreview?.tier
                          ? `${monthsPaid} distinct posted contribution month(s) qualify for the Core Benefits ${prorationPreview.tier.minMonths}${prorationPreview.tier.maxMonths == null ? "+" : `–${prorationPreview.tier.maxMonths}`} month tier at ${prorationPreview.tier.percentage}% of ${formatCurrency(benefitType?.maximumAmount ?? 0)}.`
                          : `${monthsPaid} distinct posted contribution month(s) recorded. The first Core Benefits tier requires ${minimumProrationMonths} months.`
                      : isNuclearMortuary
                        ? claimSubjectType
                          ? `The requested amount follows the configured ${claimSubjectType.toLowerCase()} mortuary benefit amount.`
                          : "Select an eligible relationship category and qualified family member to complete the automated calculation."
                      : prorationPreview?.tier
                        ? `${pabaonResolutionScope === "legacy" ? "Resolution 24-2026 (Old Member)" : "Resolution 27-2026 (New Member)"}: ${monthsPaid} distinct fully paid Cash Pabaon month(s) qualify for the ${prorationPreview.tier.minMonths}${prorationPreview.tier.maxMonths == null ? "+" : `–${prorationPreview.tier.maxMonths}`} month tier at ${prorationPreview.tier.percentage}%.`
                        : `${pabaonResolutionScope === "legacy" ? "Resolution 24-2026 (Old Member)" : "Resolution 27-2026 (New Member)"}: ${monthsPaid} fully paid month(s) recorded. The first benefit tier requires ${minimumProrationMonths} months, so ${Math.max(0, minimumProrationMonths - monthsPaid)} more month(s) are needed.`}
                  </p>
                </div>
              ) : (
                <CurrencyInput value={requestedAmount} onChange={setRequestedAmount} />
              )}
            </div>

            <div className="space-y-2 lg:col-span-3">
              <Label className="text-xs font-semibold text-foreground/80">Incident Date</Label>
              <Input 
                type="date" 
                value={incidentDate} 
                onChange={(e) => setIncidentDate(e.target.value)} 
                className="h-10 text-sm rounded-xl" 
              />
            </div>

            {isNuclearMortuary && (
              <div
                className="rounded-xl border border-primary/20 bg-primary/[0.025] p-4 sm:col-span-2 lg:col-span-6"
                style={{ overflowAnchor: "none" }}
              >
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Nuclear Family Claim Subject</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Married members may claim only for a legal spouse or a legitimate/legally adopted unmarried child. Unmarried members may claim for living parent/s or up to three registered single siblings.
                  </p>
                </div>
                {!claimSubjectType && (
                  <AlertBanner
                    tone="info"
                    className="mb-4"
                    title="Select an eligible relationship category"
                    description={`This member is recorded as ${member?.civilStatus ?? "having no civil status"}. The available categories below are limited automatically by the policy.`}
                  />
                )}
                {claimSubjectType === "Sibling" && siblingSiblingBeneficiaries.length === 0 && (
                  <AlertBanner
                    tone="warning"
                    className="mb-4"
                    title="No eligible single sibling is registered"
                    description="Open Edit Member Information → Beneficiaries, then change the qualified sibling's relationship to Single Brother or Single Sister and save. Brother, Sister, or Sibling alone is not enough to confirm eligibility."
                  />
                )}
                {claimSubjectType === "Sibling" && siblingSiblingBeneficiaries.length > 0 && (
                  <AlertBanner
                    tone="info"
                    className="mb-4"
                    title="Select a maximum of three single siblings"
                    description={`The system applies the saved schedule in selection order: ${formatCurrency(siblingSchedule[0])}, ${formatCurrency(siblingSchedule[1])}, then ${formatCurrency(siblingSchedule[2])}.`}
                  />
                )}
                {claimSubjectType && !["Member", "Sibling"].includes(claimSubjectType) && claimSubjectOptions.length === 0 && (
                  <AlertBanner
                    tone="warning"
                    className="mb-4"
                    title={`No eligible ${claimSubjectType.toLowerCase()} is registered`}
                    description={claimSubjectType === "Child"
                      ? "Open Edit Member Information → Beneficiaries and use the relationship Unmarried Child for a legitimate or legally adopted qualified child."
                      : `Open Edit Member Information → Beneficiaries, add or correct the qualified ${claimSubjectType.toLowerCase()}, then save the member profile.`}
                  />
                )}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground/80">
                      Eligible Relationship Category <span className="text-destructive font-bold">*</span>
                    </Label>
                    <CommandSelect
                      className="h-10 w-full rounded-xl"
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
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground/80">
                      Qualified Family Member <span className="text-destructive font-bold">*</span>
                    </Label>
                    {claimSubjectType === "Member" ? (
                      <div className="flex min-h-10 items-center rounded-xl border border-primary/20 bg-primary/[0.04] px-3 text-sm font-semibold text-foreground">
                        {member?.fullName ?? "Selected member"}
                      </div>
                    ) : claimSubjectType === "Sibling" ? (
                      <div className="space-y-2">
                        <RecipientMultiSelect
                          values={siblingClaimSubjectNames}
                          onChange={(names) => {
                            setSiblingBeneficiaryIds(
                              names.slice(0, 3)
                                .map((name) => siblingSiblingBeneficiaries.find((beneficiary) => beneficiary.fullName === name)?.id)
                                .filter((id): id is string => Boolean(id))
                            )
                          }}
                          options={siblingSiblingBeneficiaries.map((beneficiary) => ({
                            value: beneficiary.fullName,
                            label: beneficiary.fullName,
                            description: beneficiary.relationship,
                          }))}
                          placeholder="Select up to three registered single siblings"
                          emptyText="No eligible single sibling found. In Edit Member Information, set the relationship to Single Brother or Single Sister."
                        />
                        {siblingClaimSubjectNames.length > 0 && (
                          <div className="space-y-1 rounded-lg border border-primary/15 bg-background/70 p-2.5">
                            {siblingClaimSubjectNames.map((name, index) => (
                              <div key={name} className="flex items-center justify-between gap-3 text-xs">
                                <span className="truncate font-medium">{index + 1}. {name}</span>
                                <span className="shrink-0 font-bold text-primary">{formatCurrency(siblingSchedule[index])}</span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between border-t border-border/60 pt-1.5 text-xs font-bold">
                              <span>Total Requested Amount</span>
                              <span className="text-primary">{formatCurrency(siblingScheduleTotal)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <RecipientMultiSelect
                        values={claimSubjectNames}
                        onChange={(names) => setClaimSubjectNames(names.slice(claimSubjectType === "Parent" ? -2 : -1))}
                        options={claimSubjectOptions.map((beneficiary) => ({
                          value: beneficiary.fullName,
                          label: beneficiary.fullName,
                          description: beneficiary.relationship,
                        }))}
                        placeholder={claimSubjectType === "Parent"
                          ? "Select up to two registered living parents"
                          : claimSubjectType
                            ? `Select registered ${claimSubjectType.toLowerCase()}`
                            : "Select claim subject type first"}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {!isNuclearMortuary && (
              <>
                <div className="space-y-2 lg:col-span-2 lg:col-start-1">
                  <Label className="text-xs font-semibold text-foreground/80">Recipient Type</Label>
                  <CommandSelect
                    className="w-full h-10 text-sm bg-background border-border hover:bg-accent/40 transition-all rounded-xl"
                    value={recipientType}
                    onValueChange={(v) => {
                      const nextType = (v ?? "Member") as "Member" | "Beneficiary"
                      setRecipientType(nextType)
                      setRecipientNames(nextType === "Member" && member ? [member.fullName] : [])
                    }}
                    options={[
                      { value: "Member", label: "Member" },
                      { value: "Beneficiary", label: "Beneficiary" },
                    ]}
                    hideSearch
                  />
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                    Recipient Name <span className="text-destructive font-bold">*</span>
                  </Label>
                  {recipientType === "Member" ? (
                    <Input
                      value={member?.fullName ?? ""}
                      readOnly
                      aria-readonly="true"
                      className="h-10 rounded-xl bg-muted/20 text-sm font-medium"
                    />
                  ) : (
                    <RecipientMultiSelect
                      values={recipientNames}
                      onChange={setRecipientNames}
                      options={member?.beneficiaries.map((beneficiary) => ({
                          value: beneficiary.fullName,
                          label: beneficiary.fullName,
                          description: beneficiary.relationship,
                        })) ?? []}
                      placeholder="Select one or more beneficiaries"
                    />
                  )}
                </div>
              </>
            )}

            <div className={cn("space-y-2 sm:col-span-2", isNuclearMortuary ? "lg:col-span-3 lg:col-start-1" : "lg:col-span-2")}>
              <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                Assigned Benefits Officer <span className="text-destructive font-bold">*</span>
              </Label>
              <BenefitsOfficerCommandSelect value={assignedOfficer} onValueChange={setAssignedOfficer} />
            </div>

            {!isNuclearMortuary && recipientType === "Beneficiary" && (
              <>
                <div className="space-y-2 animate-in fade-in duration-200 lg:col-span-3">
                  <Label className="text-xs font-semibold text-muted-foreground">Relationship to Member</Label>
                  <Input
                    value={recipientNames.map((name) => member?.beneficiaries.find((b) => b.fullName === name)?.relationship).filter(Boolean).join(", ")}
                    placeholder="Based on selection"
                    disabled
                    className="h-10 text-sm rounded-xl bg-muted/20"
                  />
                </div>
                <div className="space-y-2 animate-in fade-in duration-200 lg:col-span-3">
                  <Label className="text-xs font-semibold text-muted-foreground">Contact Number</Label>
                  <Input
                    value={recipientNames.map((name) => member?.beneficiaries.find((b) => b.fullName === name)?.contactNumber).filter(Boolean).join(", ")}
                    placeholder="No registered contact number"
                    disabled
                    className="h-10 text-sm rounded-xl bg-muted/20"
                  />
                </div>
              </>
            )}

            <div className="space-y-2 sm:col-span-2 lg:col-span-6">
              <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                Purpose / Reason <span className="text-destructive font-bold">*</span>
              </Label>
              <Textarea 
                rows={2} 
                placeholder="e.g. Hospitalization, bereavement, calamity assistance" 
                value={reason} 
                onChange={(e) => setReason(e.target.value)} 
                className="text-sm rounded-xl bg-background" 
              />
            </div>

            <div className="space-y-2 sm:col-span-2 lg:col-span-6">
              <Label className="text-xs font-semibold text-foreground/80">Additional Remarks</Label>
              <Textarea 
                rows={2} 
                placeholder="Additional operational notes (optional)" 
                value={remarks} 
                onChange={(e) => setRemarks(e.target.value)} 
                className="text-sm rounded-xl bg-background" 
              />
            </div>
          </div>

          {benefitType && benefitType.requiredDocuments.length > 0 && (
            <div className="mt-6 space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.025] p-5">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold"><FileCheck className="size-4 text-primary" /> Required Documents</h3>
                <p className="mt-1 text-xs text-muted-foreground">Upload every document configured for this benefit type before proceeding.</p>
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
                      setSupportingFiles((current) => [...current.filter((item) => !previous || fileKey(item) !== fileKey(previous)), file])
                      setRequirements((current) => ({ ...current, [documentLabel]: true }))
                    }}
                    onRemove={() => {
                      const previous = requirementFiles[documentLabel]
                      setRequirementFiles((current) => {
                        const next = { ...current }
                        delete next[documentLabel]
                        return next
                      })
                      if (previous) setSupportingFiles((current) => current.filter((item) => fileKey(item) !== fileKey(previous)))
                      setRequirements((current) => ({ ...current, [documentLabel]: false }))
                    }}
                  />
                ))}
              </div>
              {missingRequirements.length > 0 && <p className="text-xs font-medium text-destructive">Upload {missingRequirements.length} remaining required document(s).</p>}
            </div>
          )}

          {/* Policy Information Summary Grid */}
          {benefitType && (
            <div className="mt-6 rounded-2xl border border-border/70 bg-muted/20 p-5 shadow-2xs space-y-3 relative overflow-hidden">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <Info className="size-4 text-primary" />
                {benefitType.name} — Program Guidelines
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground sm:grid-cols-3 pt-1">
                <div>
                  <span className="block text-[10px] uppercase font-semibold text-muted-foreground/60">Default Amount</span>
                  <strong className="text-sm font-bold text-foreground">{formatCurrency(benefitType.defaultAmount)}</strong>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-semibold text-muted-foreground/60">Maximum Limit</span>
                  <strong className="text-sm font-bold text-foreground">{formatCurrency(benefitType.maximumAmount)}</strong>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-semibold text-muted-foreground/60">Min. Tenure</span>
                  <strong className="text-sm font-bold text-foreground">{benefitType.requiredMembershipMonths} months</strong>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-semibold text-muted-foreground/60">Frequency Limit</span>
                  <strong className="text-sm font-bold text-foreground">{benefitType.frequencyLimit}</strong>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-semibold text-muted-foreground/60">Approval Mandate</span>
                  <strong className="text-sm font-bold text-foreground">{benefitType.approvalRequired ? "Mandatory" : "Optional"}</strong>
                </div>
              </div>
              {requestedAmount != null && requestedAmount > benefitType.maximumAmount && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive animate-pulse">
                  <AlertTriangle className="size-4 shrink-0" /> 
                  Requested amount exceeds program cap limit.
                </div>
              )}
            </div>
          )}
        </FormSection>
      )}

      {/* STEP 3: Eligibility & Requirements Checklist */}
      {step === 3 && (
        <FormSection title="Step 3 · Eligibility Audit & Documents">
          {eligibilityItems.length === 0 ? (
            <AlertBanner tone="warning" title="Incomplete information" description="Select a member and benefit type first." />
          ) : (
            <div className="space-y-6">
              <EligibilityChecklist
                items={eligibilityItems}
                result={eligibilityResult}
                renderItemFooter={(item) => item.label === "Required Personal Data Complete" && member ? (
                  <span className="mt-2 block rounded-md border border-destructive/20 bg-background/70 px-2.5 py-1.5 text-[11px] font-medium text-foreground">
                    {hasPermission("members.update")
                      ? `${user?.roleName ?? "Your role"}: Update the member's ${missingMemberSectionLabel} under Member Records before continuing.`
                      : `${user?.roleName ?? "Your role"}: You do not have permission to update member records. Coordinate with a role that has Update Members permission.`}
                  </span>
                ) : null}
              />

              {eligibilityResult !== "Eligible" && canOverride && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
                  <label className="flex items-center gap-3 text-sm font-bold text-foreground cursor-pointer">
                    <Checkbox checked={overrideEnabled} onCheckedChange={(v) => setOverrideEnabled(!!v)} />
                    Override eligibility requirements for this application
                  </label>
                  {overrideEnabled && (
                    <div className="mt-4 space-y-4 animate-in fade-in duration-200 pt-2 border-t border-amber-500/20">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Override Justification <span className="text-destructive font-bold">*</span>
                        </Label>
                        <Textarea 
                          rows={2} 
                          placeholder="State the administrative justification for overriding eligibility…" 
                          value={overrideReason} 
                          onChange={(e) => setOverrideReason(e.target.value)} 
                          className="text-sm rounded-xl bg-background" 
                        />
                      </div>
                      <label className="flex items-center gap-2.5 text-xs font-semibold text-foreground cursor-pointer">
                        <Checkbox checked={overrideConfirmed} onCheckedChange={(v) => setOverrideConfirmed(!!v)} />
                        I confirm authorization to override system eligibility filters.
                      </label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="h-9 gap-2 text-xs rounded-xl shadow-2xs hover:bg-accent"
                        onClick={() => setShowOverrideDialog(true)} 
                        disabled={!overrideReason.trim() || !overrideConfirmed}
                      >
                        <ShieldAlert className="size-3.5 text-amber-600" /> Apply Override
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {eligibilityResult !== "Eligible" && !canOverride && (
                <AlertBanner tone="danger" title="Eligibility override unavailable" description="You do not hold permissions to override system eligibility filters." />
              )}

              <div className="space-y-3.5 pt-2">
                <p className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <FileCheck className="size-4 text-primary" />
                  Required Document Checklist
                </p>
                <div className="grid grid-cols-1 gap-2.5">
                  {requirementEntries.map((req) => (
                    <div 
                      key={req.label} 
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 transition-all duration-200",
                        requirements[req.label]
                          ? "bg-emerald-500/[0.03] border-emerald-500/30 shadow-2xs"
                          : "bg-card border-border/60 hover:border-border"
                      )}
                    >
                      <label className="flex items-center gap-3 text-sm text-foreground font-semibold">
                        <Checkbox checked={requirements[req.label]} disabled />
                        {req.label}
                      </label>
                      <StatusBadge label={req.completed ? "Submitted" : "Missing"} tone={req.completed ? "success" : "warning"} />
                    </div>
                  ))}
                </div>
                
                <div className="mt-4">
                  <FileUploader
                    label="Attach Supporting Document (optional)"
                    description="Select one or more images or documents."
                    multiple
                    disabled={isUploadingDocuments}
                    onFilesSelect={(files) => {
                      const known = new Set(supportingFiles.map(fileKey))
                      const newFiles = files.filter((file) => !known.has(fileKey(file)))
                      if (newFiles.length === 0) return
                      setSupportingFiles((current) => [...current, ...newFiles])

                      const savedBenefit = existingBenefit ?? (benefitDraft.draftId
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

                {missingRequirements.length > 0 && (
                  <AlertBanner tone="warning" className="mt-4 animate-in fade-in duration-200" title={`${missingRequirements.length} requirement(s) missing`} description="Missing items will be flagged during the review and approval stage." />
                )}
              </div>
            </div>
          )}
        </FormSection>
      )}

      {/* STEP 4: Review Block & Confirmation */}
      {step === 4 && member && benefitType && (
        <FormSection title="Step 4 · Review & Complete Submission">
          <div className="space-y-4">
            <ReviewBlock title="Member Profile" icon={Users}>
              <ReviewRow label="Full Name" value={member.fullName} />
              <ReviewRow label="Member Number" value={member.memberNumber} />
              <ReviewRow label="Office" value={member.officeName} />
            </ReviewBlock>

            <ReviewBlock title="Benefit Details" icon={Building2}>
              <ReviewRow label="Benefit Program" value={benefitType.name} />
              <ReviewRow label="Requested Amount" value={formatCurrency(requestedAmount ?? 0)} />
              {isNuclearMortuary && <ReviewRow label="Claim Subject" value={`${effectiveClaimSubjectNames.join(", ")} (${claimSubjectType || "Not selected"})`} />}
              {!isNuclearMortuary && <ReviewRow label="Recipient Name" value={resolvedRecipientName} />}
              <ReviewRow label="Purpose / Reason" value={reason} />
            </ReviewBlock>

            <ReviewBlock title="Eligibility Audit" icon={ShieldAlert}>
              <ReviewRow label="System Status" value={eligibilityResult} />
              {overrideEnabled && <ReviewRow label="Override Justification" value={overrideReason} />}
            </ReviewBlock>

            <ReviewBlock title="Requirement Checklist" icon={FileCheck}>
              <ReviewRow label="Verified Documents" value={`${requirementEntries.filter((r) => r.completed).length} of ${requirementEntries.length} completed`} />
            </ReviewBlock>

            {isBlocked && (
              <AlertBanner tone="danger" title="Submission Blocked" description="This application fails system eligibility and has not been overridden. Save as draft or apply an override." />
            )}

            <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 text-xs font-semibold text-foreground cursor-pointer transition-colors hover:bg-muted/30">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
              I confirm that all physical application documents have been verified for submission.
            </label>
          </div>
        </FormSection>
      )}

      {/* FLOATING ACTION TOOLBAR */}
      <div className="sticky bottom-5 z-30 flex flex-wrap items-center justify-between gap-3 border border-border/80 bg-background/90 backdrop-blur-xl px-6 py-4 shadow-xl transition-all duration-200">
        <Button variant="outline" onClick={() => promptLeave(() => navigate("/benefits"))} className="h-9 text-xs rounded-xl">
          Cancel
        </Button>

        <div className="flex flex-wrap items-center gap-2.5">
          {step > 1 && (
            <Button variant="outline" onClick={goBack} className="h-9 text-xs rounded-xl gap-1">
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
            <Button variant="success" onClick={goNext} disabled={!canProceedFromStep(step)} className="h-9 text-xs rounded-xl gap-1 shadow-2xs">
              Next Step <ChevronRight className="size-3.5" />
            </Button>
          ) : (
            <Button
              variant="success"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || isBlocked || !agree} 
              aria-busy={isSubmitting} 
              className="h-9 text-xs rounded-xl gap-1.5 shadow-md active:scale-97 transition-all"
            >
              {isSubmitting ? <Loader2 className="animate-spin size-3.5" /> : <FilePlus2 className="size-3.5" />}
              {isSubmitting ? "Submitting…" : "Submit Application"}
            </Button>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={showOverrideDialog}
        onOpenChange={setShowOverrideDialog}
        title="Confirm eligibility override"
        description="You are about to override a failed eligibility check for this application."
        confirmLabel="Confirm Override"
        destructive
        onConfirm={() => {
          setShowOverrideDialog(false)
          toast.success("Eligibility override applied.")
        }}
      />

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

      {/* Completion Success Dialog */}
      <Dialog open={!!successDialog} onOpenChange={(open) => !open && setSuccessDialog(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-6">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">Application Recorded</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Reference <span className="font-bold text-foreground">{successDialog?.applicationNumber}</span> recorded successfully.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col mt-4">
            <Button className="w-full h-9 text-xs rounded-xl shadow-2xs" onClick={() => successDialog && navigate(`/benefits/${successDialog.id}`)}>
              View Application Details
            </Button>
            <Button variant="outline" className="w-full h-9 text-xs rounded-xl" onClick={resetWizard}>
              Create Another Application
            </Button>
            <Button variant="ghost" className="w-full h-9 text-xs text-muted-foreground rounded-xl" onClick={() => navigate("/benefits")}>
              Back to Benefits List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SupportingFilesList({ files, documents, uploadProgress, onRemove }: { files: File[]; documents: BenefitDocument[]; uploadProgress: Record<string, number>; onRemove: (file: File) => void }) {
  const [localEntries, setLocalEntries] = React.useState<Array<{ file: File; url: string }>>([])

  React.useEffect(() => {
    const entries = files.map((file) => ({ file, url: URL.createObjectURL(file) }))
    setLocalEntries(entries)
    return () => entries.forEach((entry) => URL.revokeObjectURL(entry.url))
  }, [files])

  const imageGallery = [
    ...localEntries.filter((entry) => isImageFile(entry.file.name)).map((entry) => ({ url: entry.url, name: entry.file.name })),
    ...documents.filter((document) => isImageFile(document.fileName)).map((document) => ({ url: document.fileUrl, name: document.fileName })),
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
        <SupportingFileRow key={document.id} name={document.fileName} url={document.fileUrl} status="Uploaded" imageGallery={imageGallery} />
      ))}
    </div>
  )
}

function SupportingFileRow({ name, url, status, progress, imageGallery, onRemove }: { name: string; url: string; status: "Ready to upload" | "Uploading" | "Uploaded"; progress?: number; imageGallery: Array<{ url: string; name: string }>; onRemove?: () => void }) {
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const isImage = isImageFile(name)
  const isPdf = isPdfFile(name)
  const imageIndex = isImage ? Math.max(0, imageGallery.findIndex((image) => image.url === url)) : 0

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {isImage ? <img src={url} alt={name} className="size-10 shrink-0 rounded-md border border-border object-cover" /> : <FileText className="size-5 shrink-0 text-primary" />}
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">{name}</p>
          <p className={cn("text-[11px]", status === "Uploaded" ? "text-success" : status === "Uploading" ? "text-primary" : "text-muted-foreground")}>{status}</p>
          {status === "Uploading" && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 w-36 max-w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${progress ?? 0}%` }} />
              </div>
              <span className="text-[10px] tabular-nums text-primary">{progress ?? 0}%</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {(isImage || isPdf) && (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Preview ${name}`} onClick={() => setPreviewOpen(true)}>
            <Eye className="size-3.5" />
          </Button>
        )}
        {onRemove && status !== "Uploading" && (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${name}`} onClick={onRemove}>
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      {isImage && <ImagePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} images={imageGallery} initialIndex={imageIndex} />}
      {isPdf && <PDFPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} url={url} name={name} />}
    </div>
  )
}

function ReviewBlock({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-2xs space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5 text-primary" />
        {title}
      </div>
      <dl className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 pt-1">{children}</dl>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/20 pb-2 last:border-0 sm:border-b-0 sm:pb-0">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="text-sm font-bold text-foreground truncate">{value}</dd>
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
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" className="min-h-10 h-auto w-full justify-between px-3 py-2 font-normal rounded-xl">
            {values.length === 0 ? (
              <span className="text-muted-foreground text-sm">{placeholder}</span>
            ) : (
              <span className="flex min-w-0 flex-wrap gap-1.5">
                {values.map((value) => (
                  <span key={value} className="flex max-w-full items-center gap-1 rounded-full bg-primary/10 border border-primary/20 pl-2.5 pr-1 py-0.5 text-[11px] font-semibold text-primary">
                    <span className="truncate">{value}</span>
                    {/* span, not button — this whole chip list already sits inside the trigger's own <button>, and nested buttons are invalid HTML */}
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
        }
      />
      <PopoverContent className="w-[--anchor-width] p-0 rounded-2xl overflow-hidden" align="start">
        <Command>
          <CommandInput placeholder="Search recipient…" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option.value} value={`${option.label} ${option.description}`} onSelect={() => toggle(option.value)} className="cursor-pointer">
                  <Check className={`size-4 mr-2 ${values.includes(option.value) ? "opacity-100 text-primary" : "opacity-0"}`} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-sm">{option.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{option.description}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
