export const ORGANIZATION = {
  name: "Gingoog City Government Employees Association",
  acronym: "GCGEA",
  systemName: "Membership, Loan and Benefits Management System",
  systemShortName: "GCGEA MLBMS",
  address: "GCGEA Office, Gingoog City Hall, Gingoog City, Misamis Oriental",
  contactNumber: "(088) 861-0000",
  email: "gcgea.office@gingoog.gov.ph",
  /** Public path to the official GCGEA logo. Reuse this everywhere instead of hardcoding "/logo.png". */
  logoPath: "/logo.png",
} as const

/** Convenience alias for call sites that only need the logo path. */
export const GCGEA_LOGO_PATH = ORGANIZATION.logoPath

export const NUMBERING_FORMATS = {
  member: "GCGEA-MEM-000001",
  loan: "GCGEA-LN-2026-000001",
  payment: "GCGEA-PAY-2026-000001",
  benefit: "GCGEA-BEN-2026-000001",
  contribution: "GCGEA-CON-2026-000001",
} as const
