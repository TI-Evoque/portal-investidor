import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'investor'
  requiresAuthorization?: boolean
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiresAuthorization = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Carregando...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.must_change_password && window.location.pathname !== '/trocar-senha') {
    return <Navigate to="/trocar-senha" replace />
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  if (requiresAuthorization && !user?.is_authorized) {
    return (
      <div className="unauthorized-container">
        <h1>Acesso Pendente</h1>
        <p>Sua conta está aguardando aprovação do administrador.</p>
      </div>
    )
  }

  return <>{children}</>
}
