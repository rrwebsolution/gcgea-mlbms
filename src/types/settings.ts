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

export interface LoanSettings {
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
}

export interface ContributionSettings {
  defaultMonthlyContribution: number
  contributionDueDay: number
  allowPartialContribution: boolean
  allowAdvanceContribution: boolean
  payrollImportEnabled: boolean
  duplicateHandling: string
  defaultPaymentMethod: string
  requirePayrollReference: boolean
  contributionReminderEnabled: boolean
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
}

export interface AppearanceSettings {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  sidebarColor: string
  backgroundColor: string
  borderRadius: number
  compactMode: boolean
  sidebarStyle: "expanded" | "collapsed"
  logoSize: "small" | "medium" | "large"
  loginBackground: "default" | "solid"
}
