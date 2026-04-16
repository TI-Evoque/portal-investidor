import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '../components/layout/AppShell'
import { ProtectedRoute } from '../components/routes/ProtectedRoute'
import { GlobalLoadingOverlay } from '../components/ui/GlobalLoadingOverlay'
import { AuthProvider } from '../contexts/AuthContext'
import { AccessVisibilityPage } from '../features/access/AccessVisibilityPage'
import { ChangePasswordPage } from '../features/auth/ChangePasswordPage'
import { LoginPage } from '../features/auth/LoginPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { FilesPage } from '../features/files/FilesPage'
import { HomePage } from '../features/home/HomePage'
import { InvestorHomePage } from '../features/investor/InvestorHomePage'
import { InvestorUnitDetailsPage } from '../features/investor/InvestorUnitDetailsPage'
import { ProfileGroupsPage } from '../features/profiles/ProfileGroupsPage'
import { RootPage } from '../features/root/RootPage'
import { UnitsPage } from '../features/units/UnitsPage'
import { UsersPage } from '../features/users/UsersPage'

function ProtectedShell() {
  return (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <GlobalLoadingOverlay />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/trocar-senha" element={<ChangePasswordPage />} />

        <Route path="/" element={<ProtectedShell />}>
          <Route index element={<RootPage />} />
          <Route
            path="inicio"
            element={
              <ProtectedRoute requiredRole="admin">
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute requiresAuthorization>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="usuarios"
            element={
              <ProtectedRoute requiredRole="admin">
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="visibilidade-acessos"
            element={
              <ProtectedRoute requiredRole="super_admin">
                <AccessVisibilityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="perfis"
            element={
              <ProtectedRoute requiredRole="super_admin">
                <ProfileGroupsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="unidades"
            element={
              <ProtectedRoute requiresAuthorization>
                <UnitsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="arquivos"
            element={
              <ProtectedRoute requiresAuthorization>
                <FilesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="investidor"
            element={
              <ProtectedRoute requiredRole="investor" requiresAuthorization>
                <InvestorHomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="investidor/unidades/:id"
            element={
              <ProtectedRoute requiredRole="investor" requiresAuthorization>
                <InvestorUnitDetailsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
