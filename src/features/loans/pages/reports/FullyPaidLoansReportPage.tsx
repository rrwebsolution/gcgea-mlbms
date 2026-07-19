import LoanStatusReportPage from "./LoanStatusReportPage"

export default function FullyPaidLoansReportPage() {
  return (
    <LoanStatusReportPage
      status="Fully Paid"
      title="Fully Paid Loans"
      description="Loans that have been fully paid off by members, filterable by office, loan type, and date."
    />
  )
}
