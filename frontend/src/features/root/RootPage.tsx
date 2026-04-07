import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function RootPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Carregando...</p>
      </div>
    )
  }

  // Se não autenticado, vai para login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Admin vai para dashboard
  if (user.role === 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  // Investidor vai para página de investidor
  if (user.role === 'investor') {
    return <Navigate to="/investidor" replace />
  }

  // Fallback
  return <Navigate to="/login" replace />
}
