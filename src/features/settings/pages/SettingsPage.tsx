import * as React from "react"
import { toast } from "sonner"
import {
  Bell,
  Briefcase,
  Building2,
  DatabaseBackup,
  Download,
  FileText,
  Gift,
  Hash,
  Landmark,
  Loader2,
  Palette,
  RotateCcw,
  Save,
  Settings2,
  Shield,
  Trash2,
  Upload,
  Wallet,
  UserCheck,
  Undo2,
  Redo2,
  Printer,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  List,
  ListOrdered,
  Minus,
  Plus,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  createMockBackup,
  deleteBackupEntry,
  downloadSettingsBackup,
  applyAppearanceTheme,
  getAppearance,
  getBackupHistory,
  getSettings,
  loadSystemSettings,
  resetAppearance,
  resetSettingsSection,
  restoreSettingsFromJson,
  saveAppearance,
  saveSettingsSection,
} from "@/services/settings.service"
import { getLoanSettings, updateLoanSettings } from "@/services/loan-settings.service"
import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/lib/api"
import { formatDateTime } from "@/utils/format"
import type { AppearanceSettings, BackupHistoryEntry, NumberingFormatConfig, ReportCategoryTemplate, ReportExportDesign, ReportTemplateCategory, ReportTemplatePreset, ReportTextStyle, SystemSettings } from "@/types"
import { MembershipApprovalSettingsCard } from "@/features/settings/components/MembershipApprovalSettingsCard"
import { EmploymentStatusesSettings } from "@/features/settings/components/EmploymentStatusesSettings"

type SectionKey = "general" | "organization" | "membership" | "employmentStatuses" | "numbering" | "loan" | "contribution" | "benefit" | "notification" | "security" | "reportTemplate" | "backup" | "appearance"

const REPORT_CATEGORIES: { key: ReportTemplateCategory; label: string }[] = [
  { key: "member", label: "Member Reports" },
  { key: "contribution", label: "Contribution Reports" },
  { key: "loan", label: "Loan Reports" },
  { key: "benefit", label: "Benefit Reports" },
  { key: "financial", label: "Financial Reports" },
]

const DEFAULT_CAPTION_STYLE: ReportTextStyle = { fontFamily: "Arial", fontSize: 9, fontWeight: "normal", fontStyle: "italic", textDecoration: "none", textColor: "#475569", textAlignment: "center" }
const DEFAULT_NOTE_STYLE: ReportTextStyle = { ...DEFAULT_CAPTION_STYLE, textAlignment: "left" }
const REPORT_PRESETS: Record<ReportTemplatePreset, ReportExportDesign> = {
  classic: { preset: "classic", primaryColor: "#1E3A8A", headerBackground: "#E8EDF3", bodyFontSize: 9, bodyFontFamily: "Arial", bodyFontWeight: "normal", bodyFontStyle: "normal", bodyTextDecoration: "none", bodyTextColor: "#111111", bodyTextAlignment: "left", stripedRows: false, showBorders: true, titleAlignment: "center", orientation: "auto", paperSize: "a4", captionText: "", noteText: "", captionStyle: { ...DEFAULT_CAPTION_STYLE }, noteStyle: { ...DEFAULT_NOTE_STYLE } },
  modern: { preset: "modern", primaryColor: "#166534", headerBackground: "#DCFCE7", bodyFontSize: 9, bodyFontFamily: "Arial", bodyFontWeight: "normal", bodyFontStyle: "normal", bodyTextDecoration: "none", bodyTextColor: "#111111", bodyTextAlignment: "left", stripedRows: true, showBorders: true, titleAlignment: "left", orientation: "auto", paperSize: "a4", captionText: "", noteText: "", captionStyle: { ...DEFAULT_CAPTION_STYLE }, noteStyle: { ...DEFAULT_NOTE_STYLE } },
  compact: { preset: "compact", primaryColor: "#0F172A", headerBackground: "#E2E8F0", bodyFontSize: 8, bodyFontFamily: "Arial", bodyFontWeight: "normal", bodyFontStyle: "normal", bodyTextDecoration: "none", bodyTextColor: "#111111", bodyTextAlignment: "left", stripedRows: true, showBorders: true, titleAlignment: "left", orientation: "landscape", paperSize: "letter", captionText: "", noteText: "", captionStyle: { ...DEFAULT_CAPTION_STYLE }, noteStyle: { ...DEFAULT_NOTE_STYLE } },
}

function reportPaperAspect(template: ReportExportDesign): number {
  const portraitRatio = template.paperSize === "a4" ? 210 / 297 : template.paperSize === "legal" ? 8.5 / 14 : 8.5 / 11
  return template.orientation === "landscape" ? 1 / portraitRatio : portraitRatio
}

const SECTIONS: { key: SectionKey; label: string; icon: typeof Settings2 }[] = [
  { key: "general", label: "General Settings", icon: Settings2 },
  { key: "organization", label: "Organization Profile", icon: Building2 },
  { key: "membership", label: "Membership Settings", icon: UserCheck },
  { key: "employmentStatuses", label: "Employment Statuses", icon: Briefcase },
  { key: "numbering", label: "Numbering Formats", icon: Hash },
  { key: "loan", label: "Loan Settings", icon: Landmark },
  { key: "contribution", label: "Contribution Settings", icon: Wallet },
  { key: "benefit", label: "Benefit Settings", icon: Gift },
  { key: "notification", label: "Notification Settings", icon: Bell },
  { key: "security", label: "Security Settings", icon: Shield },
  { key: "reportTemplate", label: "Report Template", icon: FileText },
  { key: "backup", label: "Backup Settings", icon: DatabaseBackup },
  { key: "appearance", label: "Appearance Settings", icon: Palette },
]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">{label}</Label>
      {children}
    </div>
  )
}

function ToggleField({ label, checked, onCheckedChange, description, disabled = false }: { label: string; checked: boolean; onCheckedChange: (v: boolean) => void; description?: string; disabled?: boolean }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card p-4 hover:border-border transition-all duration-200 cursor-pointer shadow-sm/5">
      <span className="space-y-0.5">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {description && <span className="block text-xs text-muted-foreground leading-normal">{description}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="mt-0.5" />
    </label>
  )
}

function SectionShell({
  title,
  description,
  onSave,
  onReset,
  isSaving,
  children,
}: {
  title: string
  description: string
  onSave: () => void
  onReset: () => void
  isSaving: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/95 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="mb-5 border-b border-border/30 pb-3">
          <h2 className="font-heading text-base font-bold tracking-tight text-foreground">{title}</h2>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">{description}</p>
        </div>
        {children}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onReset} className="h-9 text-xs">
          <RotateCcw className="size-3.5" /> Reset to Default
        </Button>
        <Button onClick={onSave} disabled={isSaving} className="h-9 text-xs gap-1.5 shadow-sm active:scale-97 transition-all">
          {isSaving ? <Loader2 className="animate-spin size-3.5" /> : <Save className="size-3.5" />} Save Changes
        </Button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [active, setActive] = React.useState<SectionKey>("general")
  const [reportCategory, setReportCategory] = React.useState<ReportTemplateCategory>("member")
  const [reportFormat, setReportFormat] = React.useState<"pdf" | "excel">("pdf")
  const [editorZoom, setEditorZoom] = React.useState(100)
  const [editorFontSize, setEditorFontSize] = React.useState(11)
  const [editorBlockStyle, setEditorBlockStyle] = React.useState("p")
  const [editorFontFamily, setEditorFontFamily] = React.useState("Arial")
  const [editorRegion, setEditorRegion] = React.useState<"body" | "caption" | "note">("body")
  const [isPreviewingReport, setIsPreviewingReport] = React.useState(false)
  const reportEditorRef = React.useRef<HTMLDivElement>(null)
  const editorSelectionRef = React.useRef<Range | null>(null)
  const [settings, setSettings] = React.useState<SystemSettings>(() => getSettings())
  const [appearance, setAppearance] = React.useState<AppearanceSettings>(() => getAppearance())
  const [backupHistory, setBackupHistory] = React.useState<BackupHistoryEntry[]>(() => getBackupHistory())
  const [isSaving, setIsSaving] = React.useState(false)
  const [resetConfirm, setResetConfirm] = React.useState<SectionKey | null>(null)
  const [isCreatingBackup, setIsCreatingBackup] = React.useState(false)
  const [deleteBackupId, setDeleteBackupId] = React.useState<string | null>(null)
  const restoreInputRef = React.useRef<HTMLInputElement>(null)
  const currentReportDesign = reportFormat === "pdf"
    ? settings.reportTemplate.categoryTemplates[reportCategory]
    : settings.reportTemplate.categoryTemplates[reportCategory].excelTemplate
  const activeTextStyle: ReportTextStyle = editorRegion === "caption"
    ? currentReportDesign.captionStyle
    : editorRegion === "note"
      ? currentReportDesign.noteStyle
      : {
          fontFamily: currentReportDesign.bodyFontFamily,
          fontSize: currentReportDesign.bodyFontSize,
          fontWeight: currentReportDesign.bodyFontWeight,
          fontStyle: currentReportDesign.bodyFontStyle,
          textDecoration: currentReportDesign.bodyTextDecoration,
          textColor: currentReportDesign.bodyTextColor,
          textAlignment: currentReportDesign.bodyTextAlignment,
        }

  // The Loan section's minimumMembershipMonths/reloanPolicy are the one slice
  // of Settings backed by the real API (loan-settings.service.ts) instead of
  // localStorage — overlay them once the API responds.
  React.useEffect(() => {
    loadSystemSettings()
      .then((loaded) => {
        setSettings(loaded.settings)
        setAppearance(loaded.appearance)
        applyAppearanceTheme(loaded.appearance)
      })
      .catch(() => toast.error("Unable to load System Settings from the server."))

    getLoanSettings()
      .then((loanSettings) => {
        setSettings((prev) => ({ ...prev, loan: { ...prev.loan, ...loanSettings } }))
      })
      .catch(() => toast.error("Unable to load Loan Settings from the server."))
  }, [])

  React.useEffect(() => {
    function rememberEditorSelection() {
      const selection = window.getSelection()
      if (!selection?.rangeCount || !reportEditorRef.current) return
      const range = selection.getRangeAt(0)
      if (reportEditorRef.current.contains(range.commonAncestorContainer)) {
        editorSelectionRef.current = range.cloneRange()
      }
    }
    document.addEventListener("selectionchange", rememberEditorSelection)
    return () => document.removeEventListener("selectionchange", rememberEditorSelection)
  }, [])

  React.useEffect(() => {
    setEditorFontSize(activeTextStyle.fontSize)
    setEditorFontFamily(activeTextStyle.fontFamily)
  }, [activeTextStyle.fontFamily, activeTextStyle.fontSize, reportCategory, reportFormat, editorRegion])

  function patch<K extends keyof SystemSettings>(key: K, value: Partial<SystemSettings[K]>) {
    setSettings((prev) => ({ ...prev, [key]: { ...prev[key], ...value } }))
  }

  function patchReloanPolicy(value: Partial<SystemSettings["loan"]["reloanPolicy"]>) {
    setSettings((prev) => ({ ...prev, loan: { ...prev.loan, reloanPolicy: { ...prev.loan.reloanPolicy, ...value } } }))
  }

  function patchReportCategory(value: Partial<ReportExportDesign>) {
    setSettings((prev) => ({
      ...prev,
      reportTemplate: {
        ...prev.reportTemplate,
        categoryTemplates: {
          ...prev.reportTemplate.categoryTemplates,
          [reportCategory]: reportFormat === "pdf"
            ? { ...prev.reportTemplate.categoryTemplates[reportCategory], ...value }
            : {
                ...prev.reportTemplate.categoryTemplates[reportCategory],
                excelTemplate: { ...prev.reportTemplate.categoryTemplates[reportCategory].excelTemplate, ...value },
              },
        },
      },
    }))
  }

  function patchActiveTextStyle(value: Partial<ReportTextStyle>) {
    if (editorRegion === "caption") {
      patchReportCategory({ captionStyle: { ...currentReportDesign.captionStyle, ...value } })
    } else if (editorRegion === "note") {
      patchReportCategory({ noteStyle: { ...currentReportDesign.noteStyle, ...value } })
    } else {
      patchReportCategory({
        ...(value.fontFamily && { bodyFontFamily: value.fontFamily }),
        ...(value.fontSize !== undefined && { bodyFontSize: value.fontSize }),
        ...(value.fontWeight && { bodyFontWeight: value.fontWeight }),
        ...(value.fontStyle && { bodyFontStyle: value.fontStyle }),
        ...(value.textDecoration && { bodyTextDecoration: value.textDecoration }),
        ...(value.textColor && { bodyTextColor: value.textColor }),
        ...(value.textAlignment && { bodyTextAlignment: value.textAlignment }),
      })
    }
  }

  function applyReportPreset(preset: ReportTemplatePreset) {
    const selectedPreset = REPORT_PRESETS[preset]
    patchReportCategory({
      preset: selectedPreset.preset,
      primaryColor: selectedPreset.primaryColor,
      headerBackground: selectedPreset.headerBackground,
      bodyFontSize: selectedPreset.bodyFontSize,
      bodyFontFamily: selectedPreset.bodyFontFamily,
      bodyFontWeight: selectedPreset.bodyFontWeight,
      bodyFontStyle: selectedPreset.bodyFontStyle,
      bodyTextDecoration: selectedPreset.bodyTextDecoration,
      bodyTextColor: selectedPreset.bodyTextColor,
      bodyTextAlignment: selectedPreset.bodyTextAlignment,
      stripedRows: selectedPreset.stripedRows,
      showBorders: selectedPreset.showBorders,
      titleAlignment: selectedPreset.titleAlignment,
      orientation: selectedPreset.orientation,
      paperSize: selectedPreset.paperSize,
    })
  }

  function runEditorCommand(command: string, value?: string) {
    const selection = window.getSelection()
    if (selection && editorSelectionRef.current) {
      selection.removeAllRanges()
      selection.addRange(editorSelectionRef.current)
    } else {
      reportEditorRef.current?.focus({ preventScroll: true })
    }
    document.execCommand(command, false, value)
  }

  function changeEditorFontSize(nextSize: number) {
    const boundedSize = Math.min(24, Math.max(7, nextSize))
    setEditorFontSize(boundedSize)
    patchActiveTextStyle({ fontSize: boundedSize })
    const commandSize = boundedSize <= 9 ? "2" : boundedSize <= 12 ? "3" : boundedSize <= 16 ? "4" : boundedSize <= 20 ? "5" : "6"
    runEditorCommand("fontSize", commandSize)
  }

  async function previewReportTemplate() {
    const previewWindow = reportFormat === "pdf" ? window.open("", "_blank") : null
    if (previewWindow) {
      previewWindow.document.write("<p style=\"font-family:Arial;padding:24px\">Generating report preview...</p>")
    }
    setIsPreviewingReport(true)
    try {
      await saveSettingsSection("reportTemplate", settings.reportTemplate)
      const label = REPORT_CATEGORIES.find((category) => category.key === reportCategory)?.label ?? "Report"
      const response = await api.post(`/report-exports/${reportFormat}`, {
        title: `Sample ${label}`,
        headers: ["Reference", "Member Name", "Status", "Amount"],
        rows: [
          ["GCGEA-001", "Juan Dela Cruz", "Active", "₱12,500.00"],
          ["GCGEA-002", "Maria Santos", "Approved", "₱8,000.00"],
          ["GCGEA-003", "Pedro Reyes", "Pending", "₱5,500.00"],
        ],
        reportCategory,
      }, { responseType: "blob" })
      const url = URL.createObjectURL(response.data)
      if (reportFormat === "pdf") {
        if (previewWindow) previewWindow.location.href = url
        else window.open(url, "_blank")
      } else {
        const link = document.createElement("a")
        link.href = url
        link.download = `sample-${reportCategory}-report.xlsx`
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        toast.success("Excel template preview downloaded.")
      }
    } catch {
      previewWindow?.close()
      toast.error(`Unable to generate the ${reportFormat.toUpperCase()} template preview.`)
    } finally {
      setIsPreviewingReport(false)
    }
  }

  function uploadReportLogo(side: "leftLogo" | "rightLogo", file?: File) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must not exceed 2 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => patch("reportTemplate", { [side]: String(reader.result) })
    reader.readAsDataURL(file)
  }

  function uploadSidebarLogo(file?: File) {
    if (!file) return
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      toast.error("Please select a PNG, JPG, WebP, or SVG logo.")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Sidebar logo must not exceed 2 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => setAppearance((prev) => ({ ...prev, sidebarLogoUrl: String(reader.result) }))
    reader.readAsDataURL(file)
  }

  function applyAppearance(value: AppearanceSettings) {
    applyAppearanceTheme(value)
  }

  async function handleSave(key: SectionKey) {
    if (key === "membership" || key === "employmentStatuses") return
    setIsSaving(true)
    try {
      if (key === "appearance") {
        await saveAppearance(appearance)
        applyAppearance(appearance)
      } else if (key === "loan") {
        await Promise.all([
          saveSettingsSection(key, settings.loan),
          updateLoanSettings({
            minimumMembershipMonths: settings.loan.minimumMembershipMonths,
            requirePaidContributions: settings.loan.requirePaidContributions,
            minimumPaidContributionMonths: settings.loan.minimumPaidContributionMonths,
            requiredMonthlyDuesAmount: settings.loan.requiredMonthlyDuesAmount,
            requireConsecutiveContributionMonths: settings.loan.requireConsecutiveContributionMonths,
            applyContributionRuleToReloan: settings.loan.applyContributionRuleToReloan,
            defaultPenaltyRate: settings.loan.defaultPenaltyRate,
            reloanPolicy: settings.loan.reloanPolicy,
          }),
        ])
      } else {
        await saveSettingsSection(key, settings[key])
      }
      toast.success(`${SECTIONS.find((s) => s.key === key)?.label} saved.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleReset(key: SectionKey) {
    if (key === "membership" || key === "employmentStatuses") return
    setIsSaving(true)
    try {
      if (key === "appearance") {
        const reset = await resetAppearance()
        setAppearance(reset)
        applyAppearance(reset)
      } else {
        const reset = await resetSettingsSection(key)
        setSettings(reset)
        if (key === "loan") {
          await updateLoanSettings({
            minimumMembershipMonths: reset.loan.minimumMembershipMonths,
            requirePaidContributions: reset.loan.requirePaidContributions,
            minimumPaidContributionMonths: reset.loan.minimumPaidContributionMonths,
            requiredMonthlyDuesAmount: reset.loan.requiredMonthlyDuesAmount,
            requireConsecutiveContributionMonths: reset.loan.requireConsecutiveContributionMonths,
            applyContributionRuleToReloan: reset.loan.applyContributionRuleToReloan,
            defaultPenaltyRate: reset.loan.defaultPenaltyRate,
            reloanPolicy: reset.loan.reloanPolicy,
          })
        }
      }
      setResetConfirm(null)
      toast.success(`${SECTIONS.find((s) => s.key === key)?.label} reset to default and saved.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset settings.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCreateBackup() {
    if (!user) return
    setIsCreatingBackup(true)
    try {
      await createMockBackup(user.fullName, "Manual")
      setBackupHistory(getBackupHistory())
      toast.success("Settings snapshot recorded.")
    } finally {
      setIsCreatingBackup(false)
    }
  }

  async function handleDeleteBackup() {
    if (!deleteBackupId) return
    await deleteBackupEntry(deleteBackupId)
    setBackupHistory(getBackupHistory())
    setDeleteBackupId(null)
    toast.success("Backup entry deleted.")
  }

  function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then(async (text) => {
      try {
        await restoreSettingsFromJson(text)
        setSettings(getSettings())
        setAppearance(getAppearance())
        toast.success("Settings restored from file.")
      } catch {
        toast.error("Invalid backup file.")
      }
    })
    e.target.value = ""
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="System Settings" description="Configure GCGEA MLBMS behavior, numbering, policies, and appearance. Changes are saved centrally on the server." />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Navigation Sidebar */}
        <nav className="lg:w-64 lg:shrink-0">
          <CommandSelect
            className="w-full lg:hidden h-10 text-sm"
            value={active}
            onValueChange={(v) => setActive(v as SectionKey)}
            options={SECTIONS.map((s) => ({ value: s.key, label: s.label }))}
            hideSearch
          />
          <div className="hidden space-y-1 rounded-2xl border border-border/60 bg-card p-3 shadow-sm lg:block">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setActive(s.key)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${
                  active === s.key 
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <s.icon className="size-4 shrink-0" />
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Panel Form Sections */}
        <div className="min-w-0 flex-1">
          {active === "general" && (
            <SectionShell title="General Settings" description="Core system identity and localization defaults." onSave={() => handleSave("general")} onReset={() => setResetConfirm("general")} isSaving={isSaving}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="System Name"><Input value={settings.general.systemName} onChange={(e) => patch("general", { systemName: e.target.value })} className="h-10 text-sm" /></Field>
                <Field label="System Short Name"><Input value={settings.general.systemShortName} onChange={(e) => patch("general", { systemShortName: e.target.value })} className="h-10 text-sm" /></Field>
                <Field label="Default Language"><Input value={settings.general.defaultLanguage} onChange={(e) => patch("general", { defaultLanguage: e.target.value })} className="h-10 text-sm" /></Field>
                <Field label="Time Zone"><Input value={settings.general.timeZone} onChange={(e) => patch("general", { timeZone: e.target.value })} className="h-10 text-sm" /></Field>
                <Field label="Date Format"><Input value={settings.general.dateFormat} onChange={(e) => patch("general", { dateFormat: e.target.value })} className="h-10 text-sm" /></Field>
                <Field label="Currency"><Input value={settings.general.currency} onChange={(e) => patch("general", { currency: e.target.value })} className="h-10 text-sm" /></Field>
                <Field label="Fiscal Year Start"><Input value={settings.general.fiscalYearStart} onChange={(e) => patch("general", { fiscalYearStart: e.target.value })} className="h-10 text-sm" /></Field>
                <Field label="Records Per Page">
                  <CommandSelect
                    className="w-full h-10 text-sm bg-background border-border/80 hover:bg-accent/40 transition-all"
                    value={String(settings.general.recordsPerPage)}
                    onValueChange={(v) => patch("general", { recordsPerPage: Number(v) })}
                    options={[10, 25, 50, 100].map((n) => ({ value: String(n), label: String(n) }))}
                    hideSearch
                  />
                </Field>
              </div>
              <div className="mt-4">
                <ToggleField label="Maintenance Mode" description="Temporarily restrict access while performing system maintenance." checked={settings.general.maintenanceMode} onCheckedChange={(v) => patch("general", { maintenanceMode: v })} />
              </div>
            </SectionShell>
          )}

          {active === "organization" && (
            <SectionShell title="Organization Profile" description="Details used on printed forms, receipts, and letterheads." onSave={() => handleSave("organization")} onReset={() => setResetConfirm("organization")} isSaving={isSaving}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Organization Name"><Input value={settings.organization.organizationName} onChange={(e) => patch("organization", { organizationName: e.target.value })} className="h-10 text-sm" /></Field>
                <Field label="Acronym"><Input value={settings.organization.acronym} onChange={(e) => patch("organization", { acronym: e.target.value })} className="h-10 text-sm" /></Field>
                <Field label="Address"><Input value={settings.organization.address} onChange={(e) => patch("organization", { address: e.target.value })} className="h-10 text-sm" /></Field>
                <Field label="Contact Number"><Input value={settings.organization.contactNumber} onChange={(e) => patch("organization", { contactNumber: e.target.value })} className="h-10 text-sm" /></Field>
                <Field label="Email Address"><Input value={settings.organization.email} onChange={(e) => patch("organization", { email: e.target.value })} className="h-10 text-sm" /></Field>
                <Field label="Website"><Input value={settings.organization.website} onChange={(e) => patch("organization", { website: e.target.value })} className="h-10 text-sm" /></Field>
                <Field label="Authorized Signatory Name"><Input value={settings.organization.authorizedSignatoryName} onChange={(e) => patch("organization", { authorizedSignatoryName: e.target.value })} className="h-10 text-sm" /></Field>
                <Field label="Authorized Signatory Position"><Input value={settings.organization.authorizedSignatoryPosition} onChange={(e) => patch("organization", { authorizedSignatoryPosition: e.target.value })} className="h-10 text-sm" /></Field>
                <Field label="Treasurer Name"><Input value={settings.organization.treasurerName} onChange={(e) => patch("organization", { treasurerName: e.target.value })} className="h-10 text-sm" /></Field>
                <Field label="President Name"><Input value={settings.organization.presidentName} onChange={(e) => patch("organization", { presidentName: e.target.value })} className="h-10 text-sm" /></Field>
              </div>
              <div className="mt-5 rounded-xl border border-dashed border-border/80 p-5 text-center bg-muted/10 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground/80">Organization Logo &amp; City Seal uploads</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled title="File storage setup is required"><Upload className="size-3.5" /> Upload Logo</Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled title="File storage setup is required"><Upload className="size-3.5" /> Upload City Seal</Button>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-border bg-muted/20 p-5 text-center shadow-inner space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Document Header Preview</p>
                <p className="font-heading text-sm font-bold text-foreground">{settings.organization.organizationName}</p>
                <p className="text-xs text-muted-foreground">{settings.organization.address}</p>
                <p className="text-xs text-muted-foreground/80 font-medium">{settings.organization.contactNumber} · {settings.organization.email}</p>
              </div>
            </SectionShell>
          )}

          {active === "employmentStatuses" && <EmploymentStatusesSettings />}

          {active === "membership" && <MembershipApprovalSettingsCard />}

          {active === "numbering" && (
            <SectionShell title="Numbering Formats" description="Configure reference number formats." onSave={() => handleSave("numbering")} onReset={() => setResetConfirm("numbering")} isSaving={isSaving}>
              <div className="space-y-4">
                {(Object.keys(settings.numbering) as (keyof SystemSettings["numbering"])[]).map((key) => (
                  <NumberingFormatRow
                    key={key}
                    label={{ member: "Member Number", loan: "Loan Application Number", loanPayment: "Loan Payment Number", contribution: "Contribution Reference Number", benefit: "Benefit Application Number", benefitRelease: "Benefit Release Number" }[key]}
                    config={settings.numbering[key]}
                    onChange={(next) => patch("numbering", { [key]: next } as Partial<SystemSettings["numbering"]>)}
                  />
                ))}
              </div>
            </SectionShell>
          )}

          {active === "loan" && (
            <SectionShell title="Loan Settings" description="Default policy values applied to new loan types, plus the backend-enforced eligibility floor." onSave={() => handleSave("loan")} onReset={() => setResetConfirm("loan")} isSaving={isSaving}>
              <AlertBanner
                tone="info"
                title="Backend-enforced"
                description="Minimum Membership Duration and the Reloan Policy below are read and enforced by the server (GET/PUT /loan-settings) — not hardcoded in any page."
                className="mb-4"
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Minimum Membership Duration for Loan (months)">
                  <Input
                    type="number"
                    min={0}
                    value={settings.loan.minimumMembershipMonths}
                    onChange={(e) => patch("loan", { minimumMembershipMonths: Number(e.target.value) })}
                    className="h-10 text-sm"
                  />
                </Field>
                <Field label="Default Interest Method">
                  <CommandSelect
                    className="w-full h-10 text-sm bg-background border-border/80 hover:bg-accent/40 transition-all"
                    value={settings.loan.defaultInterestMethod}
                    onValueChange={(v) => patch("loan", { defaultInterestMethod: v })}
                    options={["Flat Interest", "Diminishing Balance", "Zero Interest", "Custom"].map((m) => ({ value: m, label: m }))}
                    hideSearch
                  />
                </Field>
                <Field label="Default Interest Rate (%/mo)"><Input type="number" step="0.01" value={settings.loan.defaultInterestRate} onChange={(e) => patch("loan", { defaultInterestRate: Number(e.target.value) })} className="h-10 text-sm" /></Field>
                <Field label="Default Processing Fee (₱)"><Input type="number" value={settings.loan.defaultProcessingFee} onChange={(e) => patch("loan", { defaultProcessingFee: Number(e.target.value) })} className="h-10 text-sm" /></Field>
                <Field label="Default Penalty Rate (%)"><Input type="number" step="0.01" value={settings.loan.defaultPenaltyRate} onChange={(e) => patch("loan", { defaultPenaltyRate: Number(e.target.value) })} className="h-10 text-sm" /></Field>
                <Field label="Grace Period (Days)"><Input type="number" value={settings.loan.gracePeriodDays} onChange={(e) => patch("loan", { gracePeriodDays: Number(e.target.value) })} className="h-10 text-sm" /></Field>
                <Field label="Maximum Active Loans"><Input type="number" value={settings.loan.maximumActiveLoans} onChange={(e) => patch("loan", { maximumActiveLoans: Number(e.target.value) })} className="h-10 text-sm" /></Field>
                <Field label="Default Payment Method">
                  <CommandSelect
                    className="w-full h-10 text-sm bg-background border-border/80 hover:bg-accent/40 transition-all"
                    value={settings.loan.defaultPaymentMethod}
                    onValueChange={(v) => patch("loan", { defaultPaymentMethod: v })}
                    options={["Payroll Deduction", "Cash", "Bank Transfer", "Check"].map((m) => ({ value: m, label: m }))}
                    hideSearch
                  />
                </Field>
                <Field label="Rounding Rule"><Input value={settings.loan.roundingRule} onChange={(e) => patch("loan", { roundingRule: e.target.value })} className="h-10 text-sm" /></Field>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ToggleField label="Allow Eligibility Override" checked={settings.loan.allowEligibilityOverride} onCheckedChange={(v) => patch("loan", { allowEligibilityOverride: v })} />
                <ToggleField label="Require Approval" checked={settings.loan.requireApproval} onCheckedChange={(v) => patch("loan", { requireApproval: v })} />
                <ToggleField label="Require Release Confirmation" checked={settings.loan.requireReleaseConfirmation} onCheckedChange={(v) => patch("loan", { requireReleaseConfirmation: v })} />
                <ToggleField label="Allow Partial Payment" checked={settings.loan.allowPartialPayment} onCheckedChange={(v) => patch("loan", { allowPartialPayment: v })} />
                <ToggleField label="Allow Advance Payment" checked={settings.loan.allowAdvancePayment} onCheckedChange={(v) => patch("loan", { allowAdvancePayment: v })} />
                <ToggleField label="Allow Loan Restructuring" checked={settings.loan.allowLoanRestructuring} onCheckedChange={(v) => patch("loan", { allowLoanRestructuring: v })} />
              </div>

              <div className="mt-6 border-t border-border/30 pt-5">
                <h3 className="mb-1 font-heading text-sm font-bold tracking-tight text-foreground">Monthly Dues Loan Eligibility</h3>
                <p className="mb-4 text-xs font-medium text-muted-foreground">
                  Only distinct Posted Monthly Dues periods that meet the required full monthly amount are counted. Cash Pabaon and other contribution types are excluded.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Minimum Fully Paid Months">
                    <Input
                      type="number"
                      min={0}
                      value={settings.loan.minimumPaidContributionMonths}
                      onChange={(e) => patch("loan", { minimumPaidContributionMonths: Number(e.target.value) })}
                      className="h-10 text-sm"
                    />
                  </Field>
                  <Field label="Required Monthly Dues Amount (₱)">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={settings.loan.requiredMonthlyDuesAmount}
                      onChange={(e) => patch("loan", { requiredMonthlyDuesAmount: Number(e.target.value) })}
                      className="h-10 text-sm"
                    />
                  </Field>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ToggleField label="Require Paid Monthly Dues" checked={settings.loan.requirePaidContributions} onCheckedChange={(v) => patch("loan", { requirePaidContributions: v })} />
                  <ToggleField label="Require Consecutive Paid Months" checked={settings.loan.requireConsecutiveContributionMonths} onCheckedChange={(v) => patch("loan", { requireConsecutiveContributionMonths: v })} />
                  <ToggleField label="Apply Monthly Dues Rule to Reloan" checked={settings.loan.applyContributionRuleToReloan} onCheckedChange={(v) => patch("loan", { applyContributionRuleToReloan: v })} />
                </div>
              </div>

              <div className="mt-6 border-t border-border/30 pt-5">
                <h3 className="mb-1 font-heading text-sm font-bold tracking-tight text-foreground">Reloan Policy</h3>
                <p className="mb-4 text-xs font-medium text-muted-foreground">
                  Governs when a member may reloan against an existing loan. "While Active" support is schema-ready but this phase always requires the previous obligation to be fully settled before release.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Minimum Fully Paid Loan Months">
                    <Input
                      type="number"
                      min={0}
                      value={settings.loan.reloanPolicy.reloanMinPaidInstallments ?? ""}
                      onChange={(e) => patchReloanPolicy({ reloanMinPaidInstallments: e.target.value ? Number(e.target.value) : null })}
                      className="h-10 text-sm"
                      placeholder="Default: 6"
                    />
                  </Field>
                  <Field label="Min. Paid Percentage (optional)">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={settings.loan.reloanPolicy.reloanMinPaidPercentage ?? ""}
                      onChange={(e) => patchReloanPolicy({ reloanMinPaidPercentage: e.target.value ? Number(e.target.value) : null })}
                      className="h-10 text-sm"
                      placeholder="Not enforced"
                    />
                  </Field>
                  <Field label="Maximum Concurrent Active Loans">
                    <Input
                      type="number"
                      min={1}
                      value={settings.loan.reloanPolicy.reloanMaxConcurrentActiveLoans}
                      onChange={(e) => patchReloanPolicy({ reloanMaxConcurrentActiveLoans: Number(e.target.value) })}
                      className="h-10 text-sm"
                    />
                  </Field>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ToggleField label="Enable Reloan" checked={settings.loan.reloanPolicy.reloanEnabled} onCheckedChange={(v) => patchReloanPolicy({ reloanEnabled: v })} />
                  <ToggleField label="Allow Reloan Only After Fully Paid" checked={settings.loan.reloanPolicy.reloanAllowAfterFullyPaid} onCheckedChange={(v) => patchReloanPolicy({ reloanAllowAfterFullyPaid: v })} />
                  <ToggleField
                    label="Allow Reloan While Loan Is Active"
                    description="Allows reloan after the configured number of fully paid loan months."
                    checked={settings.loan.reloanPolicy.reloanAllowWhileActive}
                    onCheckedChange={(v) => patchReloanPolicy({ reloanAllowWhileActive: v })}
                  />
                  <ToggleField label="Require No Overdue Balance" checked={settings.loan.reloanPolicy.reloanRequireNoOverdue} onCheckedChange={(v) => patchReloanPolicy({ reloanRequireNoOverdue: v })} />
                  <ToggleField label="Require No Penalty Balance" checked={settings.loan.reloanPolicy.reloanRequireNoPenalty} onCheckedChange={(v) => patchReloanPolicy({ reloanRequireNoPenalty: v })} />
                  <ToggleField
                    label="Deduct Previous Outstanding Balance from New Loan Proceeds"
                    description="Unavailable until deduction settlement math is enabled."
                    checked={settings.loan.reloanPolicy.reloanDeductPreviousBalance}
                    onCheckedChange={(v) => patchReloanPolicy({ reloanDeductPreviousBalance: v })}
                    disabled
                  />
                  <ToggleField label="Require New Payslip" checked={settings.loan.reloanPolicy.reloanRequireNewPayslip} onCheckedChange={(v) => patchReloanPolicy({ reloanRequireNewPayslip: v })} />
                  <ToggleField label="Require New Authorization" checked={settings.loan.reloanPolicy.reloanRequireNewAuthorization} onCheckedChange={(v) => patchReloanPolicy({ reloanRequireNewAuthorization: v })} />
                  <ToggleField label="Require New Promissory Note" checked={settings.loan.reloanPolicy.reloanRequireNewPromissoryNote} onCheckedChange={(v) => patchReloanPolicy({ reloanRequireNewPromissoryNote: v })} />
                  <ToggleField label="Require Final Approval" checked={settings.loan.reloanPolicy.reloanRequireFinalApproval} onCheckedChange={(v) => patchReloanPolicy({ reloanRequireFinalApproval: v })} />
                  <ToggleField
                    label="Require Board Resolution for Amount Above Limit"
                    checked={settings.loan.reloanPolicy.reloanRequireBoardResolutionAboveLimit}
                    onCheckedChange={(v) => patchReloanPolicy({ reloanRequireBoardResolutionAboveLimit: v })}
                  />
                </div>
              </div>
            </SectionShell>
          )}

          {active === "contribution" && (
            <SectionShell title="Contribution Settings" description="Defaults for contribution and import modules." onSave={() => handleSave("contribution")} onReset={() => setResetConfirm("contribution")} isSaving={isSaving}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Default Monthly Contribution (₱)"><Input type="number" value={settings.contribution.defaultMonthlyContribution} onChange={(e) => patch("contribution", { defaultMonthlyContribution: Number(e.target.value) })} className="h-10 text-sm" /></Field>
                <Field label="Default Cash Pabaon Contribution (₱)"><Input type="number" value={settings.contribution.defaultCashPabaonContribution} onChange={(e) => patch("contribution", { defaultCashPabaonContribution: Number(e.target.value) })} className="h-10 text-sm" /></Field>
                <Field label="Contribution Due Day"><Input type="number" min={1} max={31} value={settings.contribution.contributionDueDay} onChange={(e) => patch("contribution", { contributionDueDay: Number(e.target.value) })} className="h-10 text-sm" /></Field>
                <Field label="Duplicate Handling">
                  <CommandSelect
                    className="w-full h-10 text-sm bg-background border-border/80 hover:bg-accent/40 transition-all"
                    value={settings.contribution.duplicateHandling}
                    onValueChange={(v) => patch("contribution", { duplicateHandling: v })}
                    options={["Skip duplicates", "Flag for review", "Replace existing"].map((m) => ({ value: m, label: m }))}
                    hideSearch
                  />
                </Field>
                <Field label="Default Payment Method">
                  <CommandSelect
                    className="w-full h-10 text-sm bg-background border-border/80 hover:bg-accent/40 transition-all"
                    value={settings.contribution.defaultPaymentMethod}
                    onValueChange={(v) => patch("contribution", { defaultPaymentMethod: v })}
                    options={["Payroll Deduction", "Cash", "Bank Transfer", "Check"].map((m) => ({ value: m, label: m }))}
                    hideSearch
                  />
                </Field>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ToggleField label="Allow Partial Contribution" checked={settings.contribution.allowPartialContribution} onCheckedChange={(v) => patch("contribution", { allowPartialContribution: v })} />
                <ToggleField label="Allow Advance Contribution" checked={settings.contribution.allowAdvanceContribution} onCheckedChange={(v) => patch("contribution", { allowAdvanceContribution: v })} />
                <ToggleField label="Payroll Import Enabled" checked={settings.contribution.payrollImportEnabled} onCheckedChange={(v) => patch("contribution", { payrollImportEnabled: v })} />
                <ToggleField label="Require Payroll Reference" checked={settings.contribution.requirePayrollReference} onCheckedChange={(v) => patch("contribution", { requirePayrollReference: v })} />
                <ToggleField label="Contribution Reminder Enabled" checked={settings.contribution.contributionReminderEnabled} onCheckedChange={(v) => patch("contribution", { contributionReminderEnabled: v })} />
              </div>
            </SectionShell>
          )}

          {active === "benefit" && (
            <SectionShell title="Benefit Settings" description="Policy standards applied to benefits." onSave={() => handleSave("benefit")} onReset={() => setResetConfirm("benefit")} isSaving={isSaving}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Default Approval Limit (₱)"><Input type="number" value={settings.benefit.defaultApprovalLimit} onChange={(e) => patch("benefit", { defaultApprovalLimit: Number(e.target.value) })} className="h-10 text-sm" /></Field>
                <Field label="Default Frequency Limit"><Input value={settings.benefit.defaultFrequencyLimit} onChange={(e) => patch("benefit", { defaultFrequencyLimit: e.target.value })} className="h-10 text-sm" /></Field>
                <Field label="Benefit Year Reset Month"><Input value={settings.benefit.benefitYearResetMonth} onChange={(e) => patch("benefit", { benefitYearResetMonth: e.target.value })} className="h-10 text-sm" /></Field>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ToggleField label="Require Approval" checked={settings.benefit.requireApproval} onCheckedChange={(v) => patch("benefit", { requireApproval: v })} />
                <ToggleField label="Require Release Confirmation" checked={settings.benefit.requireReleaseConfirmation} onCheckedChange={(v) => patch("benefit", { requireReleaseConfirmation: v })} />
                <ToggleField label="Allow Eligibility Override" checked={settings.benefit.allowEligibilityOverride} onCheckedChange={(v) => patch("benefit", { allowEligibilityOverride: v })} />
                <ToggleField label="Require Supporting Documents" checked={settings.benefit.requireSupportingDocuments} onCheckedChange={(v) => patch("benefit", { requireSupportingDocuments: v })} />
                <ToggleField label="Allow Multiple Pending Applications" checked={settings.benefit.allowMultiplePendingApplications} onCheckedChange={(v) => patch("benefit", { allowMultiplePendingApplications: v })} />
              </div>
            </SectionShell>
          )}

          {active === "notification" && (
            <SectionShell title="Notification Settings" description="Choose which real system events appear in the topbar notification bell." onSave={() => handleSave("notification")} onReset={() => setResetConfirm("notification")} isSaving={isSaving}>
              <AlertBanner tone="info" title="Notification Bell Content" description="These switches filter the authenticated user's database notifications. Disabling In-App Notifications hides all records from the bell without deleting notification history." className="mb-4" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ToggleField label="In-App Notifications" checked={settings.notification.inAppNotifications} onCheckedChange={(v) => patch("notification", { inAppNotifications: v })} />
                <ToggleField label="Email Notifications" checked={settings.notification.emailNotifications} onCheckedChange={(v) => patch("notification", { emailNotifications: v })} />
                <ToggleField label="SMS Notifications" checked={settings.notification.smsNotifications} onCheckedChange={(v) => patch("notification", { smsNotifications: v })} />
                <ToggleField label="Loan Approval Alerts" checked={settings.notification.loanApprovalAlerts} onCheckedChange={(v) => patch("notification", { loanApprovalAlerts: v })} />
                <ToggleField label="Loan Due Date Alerts" checked={settings.notification.loanDueDateAlerts} onCheckedChange={(v) => patch("notification", { loanDueDateAlerts: v })} />
                <ToggleField label="Overdue Loan Alerts" checked={settings.notification.overdueLoanAlerts} onCheckedChange={(v) => patch("notification", { overdueLoanAlerts: v })} />
                <ToggleField label="Benefit Approval Alerts" checked={settings.notification.benefitApprovalAlerts} onCheckedChange={(v) => patch("notification", { benefitApprovalAlerts: v })} />
                <ToggleField label="Contribution Import Alerts" checked={settings.notification.contributionImportAlerts} onCheckedChange={(v) => patch("notification", { contributionImportAlerts: v })} />
                <ToggleField label="Incomplete Profile Alerts" checked={settings.notification.incompleteProfileAlerts} onCheckedChange={(v) => patch("notification", { incompleteProfileAlerts: v })} />
                <ToggleField label="User Account Alerts" checked={settings.notification.userAccountAlerts} onCheckedChange={(v) => patch("notification", { userAccountAlerts: v })} />
              </div>
            </SectionShell>
          )}

          {active === "security" && (
            <SectionShell title="Security Settings" description="Credential and session security standards." onSave={() => handleSave("security")} onReset={() => setResetConfirm("security")} isSaving={isSaving}>
              <AlertBanner tone="info" title="Frontend-only enforcement" description="Actual enforcement of these policies will require backend integration in a future phase." className="mb-4" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Minimum Password Length"><Input type="number" value={settings.security.minimumPasswordLength} onChange={(e) => patch("security", { minimumPasswordLength: Number(e.target.value) })} className="h-10 text-sm" /></Field>
                <Field label="Session Timeout (Minutes)"><Input type="number" value={settings.security.sessionTimeoutMinutes} onChange={(e) => patch("security", { sessionTimeoutMinutes: Number(e.target.value) })} className="h-10 text-sm" /></Field>
                <Field label="Maximum Login Attempts"><Input type="number" value={settings.security.maximumLoginAttempts} onChange={(e) => patch("security", { maximumLoginAttempts: Number(e.target.value) })} className="h-10 text-sm" /></Field>
                <Field label="Lockout Duration (Minutes)"><Input type="number" value={settings.security.lockoutDurationMinutes} onChange={(e) => patch("security", { lockoutDurationMinutes: Number(e.target.value) })} className="h-10 text-sm" /></Field>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ToggleField label="Require Uppercase Letter" checked={settings.security.requireUppercase} onCheckedChange={(v) => patch("security", { requireUppercase: v })} />
                <ToggleField label="Require Lowercase Letter" checked={settings.security.requireLowercase} onCheckedChange={(v) => patch("security", { requireLowercase: v })} />
                <ToggleField label="Require Number" checked={settings.security.requireNumber} onCheckedChange={(v) => patch("security", { requireNumber: v })} />
                <ToggleField label="Require Special Character" checked={settings.security.requireSpecialCharacter} onCheckedChange={(v) => patch("security", { requireSpecialCharacter: v })} />
                <ToggleField label="Require Password Change on First Login" checked={settings.security.requirePasswordChangeOnFirstLogin} onCheckedChange={(v) => patch("security", { requirePasswordChangeOnFirstLogin: v })} />
                <ToggleField label="Enable Two-Factor Authentication" description="Unavailable until an authentication provider is configured." checked={settings.security.enableTwoFactorAuth} onCheckedChange={(v) => patch("security", { enableTwoFactorAuth: v })} disabled />
                <ToggleField label="Audit Sensitive Actions" checked={settings.security.auditSensitiveActions} onCheckedChange={(v) => patch("security", { auditSensitiveActions: v })} />
                <ToggleField label="Confirm Financial Transactions" checked={settings.security.confirmFinancialTransactions} onCheckedChange={(v) => patch("security", { confirmFinancialTransactions: v })} />
              </div>
            </SectionShell>
          )}

          {active === "backup" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/95 p-5 shadow-sm">
                <div className="mb-4 border-b border-border/30 pb-3">
                  <h2 className="font-heading text-base font-bold tracking-tight text-foreground">Backup Settings</h2>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">Export and restore server-backed System Settings snapshots.</p>
                </div>
                <AlertBanner tone="info" title="Settings backup" description="This exports System Settings and appearance. It is not a full database or attachment backup." className="mb-4 animate-in fade-in duration-200" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Backup Frequency">
                    <CommandSelect
                      className="w-full h-10 text-sm bg-background border-border/80 hover:bg-accent/40 transition-all"
                      value={settings.backup.backupFrequency}
                      onValueChange={(v) => patch("backup", { backupFrequency: v })}
                      options={["Hourly", "Daily", "Weekly", "Monthly"].map((f) => ({ value: f, label: f }))}
                      hideSearch
                    />
                  </Field>
                  <Field label="Retention (Days)"><Input type="number" value={settings.backup.retentionDays} onChange={(e) => patch("backup", { retentionDays: Number(e.target.value) })} className="h-10 text-sm" /></Field>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ToggleField label="Automatic Backup" checked={settings.backup.automaticBackup} onCheckedChange={(v) => patch("backup", { automaticBackup: v })} />
                  <ToggleField label="Include Attachments" checked={settings.backup.includeAttachments} onCheckedChange={(v) => patch("backup", { includeAttachments: v })} />
                </div>
                <div className="mt-5 flex flex-wrap gap-2 pt-2 border-t border-border/30">
                  <Button onClick={handleCreateBackup} disabled={isCreatingBackup} className="h-9 text-xs gap-1.5 shadow-sm">
                    {isCreatingBackup ? <Loader2 className="animate-spin size-3.5" /> : <DatabaseBackup className="size-3.5" />} Record Settings Snapshot
                  </Button>
                  <Button variant="outline" onClick={downloadSettingsBackup} className="h-9 text-xs gap-1.5">
                    <Download className="size-3.5" /> Download Settings Backup
                  </Button>
                  <Button variant="outline" onClick={() => restoreInputRef.current?.click()} className="h-9 text-xs gap-1.5">
                    <Upload className="size-3.5" /> Restore from JSON
                  </Button>
                  <input ref={restoreInputRef} type="file" accept="application/json" className="hidden" onChange={handleRestoreFile} />
                </div>
              </div>

              {/* Table list history */}
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
                <div className="border-b border-border/60 bg-muted/10 px-4 py-3">
                  <h3 className="text-sm font-bold tracking-tight text-foreground">Backup History Logs</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Backup Name</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Date Created</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Type</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">File Size</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Status</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Created By</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backupHistory.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-semibold text-foreground py-3">{b.name}</TableCell>
                        <TableCell className="py-3">{formatDateTime(b.date)}</TableCell>
                        <TableCell className="py-3">{b.type}</TableCell>
                        <TableCell className="py-3">{b.size}</TableCell>
                        <TableCell className="py-3"><StatusBadge label={b.status} tone={b.status === "Completed" ? "success" : "danger"} /></TableCell>
                        <TableCell className="py-3">{b.createdBy}</TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon-sm" className="size-7 rounded-full" onClick={downloadSettingsBackup} aria-label="Download backup"><Download className="size-3.5" /></Button>
                            <Button variant="ghost" size="icon-sm" className="size-7 rounded-full" onClick={() => toast.info("Restoring is simulated in this demo.")} aria-label="Restore backup"><RotateCcw className="size-3.5" /></Button>
                            <Button variant="ghost" size="icon-sm" className="size-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteBackupId(b.id)} aria-label="Delete backup"><Trash2 className="size-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {active === "reportTemplate" && (
            <SectionShell title="Report Template" description="Choose and customize a complete report layout for each report category." onSave={() => handleSave("reportTemplate")} onReset={() => setResetConfirm("reportTemplate")} isSaving={isSaving}>
              <AlertBanner tone="info" title="Category-specific report layouts" description="The organization header is shared, while the title, table body, colors, density, borders, and orientation can be configured separately per report category." className="mb-4" />

              <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/20 p-1">
                {REPORT_CATEGORIES.map((category) => (
                  <Button
                    key={category.key}
                    type="button"
                    size="sm"
                    variant={reportCategory === category.key ? "default" : "ghost"}
                    className="shrink-0"
                    onClick={() => setReportCategory(category.key)}
                  >
                    {category.label}
                  </Button>
                ))}
              </div>

              <div className="mb-5 grid grid-cols-2 rounded-xl border border-border bg-muted/20 p-1">
                <Button type="button" variant={reportFormat === "pdf" ? "default" : "ghost"} onClick={() => setReportFormat("pdf")}>
                  <FileText /> PDF Template
                </Button>
                <Button type="button" variant={reportFormat === "excel" ? "default" : "ghost"} onClick={() => setReportFormat("excel")}>
                  <Download /> Excel Template
                </Button>
              </div>

              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(Object.keys(REPORT_PRESETS) as ReportTemplatePreset[]).map((preset) => {
                  const selected = currentReportDesign.preset === preset
                  return (
                    <button
                      key={preset}
                      type="button"
                      className={`rounded-xl border p-3 text-left transition-colors ${selected ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-border hover:bg-muted/40"}`}
                      onClick={() => applyReportPreset(preset)}
                    >
                      <span className="block text-sm font-semibold capitalize">{preset} Template</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {preset === "classic" ? "Centered formal title and traditional table." : preset === "modern" ? "Colored header, striped rows, and left-aligned title." : "Dense landscape layout for wide data tables."}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="sticky top-14 z-20 mb-4 flex flex-wrap items-center gap-1 rounded-xl border border-border bg-background/95 p-2 shadow-sm backdrop-blur">
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Undo" title="Undo" onClick={() => runEditorCommand("undo")}><Undo2 /></Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Redo" title="Redo" onClick={() => runEditorCommand("redo")}><Redo2 /></Button>
                <Button type="button" variant="ghost" size="icon-sm" disabled={isPreviewingReport} aria-label="Backend report preview" title={reportFormat === "pdf" ? "Open backend PDF preview" : "Download backend Excel preview"} onClick={previewReportTemplate}>
                  {isPreviewingReport ? <Loader2 className="animate-spin" /> : <Printer />}
                </Button>
                <span className="mx-1 h-6 w-px bg-border" />
                <CommandSelect
                  className="h-8 w-24 border-0 bg-transparent px-2 text-xs shadow-none"
                  value={String(editorZoom)}
                  onValueChange={(value) => setEditorZoom(Number(value))}
                  options={[50, 75, 90, 100, 125, 150].map((value) => ({ value: String(value), label: `${value}%` }))}
                  hideSearch
                />
                <CommandSelect
                  className="h-8 w-32 border-0 bg-transparent px-2 text-xs shadow-none"
                  value={editorBlockStyle}
                  onValueChange={(value) => {
                    setEditorBlockStyle(value)
                    runEditorCommand("formatBlock", value)
                  }}
                  options={[
                    { value: "p", label: "Normal text" },
                    { value: "h1", label: "Heading 1" },
                    { value: "h2", label: "Heading 2" },
                    { value: "h3", label: "Heading 3" },
                  ]}
                  hideSearch
                />
                <CommandSelect
                  className="h-8 w-28 border-0 bg-transparent px-2 text-xs shadow-none"
                  value={editorFontFamily}
                  onValueChange={(value) => {
                    setEditorFontFamily(value)
                    patchActiveTextStyle({ fontFamily: value as ReportTextStyle["fontFamily"] })
                    runEditorCommand("fontName", value)
                  }}
                  options={[
                    { value: "Arial", label: "Arial" },
                    { value: "Georgia", label: "Georgia" },
                    { value: "Times New Roman", label: "Times New Roman" },
                    { value: "Courier New", label: "Courier New" },
                  ]}
                  hideSearch
                />
                <span className="mx-1 h-6 w-px bg-border" />
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Decrease font size" onClick={() => changeEditorFontSize(editorFontSize - 1)}><Minus /></Button>
                <Input
                  type="number"
                  min={7}
                  max={24}
                  value={editorFontSize}
                  onChange={(event) => changeEditorFontSize(Number(event.target.value))}
                  className="h-8 w-12 px-1 text-center text-xs"
                />
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Increase font size" onClick={() => changeEditorFontSize(editorFontSize + 1)}><Plus /></Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Bold" title="Bold" onClick={() => {
                  patchActiveTextStyle({ fontWeight: activeTextStyle.fontWeight === "bold" ? "normal" : "bold" })
                  runEditorCommand("bold")
                }}><Bold /></Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Italic" title="Italic" onClick={() => {
                  patchActiveTextStyle({ fontStyle: activeTextStyle.fontStyle === "italic" ? "normal" : "italic" })
                  runEditorCommand("italic")
                }}><Italic /></Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Underline" title="Underline" onClick={() => {
                  patchActiveTextStyle({ textDecoration: activeTextStyle.textDecoration === "underline" ? "none" : "underline" })
                  runEditorCommand("underline")
                }}><Underline /></Button>
                <label className="relative flex size-8 cursor-pointer items-center justify-center rounded-md text-xs font-bold underline decoration-2 hover:bg-accent" title="Text color">
                  A
                  <input type="color" className="absolute inset-0 cursor-pointer opacity-0" onChange={(event) => {
                    patchActiveTextStyle({ textColor: event.target.value })
                    runEditorCommand("foreColor", event.target.value)
                  }} />
                </label>
                <span className="mx-1 h-6 w-px bg-border" />
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Align left" onClick={() => {
                  patchActiveTextStyle({ textAlignment: "left" })
                  runEditorCommand("justifyLeft")
                }}><AlignLeft /></Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Align center" onClick={() => {
                  patchActiveTextStyle({ textAlignment: "center" })
                  runEditorCommand("justifyCenter")
                }}><AlignCenter /></Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Bulleted list" onClick={() => runEditorCommand("insertUnorderedList")}><List /></Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Numbered list" onClick={() => runEditorCommand("insertOrderedList")}><ListOrdered /></Button>
              </div>

              {reportFormat === "excel" ? (
                <div
                  ref={reportEditorRef}
                  tabIndex={-1}
                  className="relative overflow-auto rounded-lg border border-slate-300 bg-white text-slate-900 shadow-xl"
                  style={{ zoom: editorZoom / 100 }}
                >
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
                    <span className="-rotate-30 select-none whitespace-nowrap text-5xl font-black tracking-[0.2em] text-slate-400/15">SAMPLE ONLY</span>
                  </div>
                  <table className="relative z-20 w-full min-w-[760px] border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#f3f4f6] text-center font-semibold text-slate-600">
                        <th className="w-11 border border-slate-300 bg-[#e5e7eb] p-1" />
                        {["A", "B", "C", "D"].map((letter) => <th key={letter} className="border border-slate-300 p-1">{letter}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th className="border border-slate-300 bg-[#f3f4f6] text-center font-normal text-slate-500">1</th>
                        <td colSpan={4} className="h-28 border border-slate-300 p-3">
                          <div className="grid grid-cols-[80px_1fr_80px] items-center gap-3 text-center">
                            <img src={settings.reportTemplate.leftLogo} alt="" className="size-16 object-contain justify-self-center" />
                            <div>
                              <div contentEditable suppressContentEditableWarning onBlur={(e) => patch("reportTemplate", { countryLine: e.currentTarget.textContent ?? "" })}>{settings.reportTemplate.countryLine}</div>
                              <div contentEditable suppressContentEditableWarning className="font-bold" onBlur={(e) => patch("reportTemplate", { organizationLine: e.currentTarget.textContent ?? "" })}>{settings.reportTemplate.organizationLine}</div>
                              <div contentEditable suppressContentEditableWarning className="font-bold" onBlur={(e) => patch("reportTemplate", { acronymLine: e.currentTarget.textContent ?? "" })}>{settings.reportTemplate.acronymLine}</div>
                              <div contentEditable suppressContentEditableWarning onBlur={(e) => patch("reportTemplate", { addressLine: e.currentTarget.textContent ?? "" })}>{settings.reportTemplate.addressLine}</div>
                            </div>
                            <img src={settings.reportTemplate.rightLogo} alt="" className="size-16 object-contain justify-self-center" />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-[#f3f4f6] text-center font-normal text-slate-500">2</th>
                        <td colSpan={4} className="border border-slate-300 p-2 font-bold" style={{ color: currentReportDesign.primaryColor, textAlign: currentReportDesign.titleAlignment }}>
                          Sample {REPORT_CATEGORIES.find((category) => category.key === reportCategory)?.label}
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-[#f3f4f6] text-center font-normal text-slate-500">3</th>
                        <td
                          colSpan={4}
                          contentEditable
                          suppressContentEditableWarning
                          className="relative z-30 cursor-text border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-emerald-500"
                          style={{ fontFamily: currentReportDesign.captionStyle.fontFamily, fontSize: `${currentReportDesign.captionStyle.fontSize}px`, fontWeight: currentReportDesign.captionStyle.fontWeight, fontStyle: currentReportDesign.captionStyle.fontStyle, textDecoration: currentReportDesign.captionStyle.textDecoration, color: currentReportDesign.captionStyle.textColor, textAlign: currentReportDesign.captionStyle.textAlignment }}
                          onPointerDown={() => setEditorRegion("caption")}
                          onFocus={(e) => { setEditorRegion("caption"); if (!currentReportDesign.captionText) e.currentTarget.textContent = "" }}
                          onBlur={(e) => patchReportCategory({ captionText: e.currentTarget.textContent ?? "" })}
                        >
                          {currentReportDesign.captionText || "Click here to add a caption or subtitle"}
                        </td>
                      </tr>
                      <tr style={{ backgroundColor: currentReportDesign.headerBackground }}>
                        <th className="border border-slate-300 bg-[#f3f4f6] text-center font-normal text-slate-500">4</th>
                        {["Reference", "Member Name", "Status", "Amount"].map((header) => <th key={header} className="border border-slate-300 p-2 text-left">{header}</th>)}
                      </tr>
                      {[
                        ["GCGEA-001", "Juan Dela Cruz", "Active", "₱12,500.00"],
                        ["GCGEA-002", "Maria Santos", "Approved", "₱8,000.00"],
                        ["GCGEA-003", "Pedro Reyes", "Pending", "₱5,500.00"],
                      ].map((row, rowIndex) => (
                        <tr key={row[0]} style={{
                          backgroundColor: currentReportDesign.stripedRows && rowIndex % 2 ? "#f8fafc" : "#ffffff",
                          fontFamily: currentReportDesign.bodyFontFamily,
                          fontSize: `${currentReportDesign.bodyFontSize}px`,
                          fontWeight: currentReportDesign.bodyFontWeight,
                          fontStyle: currentReportDesign.bodyFontStyle,
                          textDecoration: currentReportDesign.bodyTextDecoration,
                          color: currentReportDesign.bodyTextColor,
                          textAlign: currentReportDesign.bodyTextAlignment,
                        }}>
                          <th className="border border-slate-300 bg-[#f3f4f6] text-center font-normal text-slate-500">{rowIndex + 5}</th>
                          {row.map((cell) => <td key={cell} className="border border-slate-300 p-2">{cell}</td>)}
                        </tr>
                      ))}
                      <tr>
                        <th className="border border-slate-300 bg-[#f3f4f6] text-center font-normal text-slate-500">8</th>
                        <td colSpan={4} className="border border-slate-300 p-2 italic text-slate-600">
                          <strong>Note: </strong>
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            className="relative z-30 cursor-text outline-none"
                            style={{ fontFamily: currentReportDesign.noteStyle.fontFamily, fontSize: `${currentReportDesign.noteStyle.fontSize}px`, fontWeight: currentReportDesign.noteStyle.fontWeight, fontStyle: currentReportDesign.noteStyle.fontStyle, textDecoration: currentReportDesign.noteStyle.textDecoration, color: currentReportDesign.noteStyle.textColor, textAlign: currentReportDesign.noteStyle.textAlignment }}
                            onPointerDown={() => setEditorRegion("note")}
                            onFocus={(e) => { setEditorRegion("note"); if (!currentReportDesign.noteText) e.currentTarget.textContent = "" }}
                            onBlur={(e) => patchReportCategory({ noteText: e.currentTarget.textContent ?? "" })}
                          >
                            {currentReportDesign.noteText || "Click here to add notes or remarks"}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
              <div
                ref={reportEditorRef}
                tabIndex={-1}
                className="relative mx-auto w-full max-w-[900px] overflow-hidden border bg-white p-8 text-black shadow-xl"
                style={{ aspectRatio: reportPaperAspect(currentReportDesign), zoom: editorZoom / 100 }}
              >
                <div className="absolute right-3 top-3 z-20 rounded bg-slate-900 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white">
                  {reportFormat.toUpperCase()} · {currentReportDesign.paperSize.toUpperCase()} · {currentReportDesign.orientation === "landscape" ? "Landscape" : "Portrait"}
                </div>
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
                  <span className="-rotate-30 select-none whitespace-nowrap text-5xl font-black tracking-[0.2em] text-slate-400/20">SAMPLE ONLY</span>
                </div>
                <div className="relative z-20 grid grid-cols-[90px_1fr_90px] items-center gap-4 text-center">
                  <img src={settings.reportTemplate.leftLogo} alt="Left report logo" className="size-20 object-contain justify-self-center" />
                  <div className="leading-tight">
                    <div contentEditable suppressContentEditableWarning className="rounded px-1 outline-none hover:bg-blue-50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-300" onBlur={(e) => patch("reportTemplate", { countryLine: e.currentTarget.textContent ?? "" })}>{settings.reportTemplate.countryLine}</div>
                    <div contentEditable suppressContentEditableWarning className="rounded px-1 text-lg font-bold outline-none hover:bg-blue-50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-300" onBlur={(e) => patch("reportTemplate", { organizationLine: e.currentTarget.textContent ?? "" })}>{settings.reportTemplate.organizationLine}</div>
                    <div contentEditable suppressContentEditableWarning className="rounded px-1 text-lg font-bold outline-none hover:bg-blue-50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-300" onBlur={(e) => patch("reportTemplate", { acronymLine: e.currentTarget.textContent ?? "" })}>{settings.reportTemplate.acronymLine}</div>
                    <div contentEditable suppressContentEditableWarning className="rounded px-1 outline-none hover:bg-blue-50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-300" onBlur={(e) => patch("reportTemplate", { addressLine: e.currentTarget.textContent ?? "" })}>{settings.reportTemplate.addressLine}</div>
                  </div>
                  <img src={settings.reportTemplate.rightLogo} alt="Right report logo" className="size-20 object-contain justify-self-center" />
                </div>
                <div
                  className="relative z-20 mt-4 border-t-2 pt-3"
                  style={{ borderColor: currentReportDesign.primaryColor }}
                >
                  <h3
                    className="mb-3 text-base font-bold"
                    style={{
                      color: currentReportDesign.primaryColor,
                      textAlign: currentReportDesign.titleAlignment,
                    }}
                  >
                    Sample {REPORT_CATEGORIES.find((category) => category.key === reportCategory)?.label}
                  </h3>
                  <p
                    contentEditable
                    suppressContentEditableWarning
                    className="relative z-30 mb-3 min-h-6 cursor-text rounded border border-dashed border-slate-300 px-2 py-1 outline-none hover:bg-blue-50 focus:border-blue-400 focus:bg-blue-50"
                    style={{ fontFamily: currentReportDesign.captionStyle.fontFamily, fontSize: `${currentReportDesign.captionStyle.fontSize}px`, fontWeight: currentReportDesign.captionStyle.fontWeight, fontStyle: currentReportDesign.captionStyle.fontStyle, textDecoration: currentReportDesign.captionStyle.textDecoration, color: currentReportDesign.captionStyle.textColor, textAlign: currentReportDesign.captionStyle.textAlignment }}
                    onPointerDown={() => setEditorRegion("caption")}
                    onFocus={(e) => {
                      setEditorRegion("caption")
                      if (!currentReportDesign.captionText) e.currentTarget.textContent = ""
                    }}
                    onBlur={(e) => patchReportCategory({ captionText: e.currentTarget.textContent ?? "" })}
                  >
                    {currentReportDesign.captionText || "Click here to add a caption or subtitle"}
                  </p>
                  <table
                    onClick={() => setEditorRegion("body")}
                    className="w-full border-collapse"
                    style={{
                      fontSize: `${Math.max(8, currentReportDesign.bodyFontSize + 2)}px`,
                      fontFamily: currentReportDesign.bodyFontFamily,
                      fontWeight: currentReportDesign.bodyFontWeight,
                      fontStyle: currentReportDesign.bodyFontStyle,
                      textDecoration: currentReportDesign.bodyTextDecoration,
                      color: currentReportDesign.bodyTextColor,
                      textAlign: currentReportDesign.bodyTextAlignment,
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: currentReportDesign.headerBackground }}>
                        {["Reference", "Member Name", "Status", "Amount"].map((header) => (
                          <th
                            key={header}
                            className="p-2 text-left"
                            style={{ border: currentReportDesign.showBorders ? "1px solid #94a3b8" : "none" }}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["GCGEA-001", "Juan Dela Cruz", "Active", "₱12,500.00"],
                        ["GCGEA-002", "Maria Santos", "Approved", "₱8,000.00"],
                        ["GCGEA-003", "Pedro Reyes", "Pending", "₱5,500.00"],
                      ].map((row, rowIndex) => (
                        <tr key={row[0]} style={{ backgroundColor: currentReportDesign.stripedRows && rowIndex % 2 ? "#f8fafc" : "#ffffff" }}>
                          {row.map((cell) => (
                            <td
                              key={cell}
                              className="p-2"
                              style={{ border: currentReportDesign.showBorders ? "1px solid #cbd5e1" : "none" }}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3 border-t border-slate-300 pt-2 text-xs text-slate-600" style={{ textAlign: currentReportDesign.noteStyle.textAlignment }}>
                    <strong>Note: </strong>
                    <span
                      contentEditable
                      suppressContentEditableWarning
                      className="relative z-30 cursor-text rounded px-1 outline-none hover:bg-blue-50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-300"
                      style={{ fontFamily: currentReportDesign.noteStyle.fontFamily, fontSize: `${currentReportDesign.noteStyle.fontSize}px`, fontWeight: currentReportDesign.noteStyle.fontWeight, fontStyle: currentReportDesign.noteStyle.fontStyle, textDecoration: currentReportDesign.noteStyle.textDecoration, color: currentReportDesign.noteStyle.textColor }}
                      onPointerDown={() => setEditorRegion("note")}
                      onFocus={(e) => {
                        setEditorRegion("note")
                        if (!currentReportDesign.noteText) e.currentTarget.textContent = ""
                      }}
                      onBlur={(e) => patchReportCategory({ noteText: e.currentTarget.textContent ?? "" })}
                    >
                      {currentReportDesign.noteText || "Click here to add notes or remarks"}
                    </span>
                  </div>
                </div>
              </div>
              )}

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Country / Government Line"><Input value={settings.reportTemplate.countryLine} onChange={(e) => patch("reportTemplate", { countryLine: e.target.value })} /></Field>
                <Field label="Organization Name"><Input value={settings.reportTemplate.organizationLine} onChange={(e) => patch("reportTemplate", { organizationLine: e.target.value })} /></Field>
                <Field label="Acronym Line"><Input value={settings.reportTemplate.acronymLine} onChange={(e) => patch("reportTemplate", { acronymLine: e.target.value })} /></Field>
                <Field label="Address Line"><Input value={settings.reportTemplate.addressLine} onChange={(e) => patch("reportTemplate", { addressLine: e.target.value })} /></Field>
                <Field label="Left Logo">
                  <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadReportLogo("leftLogo", e.target.files?.[0])} />
                </Field>
                <Field label="Right Logo / City Seal">
                  <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadReportLogo("rightLogo", e.target.files?.[0])} />
                </Field>
                <ColorField label="Body Primary Color" value={currentReportDesign.primaryColor} onChange={(value) => patchReportCategory({ primaryColor: value })} />
                <ColorField label="Table Header Background" value={currentReportDesign.headerBackground} onChange={(value) => patchReportCategory({ headerBackground: value })} />
                <Field label="Body Font Size (px)">
                  <Input type="number" min={7} max={14} value={currentReportDesign.bodyFontSize} onChange={(e) => patchReportCategory({ bodyFontSize: Number(e.target.value) })} />
                </Field>
                <Field label="Page Orientation">
                  <CommandSelect
                    value={currentReportDesign.orientation}
                    onValueChange={(value) => patchReportCategory({ orientation: value as ReportCategoryTemplate["orientation"] })}
                    options={[
                      { value: "auto", label: "Automatic" },
                      { value: "portrait", label: "Portrait" },
                      { value: "landscape", label: "Landscape" },
                    ]}
                    hideSearch
                  />
                </Field>
                <Field label="Paper Size">
                  <CommandSelect
                    value={currentReportDesign.paperSize}
                    onValueChange={(value) => patchReportCategory({ paperSize: value as ReportCategoryTemplate["paperSize"] })}
                    options={[
                      { value: "a4", label: "A4" },
                      { value: "letter", label: "Letter (8.5 × 11 in)" },
                      { value: "legal", label: "Legal (8.5 × 14 in)" },
                    ]}
                    hideSearch
                  />
                </Field>
                <Field label="Report Title Alignment">
                  <CommandSelect
                    value={currentReportDesign.titleAlignment}
                    onValueChange={(value) => patchReportCategory({ titleAlignment: value as ReportCategoryTemplate["titleAlignment"] })}
                    options={[
                      { value: "left", label: "Left" },
                      { value: "center", label: "Center" },
                    ]}
                    hideSearch
                  />
                </Field>
                <Field label="Caption / Subtitle">
                  <Input value={currentReportDesign.captionText} onChange={(e) => patchReportCategory({ captionText: e.target.value })} placeholder="Optional caption below the report title" />
                </Field>
                <Field label="Note / Remarks">
                  <Input value={currentReportDesign.noteText} onChange={(e) => patchReportCategory({ noteText: e.target.value })} placeholder="Optional note displayed below the table" />
                </Field>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <ToggleField label="Show Generated Date" checked={settings.reportTemplate.showGeneratedDate} onCheckedChange={(v) => patch("reportTemplate", { showGeneratedDate: v })} />
                <ToggleField label="Striped Table Rows" checked={currentReportDesign.stripedRows} onCheckedChange={(v) => patchReportCategory({ stripedRows: v })} />
                <ToggleField label="Show Cell Borders" checked={currentReportDesign.showBorders} onCheckedChange={(v) => patchReportCategory({ showBorders: v })} />
              </div>
            </SectionShell>
          )}

          {active === "appearance" && (
            <SectionShell title="Appearance Settings" description="Theme colors and layout defaults. Combine with the theme selector." onSave={() => handleSave("appearance")} onReset={() => setResetConfirm("appearance")} isSaving={isSaving}>
              <div className="mb-5 rounded-xl border border-border bg-muted/10 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex size-20 shrink-0 items-center justify-center rounded-xl border border-border bg-sidebar p-2">
                    <img src={appearance.sidebarLogoUrl} alt="Sidebar logo preview" className="size-full object-contain" />
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm font-semibold">Sidebar Logo</Label>
                    <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WebP, or SVG. Maximum file size is 2 MB.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("sidebar-logo-input")?.click()}>
                        <Upload className="size-3.5" /> Choose Logo
                      </Button>
                      {appearance.sidebarLogoUrl !== "/logo.png" && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAppearance((prev) => ({ ...prev, sidebarLogoUrl: "/logo.png" }))}>
                          <RotateCcw className="size-3.5" /> Use Default Logo
                        </Button>
                      )}
                    </div>
                    <input id="sidebar-logo-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(event) => {
                      uploadSidebarLogo(event.target.files?.[0])
                      event.target.value = ""
                    }} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ColorField label="Primary Color" value={appearance.primaryColor} onChange={(v) => setAppearance((prev) => ({ ...prev, primaryColor: v }))} />
                <ColorField label="Secondary Color" value={appearance.secondaryColor} onChange={(v) => setAppearance((prev) => ({ ...prev, secondaryColor: v }))} />
                <ColorField label="Accent Color" value={appearance.accentColor} onChange={(v) => setAppearance((prev) => ({ ...prev, accentColor: v }))} />
                <ColorField label="Sidebar Color" value={appearance.sidebarColor} onChange={(v) => setAppearance((prev) => ({ ...prev, sidebarColor: v }))} />
                <ColorField label="Background Color" value={appearance.backgroundColor} onChange={(v) => setAppearance((prev) => ({ ...prev, backgroundColor: v }))} />
                <ColorField label="Progress Color 1 (Start)" value={appearance.progressColorStart} onChange={(v) => setAppearance((prev) => ({ ...prev, progressColorStart: v }))} />
                <ColorField label="Progress Color 2 (Middle)" value={appearance.progressColorMiddle} onChange={(v) => setAppearance((prev) => ({ ...prev, progressColorMiddle: v }))} />
                <ColorField label="Progress Color 3 (End)" value={appearance.progressColorEnd} onChange={(v) => setAppearance((prev) => ({ ...prev, progressColorEnd: v }))} />
                <Field label="Border Radius (px)"><Input type="number" value={appearance.borderRadius} onChange={(e) => setAppearance((prev) => ({ ...prev, borderRadius: Number(e.target.value) }))} className="h-10 text-sm" /></Field>
                <Field label="Sidebar Style">
                  <CommandSelect
                    className="w-full h-10 text-sm bg-background border-border/80 hover:bg-accent/40 transition-all"
                    value={appearance.sidebarStyle}
                    onValueChange={(v) => setAppearance((prev) => ({ ...prev, sidebarStyle: v as AppearanceSettings["sidebarStyle"] }))}
                    options={[{ value: "expanded", label: "Expanded" }, { value: "collapsed", label: "Collapsed" }]}
                    hideSearch
                  />
                </Field>
                <Field label="Logo Size">
                  <CommandSelect
                    className="w-full h-10 text-sm bg-background border-border/80 hover:bg-accent/40 transition-all"
                    value={appearance.logoSize}
                    onValueChange={(v) => setAppearance((prev) => ({ ...prev, logoSize: v as AppearanceSettings["logoSize"] }))}
                    options={[{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }]}
                    hideSearch
                  />
                </Field>
                <Field label="Base Font Size (px)">
                  <Input
                    type="number"
                    min={12}
                    max={20}
                    value={appearance.baseFontSize}
                    onChange={(e) => setAppearance((prev) => ({ ...prev, baseFontSize: Number(e.target.value) }))}
                    className="h-10 text-sm"
                  />
                </Field>
                <Field label="Font Weight">
                  <CommandSelect
                    className="h-10 w-full text-sm"
                    value={String(appearance.fontWeight)}
                    onValueChange={(v) => setAppearance((prev) => ({ ...prev, fontWeight: Number(v) as AppearanceSettings["fontWeight"] }))}
                    options={[
                      { value: "400", label: "Regular (400)" },
                      { value: "500", label: "Medium (500)" },
                      { value: "600", label: "Semi Bold (600)" },
                      { value: "700", label: "Bold (700)" },
                    ]}
                    hideSearch
                  />
                </Field>
                <Field label="Font Family">
                  <CommandSelect
                    className="h-10 w-full text-sm"
                    value={appearance.fontFamily}
                    onValueChange={(v) => setAppearance((prev) => ({ ...prev, fontFamily: v as AppearanceSettings["fontFamily"] }))}
                    options={[
                      { value: "geist", label: "Geist (Default)" },
                      { value: "system", label: "System Sans" },
                      { value: "serif", label: "Serif" },
                      { value: "monospace", label: "Monospace" },
                    ]}
                    hideSearch
                  />
                </Field>
                <Field label="Font Style">
                  <CommandSelect
                    className="h-10 w-full text-sm"
                    value={appearance.fontStyle}
                    onValueChange={(v) => setAppearance((prev) => ({ ...prev, fontStyle: v as AppearanceSettings["fontStyle"] }))}
                    options={[
                      { value: "normal", label: "Normal" },
                      { value: "italic", label: "Italic" },
                    ]}
                    hideSearch
                  />
                </Field>
              </div>
              <div className="mt-4">
                <ToggleField label="Compact Mode" description="Reduce padding across tables and cards." checked={appearance.compactMode} onCheckedChange={(v) => setAppearance((prev) => ({ ...prev, compactMode: v }))} />
              </div>

              {/* Theme Live Preview */}
              <div className="mt-6 rounded-2xl border border-border p-4 bg-muted/10" style={{ borderRadius: appearance.borderRadius }}>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Theme Live Preview</p>
                <div className="overflow-hidden border border-border/60 shadow-md" style={{ borderRadius: appearance.borderRadius }}>
                  <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold text-white shadow-sm" style={{ backgroundColor: appearance.sidebarColor }}>
                    <span>GCGEA-MLBMS Application Header</span>
                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: appearance.accentColor, color: "#1a1200" }}>Admin role</span>
                  </div>
                  <div className="space-y-4 p-5" style={{ backgroundColor: appearance.backgroundColor }}>
                    <div className="flex gap-2">
                      <span className="px-3.5 py-2 text-xs font-semibold text-white shadow-sm" style={{ backgroundColor: appearance.primaryColor, borderRadius: appearance.borderRadius }}>Primary Action Button</span>
                      <span className="px-3.5 py-2 text-xs font-semibold text-white shadow-sm" style={{ backgroundColor: appearance.secondaryColor, borderRadius: appearance.borderRadius }}>Secondary</span>
                    </div>
                    <div className="border border-black/10 bg-white p-4 text-xs font-medium text-slate-700 shadow-sm" style={{ borderRadius: appearance.borderRadius }}>
                      Sample dashboard layout block on the configured system background color.
                    </div>
                  </div>
                </div>
              </div>
            </SectionShell>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!resetConfirm}
        onOpenChange={(open) => !open && setResetConfirm(null)}
        title="Reset section to default?"
        description="All values in this section will revert to their system defaults."
        confirmLabel="Reset to Default"
        destructive
        onConfirm={() => resetConfirm && handleReset(resetConfirm)}
      />

      <ConfirmDialog
        open={!!deleteBackupId}
        onOpenChange={(open) => !open && setDeleteBackupId(null)}
        title="Delete this backup entry?"
        description="This only removes the settings snapshot entry from this browser's history."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteBackup}
      />
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded-xl border border-border/80 bg-transparent p-1 transition-transform active:scale-95" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-10 text-sm" />
      </div>
    </div>
  )
}

function NumberingFormatRow({ label, config, onChange }: { label: string; config: NumberingFormatConfig; onChange: (config: NumberingFormatConfig) => void }) {
  const yearPart = config.includeYear ? (config.yearFormat === "YYYY" ? new Date().getFullYear().toString() : String(new Date().getFullYear()).slice(-2)) : null
  const preview = [config.prefix, yearPart, String(config.startingNumber).padStart(config.sequenceLength, "0")].filter(Boolean).join(config.separator)

  return (
    <div className="rounded-xl border border-border/60 bg-muted/5 p-4 space-y-4 shadow-sm">
      <p className="text-xs font-bold text-foreground/95 tracking-tight border-b border-border/30 pb-2">{label}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6 items-end">
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Prefix</Label>
          <Input className="h-9 text-xs" value={config.prefix} onChange={(e) => onChange({ ...config, prefix: e.target.value })} placeholder="Prefix" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Separator</Label>
          <Input className="h-9 text-xs" value={config.separator} onChange={(e) => onChange({ ...config, separator: e.target.value })} placeholder="Separator" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Seq Length</Label>
          <Input className="h-9 text-xs" type="number" value={config.sequenceLength} onChange={(e) => onChange({ ...config, sequenceLength: Number(e.target.value) })} placeholder="Sequence Length" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Start Num</Label>
          <Input className="h-9 text-xs" type="number" value={config.startingNumber} onChange={(e) => onChange({ ...config, startingNumber: Number(e.target.value) })} placeholder="Starting Number" />
        </div>
        <div className="flex h-9 items-center pb-1">
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground/90 cursor-pointer">
            <Switch checked={config.includeYear} onCheckedChange={(v) => onChange({ ...config, includeYear: v })} /> Include Year
          </label>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Year Format</Label>
          <CommandSelect
            size="sm"
            className="w-full h-9 text-xs bg-background border-border/80 hover:bg-accent/40 transition-all"
            value={config.yearFormat}
            onValueChange={(v) => onChange({ ...config, yearFormat: v as "YYYY" | "YY" })}
            disabled={!config.includeYear}
            options={[{ value: "YYYY", label: "YYYY" }, { value: "YY", label: "YY" }]}
            hideSearch
          />
        </div>
      </div>
      <div className="pt-2 border-t border-border/30">
        <p className="text-xs font-medium text-muted-foreground">
          Format Preview: <code className="font-bold text-foreground px-2 py-0.5 rounded bg-muted/65 border border-border/10 ml-1.5">{preview}</code>
        </p>
      </div>
    </div>
  )
}
