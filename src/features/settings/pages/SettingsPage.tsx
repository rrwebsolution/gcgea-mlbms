import * as React from "react"
import { toast } from "sonner"
import {
  Bell,
  Building2,
  DatabaseBackup,
  Download,
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
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  createMockBackup,
  deleteBackupEntry,
  downloadSettingsBackup,
  getAppearance,
  getBackupHistory,
  getSettings,
  resetAppearance,
  resetSettingsSection,
  restoreSettingsFromJson,
  saveAppearance,
  saveSettingsSection,
} from "@/services/settings.service"
import { useAuth } from "@/contexts/AuthContext"
import { formatDateTime } from "@/utils/format"
import type { AppearanceSettings, BackupHistoryEntry, NumberingFormatConfig, SystemSettings } from "@/types"

type SectionKey = "general" | "organization" | "numbering" | "loan" | "contribution" | "benefit" | "notification" | "security" | "backup" | "appearance"

const SECTIONS: { key: SectionKey; label: string; icon: typeof Settings2 }[] = [
  { key: "general", label: "General Settings", icon: Settings2 },
  { key: "organization", label: "Organization Profile", icon: Building2 },
  { key: "numbering", label: "Numbering Formats", icon: Hash },
  { key: "loan", label: "Loan Settings", icon: Landmark },
  { key: "contribution", label: "Contribution Settings", icon: Wallet },
  { key: "benefit", label: "Benefit Settings", icon: Gift },
  { key: "notification", label: "Notification Settings", icon: Bell },
  { key: "security", label: "Security Settings", icon: Shield },
  { key: "backup", label: "Backup Settings", icon: DatabaseBackup },
  { key: "appearance", label: "Appearance Settings", icon: Palette },
]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function ToggleField({ label, checked, onCheckedChange, description }: { label: string; checked: boolean; onCheckedChange: (v: boolean) => void; description?: string }) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
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
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onReset}>
          <RotateCcw /> Reset to Default
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="animate-spin" /> : <Save />} Save Changes
        </Button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [active, setActive] = React.useState<SectionKey>("general")
  const [settings, setSettings] = React.useState<SystemSettings>(() => getSettings())
  const [appearance, setAppearance] = React.useState<AppearanceSettings>(() => getAppearance())
  const [backupHistory, setBackupHistory] = React.useState<BackupHistoryEntry[]>(() => getBackupHistory())
  const [isSaving, setIsSaving] = React.useState(false)
  const [resetConfirm, setResetConfirm] = React.useState<SectionKey | null>(null)
  const [isCreatingBackup, setIsCreatingBackup] = React.useState(false)
  const [deleteBackupId, setDeleteBackupId] = React.useState<string | null>(null)
  const restoreInputRef = React.useRef<HTMLInputElement>(null)

  function patch<K extends keyof SystemSettings>(key: K, value: Partial<SystemSettings[K]>) {
    setSettings((prev) => ({ ...prev, [key]: { ...prev[key], ...value } }))
  }

  async function handleSave(key: SectionKey) {
    setIsSaving(true)
    try {
      if (key === "appearance") {
        await saveAppearance(appearance)
        document.documentElement.style.setProperty("--primary", appearance.primaryColor)
        document.documentElement.style.setProperty("--gold", appearance.accentColor)
        document.documentElement.style.setProperty("--sidebar", appearance.sidebarColor)
        document.documentElement.style.setProperty("--radius", `${appearance.borderRadius}px`)
      } else {
        await saveSettingsSection(key, settings[key])
      }
      toast.success(`${SECTIONS.find((s) => s.key === key)?.label} saved.`)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleReset(key: SectionKey) {
    if (key === "appearance") {
      const reset = await resetAppearance()
      setAppearance(reset)
    } else {
      const reset = await resetSettingsSection(key)
      setSettings(reset)
    }
    setResetConfirm(null)
    toast.info(`${SECTIONS.find((s) => s.key === key)?.label} reset to default.`)
  }

  async function handleCreateBackup() {
    if (!user) return
    setIsCreatingBackup(true)
    try {
      await createMockBackup(user.fullName, "Manual")
      setBackupHistory(getBackupHistory())
      toast.success("Mock backup created.")
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
    <div className="space-y-5 pb-10">
      <PageHeader title="System Settings" description="Configure GCGEA MLBMS behavior, numbering, policies, and appearance. All changes are saved locally to this browser." />

      <div className="flex flex-col gap-5 lg:flex-row">
        <nav className="lg:w-64 lg:shrink-0">
          <Select value={active} onValueChange={(v) => setActive((v ?? "general") as SectionKey)}>
            <SelectTrigger className="w-full lg:hidden"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SECTIONS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="hidden space-y-0.5 rounded-xl border border-border bg-card p-2 shadow-sm lg:block">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setActive(s.key)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  active === s.key ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                }`}
              >
                <s.icon className="size-4 shrink-0" />
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          {active === "general" && (
            <SectionShell title="General Settings" description="Core system identity and localization defaults." onSave={() => handleSave("general")} onReset={() => setResetConfirm("general")} isSaving={isSaving}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="System Name"><Input value={settings.general.systemName} onChange={(e) => patch("general", { systemName: e.target.value })} /></Field>
                <Field label="System Short Name"><Input value={settings.general.systemShortName} onChange={(e) => patch("general", { systemShortName: e.target.value })} /></Field>
                <Field label="Default Language"><Input value={settings.general.defaultLanguage} onChange={(e) => patch("general", { defaultLanguage: e.target.value })} /></Field>
                <Field label="Time Zone"><Input value={settings.general.timeZone} onChange={(e) => patch("general", { timeZone: e.target.value })} /></Field>
                <Field label="Date Format"><Input value={settings.general.dateFormat} onChange={(e) => patch("general", { dateFormat: e.target.value })} /></Field>
                <Field label="Currency"><Input value={settings.general.currency} onChange={(e) => patch("general", { currency: e.target.value })} /></Field>
                <Field label="Fiscal Year Start"><Input value={settings.general.fiscalYearStart} onChange={(e) => patch("general", { fiscalYearStart: e.target.value })} /></Field>
                <Field label="Records Per Page">
                  <Select value={String(settings.general.recordsPerPage)} onValueChange={(v) => patch("general", { recordsPerPage: Number(v ?? 10) })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                  </Select>
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
                <Field label="Organization Name"><Input value={settings.organization.organizationName} onChange={(e) => patch("organization", { organizationName: e.target.value })} /></Field>
                <Field label="Acronym"><Input value={settings.organization.acronym} onChange={(e) => patch("organization", { acronym: e.target.value })} /></Field>
                <Field label="Address"><Input value={settings.organization.address} onChange={(e) => patch("organization", { address: e.target.value })} /></Field>
                <Field label="Contact Number"><Input value={settings.organization.contactNumber} onChange={(e) => patch("organization", { contactNumber: e.target.value })} /></Field>
                <Field label="Email Address"><Input value={settings.organization.email} onChange={(e) => patch("organization", { email: e.target.value })} /></Field>
                <Field label="Website"><Input value={settings.organization.website} onChange={(e) => patch("organization", { website: e.target.value })} /></Field>
                <Field label="Authorized Signatory Name"><Input value={settings.organization.authorizedSignatoryName} onChange={(e) => patch("organization", { authorizedSignatoryName: e.target.value })} /></Field>
                <Field label="Authorized Signatory Position"><Input value={settings.organization.authorizedSignatoryPosition} onChange={(e) => patch("organization", { authorizedSignatoryPosition: e.target.value })} /></Field>
                <Field label="Treasurer Name"><Input value={settings.organization.treasurerName} onChange={(e) => patch("organization", { treasurerName: e.target.value })} /></Field>
                <Field label="President Name"><Input value={settings.organization.presidentName} onChange={(e) => patch("organization", { presidentName: e.target.value })} /></Field>
              </div>
              <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-center">
                <p className="mb-2 text-xs text-muted-foreground">Organization Logo / City Seal (mock upload — not sent anywhere)</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => toast.info("Logo upload is a mock action in this demo.")}><Upload /> Upload Logo</Button>
                  <Button variant="outline" size="sm" onClick={() => toast.info("City seal upload is a mock action in this demo.")}><Upload /> Upload City Seal</Button>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-center">
                <p className="text-xs text-muted-foreground">Document Header Preview</p>
                <p className="mt-1 font-heading text-sm font-semibold text-foreground">{settings.organization.organizationName}</p>
                <p className="text-xs text-muted-foreground">{settings.organization.address}</p>
                <p className="text-xs text-muted-foreground">{settings.organization.contactNumber} · {settings.organization.email}</p>
              </div>
            </SectionShell>
          )}

          {active === "numbering" && (
            <SectionShell title="Numbering Formats" description="Configure the reference number format for each document type." onSave={() => handleSave("numbering")} onReset={() => setResetConfirm("numbering")} isSaving={isSaving}>
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
            <SectionShell title="Loan Settings" description="Default policy values applied when creating new loan types and applications." onSave={() => handleSave("loan")} onReset={() => setResetConfirm("loan")} isSaving={isSaving}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Default Interest Method">
                  <Select value={settings.loan.defaultInterestMethod} onValueChange={(v) => patch("loan", { defaultInterestMethod: v ?? "" })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Flat Interest", "Diminishing Balance", "Zero Interest", "Custom"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Default Interest Rate (%/mo)"><Input type="number" step="0.01" value={settings.loan.defaultInterestRate} onChange={(e) => patch("loan", { defaultInterestRate: Number(e.target.value) })} /></Field>
                <Field label="Default Processing Fee (₱)"><Input type="number" value={settings.loan.defaultProcessingFee} onChange={(e) => patch("loan", { defaultProcessingFee: Number(e.target.value) })} /></Field>
                <Field label="Default Penalty Rate (%)"><Input type="number" step="0.01" value={settings.loan.defaultPenaltyRate} onChange={(e) => patch("loan", { defaultPenaltyRate: Number(e.target.value) })} /></Field>
                <Field label="Grace Period (Days)"><Input type="number" value={settings.loan.gracePeriodDays} onChange={(e) => patch("loan", { gracePeriodDays: Number(e.target.value) })} /></Field>
                <Field label="Maximum Active Loans"><Input type="number" value={settings.loan.maximumActiveLoans} onChange={(e) => patch("loan", { maximumActiveLoans: Number(e.target.value) })} /></Field>
                <Field label="Default Payment Method">
                  <Select value={settings.loan.defaultPaymentMethod} onValueChange={(v) => patch("loan", { defaultPaymentMethod: v ?? "" })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Payroll Deduction", "Cash", "Bank Transfer", "Check"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Rounding Rule"><Input value={settings.loan.roundingRule} onChange={(e) => patch("loan", { roundingRule: e.target.value })} /></Field>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ToggleField label="Allow Eligibility Override" checked={settings.loan.allowEligibilityOverride} onCheckedChange={(v) => patch("loan", { allowEligibilityOverride: v })} />
                <ToggleField label="Require Approval" checked={settings.loan.requireApproval} onCheckedChange={(v) => patch("loan", { requireApproval: v })} />
                <ToggleField label="Require Release Confirmation" checked={settings.loan.requireReleaseConfirmation} onCheckedChange={(v) => patch("loan", { requireReleaseConfirmation: v })} />
                <ToggleField label="Allow Partial Payment" checked={settings.loan.allowPartialPayment} onCheckedChange={(v) => patch("loan", { allowPartialPayment: v })} />
                <ToggleField label="Allow Advance Payment" checked={settings.loan.allowAdvancePayment} onCheckedChange={(v) => patch("loan", { allowAdvancePayment: v })} />
                <ToggleField label="Allow Loan Restructuring" checked={settings.loan.allowLoanRestructuring} onCheckedChange={(v) => patch("loan", { allowLoanRestructuring: v })} />
              </div>
            </SectionShell>
          )}

          {active === "contribution" && (
            <SectionShell title="Contribution Settings" description="Default values used across the contribution and payroll import modules." onSave={() => handleSave("contribution")} onReset={() => setResetConfirm("contribution")} isSaving={isSaving}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Default Monthly Contribution (₱)"><Input type="number" value={settings.contribution.defaultMonthlyContribution} onChange={(e) => patch("contribution", { defaultMonthlyContribution: Number(e.target.value) })} /></Field>
                <Field label="Contribution Due Day"><Input type="number" min={1} max={31} value={settings.contribution.contributionDueDay} onChange={(e) => patch("contribution", { contributionDueDay: Number(e.target.value) })} /></Field>
                <Field label="Duplicate Handling">
                  <Select value={settings.contribution.duplicateHandling} onValueChange={(v) => patch("contribution", { duplicateHandling: v ?? "" })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Skip duplicates", "Flag for review", "Replace existing"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Default Payment Method">
                  <Select value={settings.contribution.defaultPaymentMethod} onValueChange={(v) => patch("contribution", { defaultPaymentMethod: v ?? "" })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Payroll Deduction", "Cash", "Bank Transfer", "Check"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ToggleField label="Allow Partial Contribution" checked={settings.contribution.allowPartialContribution} onCheckedChange={(v) => patch("contribution", { allowPartialContribution: v })} />
                <ToggleField label="Allow Advance Contribution" checked={settings.contribution.allowAdvanceContribution} onCheckedChange={(v) => patch("contribution", { allowAdvanceContribution: v })} />
                <ToggleField label="Payroll Import Enabled" checked={settings.contribution.payrollImportEnabled} onCheckedChange={(v) => patch("contribution", { payrollImportEnabled: v })} />
                <ToggleField label="Require Payroll Reference" checked={settings.contribution.requirePayrollReference} onCheckedChange={(v) => patch("contribution", { requirePayrollReference: v })} />
                <ToggleField label="Contribution Reminder Enabled" checked={settings.contribution.contributionReminderEnabled} onCheckedChange={(v) => patch("contribution", { contributionReminderEnabled: v })} />
              </div>
            </SectionShell>
          )}

          {active === "benefit" && (
            <SectionShell title="Benefit Settings" description="Default policy values applied to benefit types and applications." onSave={() => handleSave("benefit")} onReset={() => setResetConfirm("benefit")} isSaving={isSaving}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Default Approval Limit (₱)"><Input type="number" value={settings.benefit.defaultApprovalLimit} onChange={(e) => patch("benefit", { defaultApprovalLimit: Number(e.target.value) })} /></Field>
                <Field label="Default Frequency Limit"><Input value={settings.benefit.defaultFrequencyLimit} onChange={(e) => patch("benefit", { defaultFrequencyLimit: e.target.value })} /></Field>
                <Field label="Benefit Year Reset Month"><Input value={settings.benefit.benefitYearResetMonth} onChange={(e) => patch("benefit", { benefitYearResetMonth: e.target.value })} /></Field>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ToggleField label="Require Approval" checked={settings.benefit.requireApproval} onCheckedChange={(v) => patch("benefit", { requireApproval: v })} />
                <ToggleField label="Require Release Confirmation" checked={settings.benefit.requireReleaseConfirmation} onCheckedChange={(v) => patch("benefit", { requireReleaseConfirmation: v })} />
                <ToggleField label="Allow Eligibility Override" checked={settings.benefit.allowEligibilityOverride} onCheckedChange={(v) => patch("benefit", { allowEligibilityOverride: v })} />
                <ToggleField label="Require Supporting Documents" checked={settings.benefit.requireSupportingDocuments} onCheckedChange={(v) => patch("benefit", { requireSupportingDocuments: v })} />
                <ToggleField label="Allow Multiple Pending Applications" checked={settings.benefit.allowMultiplePendingApplications} onCheckedChange={(v) => patch("benefit", { allowMultiplePendingApplications: v })} />
              </div>
            </SectionShell>
          )}

          {active === "notification" && (
            <SectionShell title="Notification Settings" description="Control which in-app alerts are generated across the system." onSave={() => handleSave("notification")} onReset={() => setResetConfirm("notification")} isSaving={isSaving}>
              <AlertBanner tone="info" title="Frontend-only notifications" description="Email and SMS delivery will require backend integration in a future phase." className="mb-4" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ToggleField label="In-App Notifications" checked={settings.notification.inAppNotifications} onCheckedChange={(v) => patch("notification", { inAppNotifications: v })} />
                <ToggleField label="Email Notifications" checked={settings.notification.emailNotifications} onCheckedChange={(v) => patch("notification", { emailNotifications: v })} />
                <ToggleField label="SMS Notifications" checked={settings.notification.smsNotifications} onCheckedChange={(v) => patch("notification", { smsNotifications: v })} />
                <ToggleField label="Loan Approval Alerts" checked={settings.notification.loanApprovalAlerts} onCheckedChange={(v) => patch("notification", { loanApprovalAlerts: v })} />
                <ToggleField label="Loan Due Date Alerts" checked={settings.notification.loanDueDateAlerts} onCheckedChange={(v) => patch("notification", { loanDueDateAlerts: v })} />
                <ToggleField label="Overdue Loan Alerts" checked={settings.notification.overdueLoanAlerts} onCheckedChange={(v) => patch("notification", { overdueLoanAlerts: v })} />
                <ToggleField label="Benefit Approval Alerts" checked={settings.notification.benefitApprovalAlerts} onCheckedChange={(v) => patch("notification", { benefitApprovalAlerts: v })} />
                <ToggleField label="Contribution Import Alerts" checked={settings.notification.contributionImportAlerts} onCheckedChange={(v) => patch("notification", { contributionImportAlerts: v })} />
                <ToggleField label="Incomplete Member Profile Alerts" checked={settings.notification.incompleteProfileAlerts} onCheckedChange={(v) => patch("notification", { incompleteProfileAlerts: v })} />
                <ToggleField label="User Account Alerts" checked={settings.notification.userAccountAlerts} onCheckedChange={(v) => patch("notification", { userAccountAlerts: v })} />
              </div>
            </SectionShell>
          )}

          {active === "security" && (
            <SectionShell title="Security Settings" description="Password policy and session security preferences." onSave={() => handleSave("security")} onReset={() => setResetConfirm("security")} isSaving={isSaving}>
              <AlertBanner tone="info" title="Frontend-only enforcement" description="Actual enforcement of these policies will require backend integration in a future phase." className="mb-4" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Minimum Password Length"><Input type="number" value={settings.security.minimumPasswordLength} onChange={(e) => patch("security", { minimumPasswordLength: Number(e.target.value) })} /></Field>
                <Field label="Session Timeout (Minutes)"><Input type="number" value={settings.security.sessionTimeoutMinutes} onChange={(e) => patch("security", { sessionTimeoutMinutes: Number(e.target.value) })} /></Field>
                <Field label="Maximum Login Attempts"><Input type="number" value={settings.security.maximumLoginAttempts} onChange={(e) => patch("security", { maximumLoginAttempts: Number(e.target.value) })} /></Field>
                <Field label="Lockout Duration (Minutes)"><Input type="number" value={settings.security.lockoutDurationMinutes} onChange={(e) => patch("security", { lockoutDurationMinutes: Number(e.target.value) })} /></Field>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ToggleField label="Require Uppercase Letter" checked={settings.security.requireUppercase} onCheckedChange={(v) => patch("security", { requireUppercase: v })} />
                <ToggleField label="Require Lowercase Letter" checked={settings.security.requireLowercase} onCheckedChange={(v) => patch("security", { requireLowercase: v })} />
                <ToggleField label="Require Number" checked={settings.security.requireNumber} onCheckedChange={(v) => patch("security", { requireNumber: v })} />
                <ToggleField label="Require Special Character" checked={settings.security.requireSpecialCharacter} onCheckedChange={(v) => patch("security", { requireSpecialCharacter: v })} />
                <ToggleField label="Require Password Change on First Login" checked={settings.security.requirePasswordChangeOnFirstLogin} onCheckedChange={(v) => patch("security", { requirePasswordChangeOnFirstLogin: v })} />
                <ToggleField label="Enable Two-Factor Authentication" description="Placeholder toggle — full 2FA requires backend integration." checked={settings.security.enableTwoFactorAuth} onCheckedChange={(v) => patch("security", { enableTwoFactorAuth: v })} />
                <ToggleField label="Audit Sensitive Actions" checked={settings.security.auditSensitiveActions} onCheckedChange={(v) => patch("security", { auditSensitiveActions: v })} />
                <ToggleField label="Confirm Financial Transactions" checked={settings.security.confirmFinancialTransactions} onCheckedChange={(v) => patch("security", { confirmFinancialTransactions: v })} />
              </div>
            </SectionShell>
          )}

          {active === "backup" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <AlertBanner tone="warning" title="Frontend simulation only" description="No real database backup occurs here — this demonstrates the workflow using local browser storage." className="mb-4" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Backup Frequency">
                    <Select value={settings.backup.backupFrequency} onValueChange={(v) => patch("backup", { backupFrequency: v ?? "" })}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Hourly", "Daily", "Weekly", "Monthly"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Retention (Days)"><Input type="number" value={settings.backup.retentionDays} onChange={(e) => patch("backup", { retentionDays: Number(e.target.value) })} /></Field>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ToggleField label="Automatic Backup" checked={settings.backup.automaticBackup} onCheckedChange={(v) => patch("backup", { automaticBackup: v })} />
                  <ToggleField label="Include Attachments" checked={settings.backup.includeAttachments} onCheckedChange={(v) => patch("backup", { includeAttachments: v })} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={handleCreateBackup} disabled={isCreatingBackup}>
                    {isCreatingBackup ? <Loader2 className="animate-spin" /> : <DatabaseBackup />} Create Mock Backup
                  </Button>
                  <Button variant="outline" onClick={downloadSettingsBackup}>
                    <Download /> Download Settings Backup
                  </Button>
                  <Button variant="outline" onClick={() => restoreInputRef.current?.click()}>
                    <Upload /> Restore from JSON
                  </Button>
                  <input ref={restoreInputRef} type="file" accept="application/json" className="hidden" onChange={handleRestoreFile} />
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold text-foreground">Backup History</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Backup Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backupHistory.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium text-foreground">{b.name}</TableCell>
                        <TableCell>{formatDateTime(b.date)}</TableCell>
                        <TableCell>{b.type}</TableCell>
                        <TableCell>{b.size}</TableCell>
                        <TableCell><StatusBadge label={b.status} tone={b.status === "Completed" ? "success" : "danger"} /></TableCell>
                        <TableCell>{b.createdBy}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={downloadSettingsBackup} aria-label="Download backup"><Download /></Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => toast.info("Restoring this snapshot is a mock action in this demo.")} aria-label="Restore backup"><RotateCcw /></Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => setDeleteBackupId(b.id)} aria-label="Delete backup"><Trash2 /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {active === "appearance" && (
            <SectionShell title="Appearance Settings" description="Theme colors and layout defaults. Combine with the Light/Dark/System selector in the top navigation." onSave={() => handleSave("appearance")} onReset={() => setResetConfirm("appearance")} isSaving={isSaving}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ColorField label="Primary Color" value={appearance.primaryColor} onChange={(v) => setAppearance((prev) => ({ ...prev, primaryColor: v }))} />
                <ColorField label="Secondary Color" value={appearance.secondaryColor} onChange={(v) => setAppearance((prev) => ({ ...prev, secondaryColor: v }))} />
                <ColorField label="Accent Color" value={appearance.accentColor} onChange={(v) => setAppearance((prev) => ({ ...prev, accentColor: v }))} />
                <ColorField label="Sidebar Color" value={appearance.sidebarColor} onChange={(v) => setAppearance((prev) => ({ ...prev, sidebarColor: v }))} />
                <ColorField label="Background Color" value={appearance.backgroundColor} onChange={(v) => setAppearance((prev) => ({ ...prev, backgroundColor: v }))} />
                <Field label="Border Radius (px)"><Input type="number" value={appearance.borderRadius} onChange={(e) => setAppearance((prev) => ({ ...prev, borderRadius: Number(e.target.value) }))} /></Field>
                <Field label="Sidebar Style">
                  <Select value={appearance.sidebarStyle} onValueChange={(v) => setAppearance((prev) => ({ ...prev, sidebarStyle: (v ?? "expanded") as AppearanceSettings["sidebarStyle"] }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expanded">Expanded</SelectItem>
                      <SelectItem value="collapsed">Collapsed</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Logo Size">
                  <Select value={appearance.logoSize} onValueChange={(v) => setAppearance((prev) => ({ ...prev, logoSize: (v ?? "medium") as AppearanceSettings["logoSize"] }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="mt-4">
                <ToggleField label="Compact Mode" description="Reduce padding across tables and cards." checked={appearance.compactMode} onCheckedChange={(v) => setAppearance((prev) => ({ ...prev, compactMode: v }))} />
              </div>

              <div className="mt-5 rounded-xl border border-border p-4" style={{ borderRadius: appearance.borderRadius }}>
                <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Live Preview</p>
                <div className="overflow-hidden rounded-lg border" style={{ borderRadius: appearance.borderRadius }}>
                  <div className="flex items-center justify-between px-4 py-2.5 text-sm font-medium text-white" style={{ backgroundColor: appearance.sidebarColor }}>
                    <span>GCGEA-MLBMS</span>
                    <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: appearance.accentColor, color: "#1a1200" }}>Admin</span>
                  </div>
                  <div className="space-y-3 p-4" style={{ backgroundColor: appearance.backgroundColor }}>
                    <div className="flex gap-2">
                      <span className="rounded-md px-3 py-1.5 text-xs font-medium text-white" style={{ backgroundColor: appearance.primaryColor, borderRadius: appearance.borderRadius }}>Primary Button</span>
                      <span className="rounded-md px-3 py-1.5 text-xs font-medium text-white" style={{ backgroundColor: appearance.secondaryColor, borderRadius: appearance.borderRadius }}>Secondary</span>
                    </div>
                    <div className="rounded-lg border border-black/10 bg-white p-3 text-xs text-slate-700" style={{ borderRadius: appearance.borderRadius }}>
                      Sample card content on the configured background color.
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
        description="This only removes the entry from the mock backup history."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteBackup}
      />
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  )
}

function NumberingFormatRow({ label, config, onChange }: { label: string; config: NumberingFormatConfig; onChange: (config: NumberingFormatConfig) => void }) {
  const yearPart = config.includeYear ? (config.yearFormat === "YYYY" ? new Date().getFullYear().toString() : String(new Date().getFullYear()).slice(-2)) : null
  const preview = [config.prefix, yearPart, String(config.startingNumber).padStart(config.sequenceLength, "0")].filter(Boolean).join(config.separator)

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <Input className="col-span-2 sm:col-span-1" value={config.prefix} onChange={(e) => onChange({ ...config, prefix: e.target.value })} placeholder="Prefix" />
        <Input value={config.separator} onChange={(e) => onChange({ ...config, separator: e.target.value })} placeholder="Separator" />
        <Input type="number" value={config.sequenceLength} onChange={(e) => onChange({ ...config, sequenceLength: Number(e.target.value) })} placeholder="Sequence Length" />
        <Input type="number" value={config.startingNumber} onChange={(e) => onChange({ ...config, startingNumber: Number(e.target.value) })} placeholder="Starting Number" />
        <label className="flex items-center gap-1.5 text-xs text-foreground">
          <Switch checked={config.includeYear} onCheckedChange={(v) => onChange({ ...config, includeYear: v })} /> Include Year
        </label>
        <Select value={config.yearFormat} onValueChange={(v) => onChange({ ...config, yearFormat: (v ?? "YYYY") as "YYYY" | "YY" })} disabled={!config.includeYear}>
          <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="YYYY">YYYY</SelectItem>
            <SelectItem value="YY">YY</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Preview: <code className="font-medium text-foreground">{preview}</code>
      </p>
    </div>
  )
}
