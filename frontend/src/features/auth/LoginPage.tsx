import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import { ForgotPasswordModal } from '../../components/modals/ForgotPasswordModal'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const result = await login(email, password)
      navigate(result.mustChangePassword ? '/trocar-senha' : '/')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || 'Não foi possível entrar. Verifique as credenciais.')
      } else {
        setError('Não foi possível entrar. Verifique as credenciais.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page auth-page-login">
      <section className="auth-hero auth-hero-panel">
        <div className="auth-hero-content">
          <span className="auth-badge">Portal do Investidor Evoque</span>
          <h1>Bem-vindo de volta</h1>
          <h2>Acesse seu painel com segurança e praticidade.</h2>
          <p>
            Consulte documentos, unidades e informações da sua conta em uma experiência clara, moderna e organizada.
          </p>
          <div className="auth-hero-points">
            <span>🔐 Acesso seguro</span>
            <span>📄 Documentos organizados</span>
            <span>⚡ Acesso rápido</span>
          </div>
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
              <h2>Entrar</h2>
              <p>Use seu e-mail e sua senha para acessar o portal.</p>
            </div>

            <label className="auth-field">
              <span>E-mail</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                type="email"
                autoComplete="email"
                required
              />
            </label>

            <label className="auth-field">
              <span>Senha</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>

            {error ? <div className="error-box">{error}</div> : null}

            <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Entrando...' : 'Entrar'}</button>

            <button
              type="button"
              className="auth-link-button"
              onClick={() => setIsForgotPasswordOpen(true)}
            >
              Esqueci minha senha
            </button>
          </form>
        </div>

        <ForgotPasswordModal
          isOpen={isForgotPasswordOpen}
          onClose={() => setIsForgotPasswordOpen(false)}
        />
      </section>
    </div>
  )
}
