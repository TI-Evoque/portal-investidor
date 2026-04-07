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
    setError('As senhas não conferem.')
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
        setError(detail.map((e: any) => String(e.msg)).join(', '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Não foi possível trocar a senha agora.')
      }
    } else {
      setError('Não foi possível trocar a senha agora.')
    }
  } finally {
    setIsSubmitting(false)
  }
}

  return (
    <div className="auth-page">
      <section className="auth-hero auth-hero-panel">
        <div className="auth-hero-content">
          <span className="auth-badge">Primeiro acesso</span>
          <h1>Troca de senha obrigatória</h1>
          <h2>Agora a senha temporária se aposenta com honra.</h2>
          <p>
            Seu administrador criou seu acesso com uma senha provisória. Antes de continuar, defina uma senha nova e segura.
          </p>
          <div className="auth-hero-points">
            <span>🔒 Mais segurança</span>
            <span>👤 Acesso pessoal</span>
            <span>✅ Fluxo obrigatório</span>
          </div>
        </div>
      </section>

      <section className="auth-form-container">
        <div className="auth-card auth-card-compact">
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-heading">
              <h2>Definir nova senha</h2>
              <p>Use a senha temporária atual e depois crie sua nova senha.</p>
            </div>

            <label className="auth-field">
              <span>Senha temporária atual</span>
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

            <div className="password-hint">A senha deve ter 8+ caracteres, maiúscula, minúscula, número e símbolo.</div>
            {error ? <div className="error-box">{error}</div> : null}
            {message ? <div className="info-box">{message}</div> : null}

            <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar nova senha'}</button>
            <button type="button" className="ghost-auth-button" onClick={logout}>Sair</button>
          </form>
        </div>
      </section>
    </div>
  )
}
