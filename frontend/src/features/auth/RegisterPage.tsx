import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'

export function RegisterPage() {
  const { register } = useAuth()
  const [form, setForm] = useState({ nome: '', cpf: '', email: '', password: '', confirmPassword: '' })
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setMessage('')
    setIsError(false)

    if (form.password !== form.confirmPassword) {
      setIsError(true)
      setMessage('As senhas não conferem.')
      return
    }

    setIsSubmitting(true)
    try {
      await register(form.nome, form.cpf, form.email, form.password)
      setIsError(false)
      setMessage('Cadastro enviado. Agora é só esperar a aprovação do administrador 😎')
      setForm({ nome: '', cpf: '', email: '', password: '', confirmPassword: '' })
    } catch (err) {
      setIsError(true)
      if (axios.isAxiosError(err)) {
        setMessage(err.response?.data?.detail || 'Não foi possível cadastrar agora.')
      } else {
        setMessage('Não foi possível cadastrar agora.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page auth-page-register">
      <section className="auth-hero auth-hero-panel">
        <div className="auth-hero-content">
          <span className="auth-badge">Portal do Investidor Evoque</span>
          <h1>Crie seu acesso</h1>
          <h2>Cadastro bonito, sem aquela tela espichada do além.</h2>
          <p>
            Solicite seu acesso preenchendo os dados abaixo. Depois da aprovação, seu painel já fica pronto para uso.
          </p>
          <div className="auth-hero-points">
            <span>👤 Cadastro rápido</span>
            <span>🏢 Liberação por unidade</span>
            <span>✅ Fluxo organizado</span>
          </div>
        </div>
      </section>

      <section className="auth-form-container">
        <div className="auth-card auth-card-register auth-card-scrollable">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F2cca9d64ecab4daabee98ac136f05faa%2Fb3ddccaa72a54c039814332cf73cac06?format=webp&width=800&height=1200"
            alt="Evoque Academia"
            className="auth-logo"
          />

          <form className="auth-form auth-form-register" onSubmit={handleSubmit}>
            <div className="auth-heading">
              <h2>Cadastre-se</h2>
              <p>Preencha seus dados para solicitar acesso ao portal.</p>
            </div>

            <div className="auth-grid-two">
              <label className="auth-field auth-field-full">
                <span>Nome completo</span>
                <input placeholder="Seu nome completo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
              </label>

              <label className="auth-field">
                <span>CPF</span>
                <input placeholder="000.000.000-00" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} required />
              </label>

              <label className="auth-field">
                <span>E-mail</span>
                <input placeholder="voce@exemplo.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" autoComplete="email" required />
              </label>

              <label className="auth-field">
                <span>Senha</span>
                <input placeholder="Crie uma senha" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" required />
              </label>

              <label className="auth-field">
                <span>Confirmar senha</span>
                <input placeholder="Repita a senha" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} autoComplete="new-password" required />
              </label>
            </div>

            {message ? <div className={isError ? 'error-box' : 'info-box'}>{message}</div> : null}

            <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Enviando...' : 'Cadastrar'}</button>
            <p className="auth-switch">Já tem cadastro? <Link to="/login">Ir para o login</Link></p>
          </form>
        </div>
      </section>
    </div>
  )
}
