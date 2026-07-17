import { Navigate, Route, Routes } from "react-router-dom"
import { AppLayout } from "@/layouts/AppLayout"
import { ProtectedRoute } from "@/routes/ProtectedRoute"
import UnauthorizedPage from "@/pages/UnauthorizedPage"

import LoginPage from "@/features/auth/pages/LoginPage"
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage"
import ResetPasswordPage from "@/features/auth/pages/ResetPasswordPage"
import ChangePasswordPage from "@/features/auth/pages/ChangePasswordPage"

import DashboardPage from "@/features/dashboard/pages/DashboardPage"

import MembersPage from "@/features/members/pages/MembersPage"
import MemberRegistrationPage from "@/features/members/pages/MemberRegistrationPage"
import MemberProfilePage from "@/features/members/pages/MemberProfilePage"
import MemberImportWizardPage from "@/features/members/pages/MemberImportWizardPage"
import IncompleteProfilesPage from "@/features/members/pages/IncompleteProfilesPage"
import ArchivedMembersPage from "@/features/members/pages/ArchivedMembersPage"

import OfficesPage from "@/features/offices/pages/OfficesPage"

import ContributionsPage from "@/features/contributions/pages/ContributionsPage"
import BulkContributionsPage from "@/features/contributions/pages/BulkContributionsPage"
import PayrollImportPage from "@/features/contributions/pages/PayrollImportPage"

import LoansPage from "@/features/loans/pages/LoansPage"
import ActiveLoansPage from "@/features/loans/pages/ActiveLoansPage"
import OverdueLoansPage from "@/features/loans/pages/OverdueLoansPage"
import LoanTypesPage from "@/features/loans/pages/LoanTypesPage"
import LoanDetailPage from "@/features/loans/pages/LoanDetailPage"
import CreateLoanApplicationPage from "@/features/loans/pages/CreateLoanApplicationPage"

import LoanPaymentsPage from "@/features/loan-payments/pages/LoanPaymentsPage"

import BenefitsPage from "@/features/benefits/pages/BenefitsPage"
import ReleasedBenefitsPage from "@/features/benefits/pages/ReleasedBenefitsPage"
import BenefitTypesPage from "@/features/benefits/pages/BenefitTypesPage"
import BenefitDetailPage from "@/features/benefits/pages/BenefitDetailPage"
import CreateBenefitApplicationPage from "@/features/benefits/pages/CreateBenefitApplicationPage"

import ReportsPage from "@/features/reports/pages/ReportsPage"

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

          <Route element={<ProtectedRoute permission="members.view" />}>
            <Route path="/members" element={<MembersPage />} />
            <Route path="/members/incomplete" element={<IncompleteProfilesPage />} />
            <Route path="/members/archived" element={<ArchivedMembersPage />} />
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

          <Route element={<ProtectedRoute permission="offices.view" />}>
            <Route path="/admin/offices" element={<OfficesPage />} />
          </Route>

          <Route element={<ProtectedRoute permission="contributions.view" />}>
            <Route path="/contributions" element={<ContributionsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="contributions.create" />}>
            <Route path="/contributions/new" element={<BulkContributionsPage />} />
            <Route path="/contributions/bulk" element={<BulkContributionsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="contributions.import" />}>
            <Route path="/contributions/import" element={<PayrollImportPage />} />
          </Route>

          <Route element={<ProtectedRoute permission="loans.view" />}>
            <Route path="/loans" element={<LoansPage />} />
            <Route path="/loans/active" element={<ActiveLoansPage />} />
            <Route path="/loans/overdue" element={<OverdueLoansPage />} />
            <Route path="/loans/types" element={<LoanTypesPage />} />
            <Route path="/loans/:id" element={<LoanDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="loans.create" />}>
            <Route path="/loans/new" element={<CreateLoanApplicationPage />} />
          </Route>

          <Route element={<ProtectedRoute permission="loan_payments.view" />}>
            <Route path="/loan-payments" element={<LoanPaymentsPage />} />
          </Route>

          <Route element={<ProtectedRoute permission="benefits.view" />}>
            <Route path="/benefits" element={<BenefitsPage />} />
            <Route path="/benefits/released" element={<ReleasedBenefitsPage />} />
            <Route path="/benefits/types" element={<BenefitTypesPage />} />
            <Route path="/benefits/:id" element={<BenefitDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="benefits.create" />}>
            <Route path="/benefits/new" element={<CreateBenefitApplicationPage />} />
          </Route>

          <Route element={<ProtectedRoute permission="reports.view" />}>
            <Route path="/reports" element={<ReportsPage />} />
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
