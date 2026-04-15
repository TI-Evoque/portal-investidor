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

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'admin' || user.role === 'super_admin') {
    return <Navigate to="/inicio" replace />
  }

  if (user.role === 'investor') {
    return <Navigate to="/dashboard" replace />
  }

  return <Navigate to="/login" replace />
}
