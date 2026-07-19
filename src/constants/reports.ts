import type { ReportCategory } from "@/features/reports/components/ReportPreviewDialog"

/** Maps each report name to its route, grouped by category. Shared by the Report Center's category cards and by breadcrumb generation. */
export const REPORT_ROUTES: Partial<Record<ReportCategory, Record<string, string>>> = {
  "Member Reports": {
    "Master List of Members": "/reports/members/master-list",
    "Active Members": "/reports/members/active",
    "Retired Members": "/reports/members/retired",
    "Members by Office": "/reports/members/by-office",
    "Members by Sex": "/reports/members/by-sex",
    "New Members": "/reports/members/new",
    "Incomplete Member Profiles": "/reports/members/incomplete",
  },
  "Contribution Reports": {
    "Monthly Contributions": "/reports/contributions/monthly",
    "Contributions by Office": "/reports/contributions/by-office",
    "Unpaid Contributions": "/reports/contributions/unpaid",
    "Member Contribution History": "/reports/contributions/member-history",
    "Payroll Deduction Summary": "/reports/contributions/payroll-summary",
  },
  "Loan Reports": {
    "Loan Applications": "/reports/loans/applications",
    "Approved Loans": "/reports/loans/approved",
    "Rejected Loans": "/reports/loans/rejected",
    "Released Loans": "/reports/loans/released",
    "Active Loans": "/reports/loans/active",
    "Fully Paid Loans": "/reports/loans/fully-paid",
    "Outstanding Balances": "/reports/loans/outstanding-balances",
    "Overdue Loans": "/reports/loans/overdue",
    "Loan Collections": "/reports/loans/collections",
    "Loan Aging Report": "/reports/loans/aging",
    "Member Loan Ledger": "/reports/loans/member-ledger",
  },
  "Benefit Reports": {
    "Benefit Applications": "/reports/benefits/applications",
    "Approved Benefits": "/reports/benefits/approved",
    "Released Benefits": "/reports/benefits/released",
    "Benefits by Type": "/reports/benefits/by-type",
    "Benefits by Office": "/reports/benefits/by-office",
    "Member Benefit History": "/reports/benefits/member-history",
  },
  "Financial Reports": {
    "Daily Collection Report": "/reports/financial/daily-collections",
    "Monthly Collection Report": "/reports/financial/monthly-collections",
    "Annual Collection Report": "/reports/financial/annual-collections",
    "Loan Release Summary": "/reports/financial/loan-release-summary",
    "Benefits Release Summary": "/reports/financial/benefits-release-summary",
    "Cash Flow Summary": "/reports/financial/cash-flow-summary",
  },
}
