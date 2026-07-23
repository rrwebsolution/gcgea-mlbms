import LoanStatusReportPage from "./LoanStatusReportPage"

export default function ActiveLoansReportPage() {
  return (
    <LoanStatusReportPage
      statuses={["Active", "Released"]}
      title="Active Loans"
      description="New loans and reloans that are released or currently active and being repaid."
    />
  )
}
