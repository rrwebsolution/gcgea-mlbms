import LoanStatusReportPage from "./LoanStatusReportPage"

export default function ApprovedLoansReportPage() {
  return (
    <LoanStatusReportPage
      status="Approved"
      title="Approved Loans"
      description="Loan applications that have been approved, filterable by office, loan type, and date."
    />
  )
}
