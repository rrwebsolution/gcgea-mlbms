import { Navigate, Route, Routes } from "react-router-dom"
import { AppLayout } from "@/layouts/AppLayout"
import { ProtectedRoute } from "@/routes/ProtectedRoute"
import UnauthorizedPage from "@/pages/UnauthorizedPage"

import LoginPage from "@/features/auth/pages/LoginPage"
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage"
import ResetPasswordPage from "@/features/auth/pages/ResetPasswordPage"
import ChangePasswordPage from "@/features/auth/pages/ChangePasswordPage"

import DashboardPage from "@/features/dashboard/pages/DashboardPage"
import DraftCenterPage from "@/features/drafts/pages/DraftCenterPage"

import MembersPage from "@/features/members/pages/MembersPage"
import MemberRegistrationPage from "@/features/members/pages/MemberRegistrationPage"
import MemberProfilePage from "@/features/members/pages/MemberProfilePage"
import MemberImportWizardPage from "@/features/members/pages/MemberImportWizardPage"
import IncompleteProfilesPage from "@/features/members/pages/IncompleteProfilesPage"
import ArchivedMembersPage from "@/features/members/pages/ArchivedMembersPage"
import MemberDraftsPage from "@/features/members/pages/MemberDraftsPage"
import MasterListOfMembersReportPage from "@/features/members/pages/reports/MasterListOfMembersReportPage"
import ActiveMembersReportPage from "@/features/members/pages/reports/ActiveMembersReportPage"
import RetiredMembersReportPage from "@/features/members/pages/reports/RetiredMembersReportPage"
import MembersByOfficeReportPage from "@/features/members/pages/reports/MembersByOfficeReportPage"
import MembersBySexReportPage from "@/features/members/pages/reports/MembersBySexReportPage"
import NewMembersReportPage from "@/features/members/pages/reports/NewMembersReportPage"
import IncompleteMemberProfilesReportPage from "@/features/members/pages/reports/IncompleteMemberProfilesReportPage"

import OfficesPage from "@/features/offices/pages/OfficesPage"

import ContributionsPage from "@/features/contributions/pages/ContributionsPage"
import ContributionFormPage from "@/features/contributions/pages/ContributionFormPage"
import ContributionDetailPage from "@/features/contributions/pages/ContributionDetailPage"
import BulkContributionsPage from "@/features/contributions/pages/BulkContributionsPage"
import PayrollImportPage from "@/features/contributions/pages/PayrollImportPage"
import ContributionReportsPage from "@/features/contributions/pages/ContributionReportsPage"
import MonthlyContributionsReportPage from "@/features/contributions/pages/reports/MonthlyContributionsReportPage"
import ContributionsByOfficeReportPage from "@/features/contributions/pages/reports/ContributionsByOfficeReportPage"
import UnpaidContributionsReportPage from "@/features/contributions/pages/reports/UnpaidContributionsReportPage"
import MemberContributionHistoryReportPage from "@/features/contributions/pages/reports/MemberContributionHistoryReportPage"
import PayrollDeductionSummaryReportPage from "@/features/contributions/pages/reports/PayrollDeductionSummaryReportPage"

import LoansPage from "@/features/loans/pages/LoansPage"
import ActiveLoansPage from "@/features/loans/pages/ActiveLoansPage"
import OverdueLoansPage from "@/features/loans/pages/OverdueLoansPage"
import LoanTypesPage from "@/features/loans/pages/LoanTypesPage"
import LoanDetailPage from "@/features/loans/pages/LoanDetailPage"
import CreateLoanApplicationPage from "@/features/loans/pages/CreateLoanApplicationPage"
import LoanDraftsPage from "@/features/loans/pages/LoanDraftsPage"
import LoanApplicationsReportPage from "@/features/loans/pages/reports/LoanApplicationsReportPage"
import ApprovedLoansReportPage from "@/features/loans/pages/reports/ApprovedLoansReportPage"
import RejectedLoansReportPage from "@/features/loans/pages/reports/RejectedLoansReportPage"
import ReleasedLoansReportPage from "@/features/loans/pages/reports/ReleasedLoansReportPage"
import ActiveLoansReportPage from "@/features/loans/pages/reports/ActiveLoansReportPage"
import FullyPaidLoansReportPage from "@/features/loans/pages/reports/FullyPaidLoansReportPage"
import OutstandingBalancesReportPage from "@/features/loans/pages/reports/OutstandingBalancesReportPage"
import OverdueLoansReportPage from "@/features/loans/pages/reports/OverdueLoansReportPage"
import LoanCollectionsReportPage from "@/features/loans/pages/reports/LoanCollectionsReportPage"
import LoanAgingReportPage from "@/features/loans/pages/reports/LoanAgingReportPage"
import MemberLoanLedgerReportPage from "@/features/loans/pages/reports/MemberLoanLedgerReportPage"

import LoanPaymentsPage from "@/features/loan-payments/pages/LoanPaymentsPage"
import CreateLoanPaymentPage from "@/features/loan-payments/pages/CreateLoanPaymentPage"

import BenefitsPage from "@/features/benefits/pages/BenefitsPage"
import ReleasedBenefitsPage from "@/features/benefits/pages/ReleasedBenefitsPage"
import BenefitTypesPage from "@/features/benefits/pages/BenefitTypesPage"
import BenefitDetailPage from "@/features/benefits/pages/BenefitDetailPage"
import CreateBenefitApplicationPage from "@/features/benefits/pages/CreateBenefitApplicationPage"
import BenefitDraftsPage from "@/features/benefits/pages/BenefitDraftsPage"
import BenefitApplicationsReportPage from "@/features/benefits/pages/reports/BenefitApplicationsReportPage"
import ApprovedBenefitsReportPage from "@/features/benefits/pages/reports/ApprovedBenefitsReportPage"
import ReleasedBenefitsReportPage from "@/features/benefits/pages/reports/ReleasedBenefitsReportPage"
import BenefitsByTypeReportPage from "@/features/benefits/pages/reports/BenefitsByTypeReportPage"
import BenefitsByOfficeReportPage from "@/features/benefits/pages/reports/BenefitsByOfficeReportPage"
import MemberBenefitHistoryReportPage from "@/features/benefits/pages/reports/MemberBenefitHistoryReportPage"

import ReportsPage from "@/features/reports/pages/ReportsPage"
import DailyCollectionReportPage from "@/features/financial/pages/reports/DailyCollectionReportPage"
import MonthlyCollectionReportPage from "@/features/financial/pages/reports/MonthlyCollectionReportPage"
import AnnualCollectionReportPage from "@/features/financial/pages/reports/AnnualCollectionReportPage"
import LoanReleaseSummaryReportPage from "@/features/financial/pages/reports/LoanReleaseSummaryReportPage"
import BenefitsReleaseSummaryReportPage from "@/features/financial/pages/reports/BenefitsReleaseSummaryReportPage"
import CashFlowSummaryReportPage from "@/features/financial/pages/reports/CashFlowSummaryReportPage"

import UsersPage from "@/features/users/pages/UsersPage"
import UserFormPage from "@/features/users/pages/UserFormPage"
import UserPermissionsPage from "@/features/users/pages/UserPermissionsPage"
import MyProfilePage from "@/features/users/pages/MyProfilePage"
import RolesPage from "@/features/roles/pages/RolesPage"
import RoleFormPage from "@/features/roles/pages/RoleFormPage"
import RoleDetailsPage from "@/features/roles/pages/RoleDetailsPage"
import RolePermissionsPage from "@/features/roles/pages/RolePermissionsPage"
import AuditLogsPage from "@/features/audit-logs/pages/AuditLogsPage"
import SettingsPage from "@/features/settings/pages/SettingsPage"
import NotificationsPage from "@/features/notifications/pages/NotificationsPage"

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route element={<ProtectedRoute permission="dashboard.view" />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>

          <Route path="/profile" element={<MyProfilePage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/drafts" element={<DraftCenterPage />} />

          <Route element={<ProtectedRoute permission="members.view" />}>
            <Route path="/members" element={<MembersPage />} />
            <Route path="/members/incomplete" element={<IncompleteProfilesPage />} />
            <Route path="/members/archived" element={<ArchivedMembersPage />} />
            <Route path="/members/drafts" element={<MemberDraftsPage />} />
            <Route path="/members/:id" element={<MemberProfilePage />} />
          </Route>
          <Route element={<ProtectedRoute permission="members.create" />}>
            <Route path="/members/new" element={<MemberRegistrationPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="members.update" />}>
            <Route path="/members/:id/edit" element={<MemberRegistrationPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="members.import" />}>
            <Route path="/members/import" element={<MemberImportWizardPage />} />
          </Route>

          <Route element={<ProtectedRoute permission="reports.view" />}>
            <Route path="/reports/members/master-list" element={<MasterListOfMembersReportPage />} />
            <Route path="/reports/members/active" element={<ActiveMembersReportPage />} />
            <Route path="/reports/members/retired" element={<RetiredMembersReportPage />} />
            <Route path="/reports/members/by-office" element={<MembersByOfficeReportPage />} />
            <Route path="/reports/members/by-sex" element={<MembersBySexReportPage />} />
            <Route path="/reports/members/new" element={<NewMembersReportPage />} />
            <Route path="/reports/members/incomplete" element={<IncompleteMemberProfilesReportPage />} />
          </Route>

          <Route element={<ProtectedRoute permission="offices.view" />}>
            <Route path="/admin/offices" element={<OfficesPage />} />
          </Route>

          <Route element={<ProtectedRoute permission="contributions.view" />}>
            <Route path="/contributions" element={<ContributionsPage />} />
            <Route path="/contributions/:id" element={<ContributionDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="contributions.create" />}>
            <Route path="/contributions/new" element={<ContributionFormPage />} />
            <Route path="/contributions/bulk" element={<BulkContributionsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="contributions.update" />}>
            <Route path="/contributions/:id/edit" element={<ContributionFormPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="contributions.import" />}>
            <Route path="/contributions/import" element={<PayrollImportPage />} />
          </Route>

          <Route element={<ProtectedRoute permission="loans.view" />}>
            <Route path="/loans" element={<LoansPage />} />
            <Route path="/loans/active" element={<ActiveLoansPage />} />
            <Route path="/loans/overdue" element={<OverdueLoansPage />} />
            <Route path="/loans/types" element={<LoanTypesPage />} />
            <Route path="/loans/drafts" element={<LoanDraftsPage />} />
            <Route path="/loans/:id" element={<LoanDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="loans.create" />}>
            <Route path="/loans/new" element={<CreateLoanApplicationPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="loans.update" />}>
            <Route path="/loans/:id/edit" element={<CreateLoanApplicationPage />} />
          </Route>

          <Route element={<ProtectedRoute permission="loan_payments.view" />}>
            <Route path="/loan-payments" element={<LoanPaymentsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="loan_payments.create" />}>
            <Route path="/loan-payments/new" element={<CreateLoanPaymentPage />} />
          </Route>

          <Route element={<ProtectedRoute permission="benefits.view" />}>
            <Route path="/benefits" element={<BenefitsPage />} />
            <Route path="/benefits/released" element={<ReleasedBenefitsPage />} />
            <Route path="/benefits/types" element={<BenefitTypesPage />} />
            <Route path="/benefits/drafts" element={<BenefitDraftsPage />} />
            <Route path="/benefits/:id" element={<BenefitDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="benefits.create" />}>
            <Route path="/benefits/new" element={<CreateBenefitApplicationPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="benefits.update" />}>
            <Route path="/benefits/:id/edit" element={<CreateBenefitApplicationPage />} />
          </Route>

          <Route element={<ProtectedRoute permission="reports.view" />}>
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/contributions" element={<ContributionReportsPage />} />
            <Route path="/reports/contributions/monthly" element={<MonthlyContributionsReportPage />} />
            <Route path="/reports/contributions/by-office" element={<ContributionsByOfficeReportPage />} />
            <Route path="/reports/contributions/unpaid" element={<UnpaidContributionsReportPage />} />
            <Route path="/reports/contributions/member-history" element={<MemberContributionHistoryReportPage />} />
            <Route path="/reports/contributions/payroll-summary" element={<PayrollDeductionSummaryReportPage />} />
            <Route path="/reports/benefits/applications" element={<BenefitApplicationsReportPage />} />
            <Route path="/reports/benefits/approved" element={<ApprovedBenefitsReportPage />} />
            <Route path="/reports/benefits/released" element={<ReleasedBenefitsReportPage />} />
            <Route path="/reports/benefits/by-type" element={<BenefitsByTypeReportPage />} />
            <Route path="/reports/benefits/by-office" element={<BenefitsByOfficeReportPage />} />
            <Route path="/reports/loans/applications" element={<LoanApplicationsReportPage />} />
            <Route path="/reports/loans/approved" element={<ApprovedLoansReportPage />} />
            <Route path="/reports/loans/rejected" element={<RejectedLoansReportPage />} />
            <Route path="/reports/loans/released" element={<ReleasedLoansReportPage />} />
            <Route path="/reports/loans/active" element={<ActiveLoansReportPage />} />
            <Route path="/reports/loans/fully-paid" element={<FullyPaidLoansReportPage />} />
            <Route path="/reports/loans/outstanding-balances" element={<OutstandingBalancesReportPage />} />
            <Route path="/reports/loans/overdue" element={<OverdueLoansReportPage />} />
            <Route path="/reports/loans/collections" element={<LoanCollectionsReportPage />} />
            <Route path="/reports/loans/aging" element={<LoanAgingReportPage />} />
            <Route path="/reports/loans/member-ledger" element={<MemberLoanLedgerReportPage />} />
            <Route path="/reports/financial/daily-collections" element={<DailyCollectionReportPage />} />
            <Route path="/reports/financial/monthly-collections" element={<MonthlyCollectionReportPage />} />
            <Route path="/reports/financial/annual-collections" element={<AnnualCollectionReportPage />} />
            <Route path="/reports/financial/loan-release-summary" element={<LoanReleaseSummaryReportPage />} />
            <Route path="/reports/financial/benefits-release-summary" element={<BenefitsReleaseSummaryReportPage />} />
            <Route path="/reports/financial/cash-flow-summary" element={<CashFlowSummaryReportPage />} />
            <Route path="/reports/benefits/member-history" element={<MemberBenefitHistoryReportPage />} />
            <Route path="/reports/:category" element={<ReportsPage />} />
          </Route>

          <Route element={<ProtectedRoute permission="users.view" />}>
            <Route path="/admin/users" element={<UsersPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="users.create" />}>
            <Route path="/admin/users/new" element={<UserFormPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="users.update" />}>
            <Route path="/admin/users/:id/edit" element={<UserFormPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="users.assign_permissions" />}>
            <Route path="/admin/users/:id/permissions" element={<UserPermissionsPage />} />
          </Route>

          <Route element={<ProtectedRoute permission="roles.view" />}>
            <Route path="/admin/roles" element={<RolesPage />} />
            <Route path="/admin/roles/:id" element={<RoleDetailsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="roles.create" />}>
            <Route path="/admin/roles/new" element={<RoleFormPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="roles.update" />}>
            <Route path="/admin/roles/:id/edit" element={<RoleFormPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="roles.assign_permissions" />}>
            <Route path="/admin/roles/:id/permissions" element={<RolePermissionsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="audit_logs.view" />}>
            <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="settings.view" />}>
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
