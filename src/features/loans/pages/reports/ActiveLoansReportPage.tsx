import LoanStatusReportPage from "./LoanStatusReportPage"

export default function ActiveLoansReportPage() {
  return (
    <LoanStatusReportPage
      status="Active"
      title="Active Loans"
      description="Loans currently active and being repaid, filterable by office, loan type, and date."
    />
  )
}
