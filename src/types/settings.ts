export interface GeneralSettings {
  systemName: string
  systemShortName: string
  defaultLanguage: string
  timeZone: string
  dateFormat: string
  currency: string
  fiscalYearStart: string
  recordsPerPage: number
  maintenanceMode: boolean
  enableAlertTranslations: boolean
}

export interface OrganizationProfileSettings {
  organizationName: string
  acronym: string
  address: string
  contactNumber: string
  email: string
  website: string
  logoFileName?: string
  citySealFileName?: string
  authorizedSignatoryName: string
  authorizedSignatoryPosition: string
  treasurerName: string
  presidentName: string
}

export interface NumberingFormatConfig {
  prefix: string
  includeYear: boolean
  yearFormat: "YYYY" | "YY"
  separator: string
  sequenceLength: number
  startingNumber: number
}

export interface NumberingFormatsSettings {
  member: NumberingFormatConfig
  loan: NumberingFormatConfig
  loanPayment: NumberingFormatConfig
  contribution: NumberingFormatConfig
  benefit: NumberingFormatConfig
  benefitRelease: NumberingFormatConfig
}

export interface ReloanPolicySettings {
  reloanEnabled: boolean
  reloanAllowAfterFullyPaid: boolean
  /** Schema-ready, functionally unsupported this phase — reloan-while-active always requires full settlement before submission regardless of this flag. */
  reloanAllowWhileActive: boolean
  reloanMinPaidInstallments: number | null
  reloanMinPaidPercentage: number | null
  reloanRequireNoOverdue: boolean
  reloanRequireNoPenalty: boolean
  reloanDeductPreviousBalance: boolean
  reloanMaxConcurrentActiveLoans: number
  reloanRequireNewPayslip: boolean
  reloanRequireNewAuthorization: boolean
  reloanRequireNewPromissoryNote: boolean
  reloanRequireFinalApproval: boolean
  reloanRequireBoardResolutionAboveLimit: boolean
}

export interface LoanSettings {
  /** Backend-enforced global floor for all loans — see settings.loan.update via loan-settings.service.ts. Not hardcoded in any frontend component. */
  minimumMembershipMonths: number
  requirePaidContributions: boolean
  minimumPaidContributionMonths: number
  requiredMonthlyDuesAmount: number
  requireConsecutiveContributionMonths: boolean
  applyContributionRuleToReloan: boolean
  defaultInterestMethod: string
  defaultInterestRate: number
  defaultProcessingFee: number
  defaultPenaltyRate: number
  gracePeriodDays: number
  maximumActiveLoans: number
  allowEligibilityOverride: boolean
  requireApproval: boolean
  requireReleaseConfirmation: boolean
  allowPartialPayment: boolean
  allowAdvancePayment: boolean
  allowLoanRestructuring: boolean
  defaultPaymentMethod: string
  roundingRule: string
  reloanPolicy: ReloanPolicySettings
}

export interface ContributionSettings {
  defaultMonthlyContribution: number
  /** GCGEA Cash Pabaon Program (Board Resolution 06-2024) — default monthly contribution amount. */
  defaultCashPabaonContribution: number
  contributionDueDay: number
  enableAutomaticFundAllocation: boolean
  requireAllocationValidation: boolean
  allowPartialContribution: boolean
  allowAdvanceContribution: boolean
  duplicateHandling: string
  defaultPaymentMethod: string
  contributionReminderEnabled: boolean
  /** If a member has an earlier voided Monthly Dues/Cash Pabaon period that hasn't been re-contributed (re-posted), block contributions for any later period for that member until it is resolved. */
  requireResolvedVoidedMonths: boolean
}

export interface BenefitSettings {
  requireApproval: boolean
  requireReleaseConfirmation: boolean
  allowEligibilityOverride: boolean
  defaultApprovalLimit: number
  defaultFrequencyLimit: string
  requireSupportingDocuments: boolean
  allowMultiplePendingApplications: boolean
  benefitYearResetMonth: string
  /** GCGEA Board Resolution No. 24-2026, Table 2 note — spouses who are both regular members each keep an independent right to all benefits, unaffected by the other spouse's membership status. */
  independentSpousalBenefitRights: boolean
}

export interface NotificationSettings {
  inAppNotifications: boolean
  emailNotifications: boolean
  smsNotifications: boolean
  loanApprovalAlerts: boolean
  loanDueDateAlerts: boolean
  overdueLoanAlerts: boolean
  benefitApprovalAlerts: boolean
  contributionImportAlerts: boolean
  incompleteProfileAlerts: boolean
  userAccountAlerts: boolean
}

export interface SecuritySettings {
  minimumPasswordLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumber: boolean
  requireSpecialCharacter: boolean
  sessionTimeoutMinutes: number
  maximumLoginAttempts: number
  lockoutDurationMinutes: number
  requirePasswordChangeOnFirstLogin: boolean
  enableTwoFactorAuth: boolean
  auditSensitiveActions: boolean
  confirmFinancialTransactions: boolean
}

export interface BackupSettings {
  automaticBackup: boolean
  backupFrequency: string
  retentionDays: number
  includeAttachments: boolean
}

export interface ReportTemplateSettings {
  countryLine: string
  organizationLine: string
  acronymLine: string
  addressLine: string
  leftLogo: string
  rightLogo: string
  showGeneratedDate: boolean
  categoryTemplates: Record<ReportTemplateCategory, ReportCategoryTemplate>
}

export type ReportTemplateCategory = "member" | "contribution" | "loan" | "benefit" | "financial"
export type ReportTemplatePreset = "classic" | "modern" | "compact"

export interface ReportTextStyle {
  fontFamily: "Arial" | "Georgia" | "Times New Roman" | "Courier New"
  fontSize: number
  fontWeight: "normal" | "bold"
  fontStyle: "normal" | "italic"
  textDecoration: "none" | "underline"
  textColor: string
  textAlignment: "left" | "center" | "right"
}

export interface ReportExportDesign {
  preset: ReportTemplatePreset
  primaryColor: string
  headerBackground: string
  bodyFontSize: number
  bodyFontFamily: "Arial" | "Georgia" | "Times New Roman" | "Courier New"
  bodyFontWeight: "normal" | "bold"
  bodyFontStyle: "normal" | "italic"
  bodyTextDecoration: "none" | "underline"
  bodyTextColor: string
  bodyTextAlignment: "left" | "center" | "right"
  stripedRows: boolean
  showBorders: boolean
  titleAlignment: "left" | "center"
  orientation: "portrait" | "landscape" | "auto"
  paperSize: "a4" | "letter" | "legal"
  captionText: string
  noteText: string
  captionStyle: ReportTextStyle
  noteStyle: ReportTextStyle
}

export interface ReportCategoryTemplate extends ReportExportDesign {
  excelTemplate: ReportExportDesign
}

export interface BackupHistoryEntry {
  id: string
  name: string
  date: string
  type: "Manual" | "Automatic"
  size: string
  status: "Completed" | "Failed"
  createdBy: string
}

export interface SystemSettings {
  general: GeneralSettings
  organization: OrganizationProfileSettings
  numbering: NumberingFormatsSettings
  loan: LoanSettings
  contribution: ContributionSettings
  benefit: BenefitSettings
  notification: NotificationSettings
  security: SecuritySettings
  backup: BackupSettings
  reportTemplate: ReportTemplateSettings
}

export interface AppearanceSettings {
  sidebarLogoUrl: string
  sidebarFooterLeftLogoUrl: string
  sidebarFooterLeftLogoLabel: string
  sidebarFooterRightLogoUrl: string
  sidebarFooterRightLogoLabel: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  sidebarColor: string
  backgroundColor: string
  progressColorStart: string
  progressColorMiddle: string
  progressColorEnd: string
  baseFontSize: number
  fontWeight: 400 | 500 | 600 | 700
  fontFamily: "century-gothic" | "arial" | "calibri" | "verdana" | "geist" | "system" | "serif" | "monospace"
  fontStyle: "normal" | "italic"
  borderRadius: number
  compactMode: boolean
  sidebarStyle: "expanded" | "collapsed"
  logoSize: "small" | "medium" | "large"
  loginBackground: "default" | "solid"
}
