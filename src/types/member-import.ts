/**
 * Field keys mirror the backend's MemberColumnMapper::TARGET_FIELDS exactly
 * (snake_case, not camelCase) since the mapping object passes through to the
 * API verbatim. AGE/years-in-service/length-of-membership are display-only
 * comparison fields — the system always recomputes these and never stores
 * the sheet's value as authoritative.
 */
export type MemberTargetField =
  | "source_submitted_at"
  | "email"
  | "membership_type_raw"
  | "last_name"
  | "first_name"
  | "middle_name"
  | "office_name_raw"
  | "position"
  | "permanent_address"
  | "birthdate"
  | "age_display"
  | "date_of_regular_appointment"
  | "years_in_service_display"
  | "beneficiary_1"
  | "beneficiary_2"
  | "cellphone_number"
  | "sex"
  | "name_of_spouse"
  | "membership_date"
  | "length_of_membership_display"
  | "retiree_status_raw"
  | "cash_pabaon"
  | "loan_start"
  | "solidarity_assistance_loan"
  | "no_of_months"
  | "monthly_amort"
  | "legacy_notes"

export type MemberColumnMapping = Partial<Record<MemberTargetField, string | null>>

export interface MemberImportWorksheet {
  name: string
  index: number
  totalRows: number
  totalColumns: number
}

export interface MemberImportUploadResponse {
  token: string
  sourceFileExt: "xlsx" | "xls" | "csv"
  worksheets: MemberImportWorksheet[]
}

export interface MemberImportSheetResponse {
  token: string
  targetFields: Record<MemberTargetField, string>
  requiredFields: MemberTargetField[]
  headerRowIndex: number
  headers: string[]
  detectedMapping: MemberColumnMapping
  unmatchedHeaders: string[]
  sampleRows: Record<string, string | number | null>[]
  totalRows: number
}

export interface MemberLegacyLoanFields {
  cash_pabaon: string | null
  cash_pabaon_amount: number | null
  loan_start: string | null
  loan_start_date: string | null
  solidarity_assistance_loan: string | null
  solidarity_assistance_loan_amount: number | null
  no_of_months: string | null
  no_of_months_parsed: number | null
  monthly_amort: string | null
  monthly_amort_amount: number | null
  legacy_notes: string | null
}

export interface MemberImportRowData {
  last_name: string | null
  first_name: string | null
  middle_name: string | null
  sex: string | null
  birthdate: string | null
  computed_age: number | null
  sheet_age: number | null
  permanent_address: string | null
  cellphone_number: string | null
  email: string | null
  name_of_spouse: string | null
  position: string | null
  office_name_raw: string | null
  resolved_office_name: string | null
  date_of_regular_appointment: string | null
  computed_service_years: number | null
  sheet_service_years: number | null
  membership_type_raw: string | null
  membership_date: string | null
  computed_membership_years: number | null
  sheet_membership_years: number | null
  retiree_status: string
  beneficiary_1: string | null
  beneficiary_2: string | null
  legacy_loan_status: "No legacy loan information" | "Partial legacy loan information" | "Complete legacy loan information"
  legacy_loan: MemberLegacyLoanFields
  source_submitted_at: string | null
}

export interface MemberDuplicateCandidate {
  memberId: string
  score: number
  matchedFields: string[]
}

export type MemberValidationCategory = "New" | "Exact" | "Probable" | "Possible" | "Invalid"

export interface MemberImportRowResult {
  rowNumber: number
  category: MemberValidationCategory
  reasons: string[]
  duplicateScore: number
  duplicateCandidates: MemberDuplicateCandidate[]
  resolvedOfficeId: number | null
  unresolvedOfficeText: string | null
  data: MemberImportRowData
  resolvedAction?: string | null
  rowStatus?: string
  createdMemberId?: string | null
}

export interface MemberImportPreviewSummary {
  total: number
  new: number
  exact: number
  probable: number
  possible: number
  invalid: number
}

export interface UnresolvedOfficeGroup {
  rawText: string
  normalizedText: string
  rowCount: number
  rowNumbers: number[]
}

export interface MemberImportPreviewResponse {
  token: string
  rows: MemberImportRowResult[]
  summary: MemberImportPreviewSummary
  unresolvedOffices: UnresolvedOfficeGroup[]
}

export interface MemberImportResolveOfficeResponse {
  token: string
  rowsResolved: number
  unresolvedOffices: UnresolvedOfficeGroup[]
}

export interface MemberImportCommitSummary {
  totalRows: number
  membersCreated: number
  membersMerged: number
  membersSkipped: number
  invalidRows: number
  beneficiariesCreated: number
  legacyLoanDraftsCreated: number
  failedRows: number
  pendingReview: number
}

export interface MemberImportCommitResponse {
  token: string
  summary: MemberImportCommitSummary
}

export interface MemberImportBatchSummary {
  id: string
  token: string
  originalFilename: string
  sourceFileExt: "xlsx" | "xls" | "csv"
  uploadedBy: string | null
  importDate: string
  totalRows: number
  importedRows: number
  pendingReviewRows: number
  skippedRows: number
  errorRows: number
  legacyLoanFlaggedRows: number
  status: "Uploaded" | "SheetSelected" | "Mapped" | "Previewed" | "Committed"
  committedBy: string | null
  committedAt: string | null
}

export interface MemberLegacyLoanRecord {
  id: string
  memberImportRowId: string
  createdMemberId: string | null
  cashPabaon: string | null
  cashPabaonAmount: number | null
  loanStart: string | null
  loanStartDate: string | null
  solidarityAssistanceLoan: string | null
  solidarityAssistanceLoanAmount: number | null
  noOfMonths: string | null
  noOfMonthsParsed: number | null
  monthlyAmort: string | null
  monthlyAmortAmount: number | null
  legacyNotes: string | null
  reviewStatus: "Unreviewed" | "Reviewed" | "Dismissed"
}

export interface MemberImportBatchDetail extends MemberImportBatchSummary {
  selectedSheetName: string | null
  columnMapping: MemberColumnMapping
  legacyLoans: MemberLegacyLoanRecord[]
  rows: MemberImportRowResult[]
}
