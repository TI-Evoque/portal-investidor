import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user, isLoading, changePassword, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { replace: true })
      return
    }

    if (!isLoading && user && !user.must_change_password) {
      navigate('/', { replace: true })
    }
  }, [isLoading, user, navigate])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError('As senhas nao conferem.')
      return
    }

    setIsSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
      setMessage('Senha alterada com sucesso. Redirecionando...')
      setTimeout(() => navigate('/', { replace: true }), 1500)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail
        if (Array.isArray(detail)) {
          setError(detail.map((item: any) => String(item.msg)).join(', '))
        } else if (typeof detail === 'string') {
          setError(detail)
        } else {
          setError('Nao foi possivel trocar a senha agora.')
        }
      } else {
        setError('Nao foi possivel trocar a senha agora.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page auth-page-login">
      <section className="auth-hero auth-hero-panel">
        <div className="auth-hero-content">
          <h1>Bem-vindo !</h1>
          <h2>Acesse seu painel com seguranca e praticidade.</h2>
          <p>Consulte sua unidade e seus respectivos arquivos.</p>
        </div>
      </section>

      <section className="auth-form-container">
        <div className="auth-card auth-card-compact">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F2cca9d64ecab4daabee98ac136f05faa%2Fb3ddccaa72a54c039814332cf73cac06?format=webp&width=800&height=1200"
            alt="Evoque Academia"
            className="auth-logo"
          />

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-heading">
              <h2>Definir nova senha</h2>
              <p>Use a senha temporaria atual e depois crie sua nova senha.</p>
            </div>

            <label className="auth-field">
              <span>Senha temporaria atual</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <label className="auth-field">
              <span>Nova senha</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            <label className="auth-field">
              <span>Confirmar nova senha</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            <div className="password-hint">A senha deve ter 8+ caracteres, maiuscula, minuscula, numero e simbolo.</div>
            {error ? <div className="error-box">{error}</div> : null}
            {message ? <div className="info-box">{message}</div> : null}

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
            </button>
            <button type="button" className="ghost-auth-button" onClick={logout}>Sair</button>
          </form>
        </div>
      </section>
    </div>
  )
}
