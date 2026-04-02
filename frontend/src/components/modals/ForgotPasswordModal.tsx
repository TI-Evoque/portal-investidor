import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const { requestPasswordResetCode, resetPasswordWithCode } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [emailOrCpf, setEmailOrCpf] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const codeInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (isOpen && step === 2) {
      const timer = window.setTimeout(() => codeInputRef.current?.focus(), 40)
      return () => window.clearTimeout(timer)
    }
  }, [isOpen, step])

  const canSubmitStep2 = useMemo(() => code.trim().length === 6 && newPassword.length >= 8 && confirmPassword.length >= 8, [code, newPassword, confirmPassword])

  if (!isOpen) return null

  const resetStateAndClose = () => {
    setStep(1)
    setEmailOrCpf('')
    setCode('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setInfo('')
    setIsSubmitting(false)
    onClose()
  }

  async function handleSendCode(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setInfo('')
    setIsSubmitting(true)
    try {
      const message = await requestPasswordResetCode(emailOrCpf)
      setInfo(message)
      setStep(2)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || 'Não foi possível enviar o código.')
      } else {
        setError('Não foi possível enviar o código.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setInfo('')
    if (newPassword !== confirmPassword) {
      setError('A confirmação da senha não confere.')
      return
    }
    setIsSubmitting(true)
    try {
      const message = await resetPasswordWithCode(emailOrCpf, code, newPassword)
      setInfo(message + ' Agora você já pode entrar com a nova senha.')
      setStep(1)
      setCode('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || 'Não foi possível redefinir a senha.')
      } else {
        setError('Não foi possível redefinir a senha.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay forgot-password-overlay" onClick={resetStateAndClose}>
      <div className="modal-card auth-forgot-modal forgot-password-card" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Esqueci minha senha</h3>
            <p className="modal-subtitle">Receba um código de 6 dígitos no e-mail para redefinir sua senha.</p>
          </div>
          <button className="modal-close-btn" type="button" onClick={resetStateAndClose}>×</button>
        </div>

        <div className="forgot-steps">
          <span className={step === 1 ? 'forgot-step active' : 'forgot-step'}>1. Identificação</span>
          <span className={step === 2 ? 'forgot-step active' : 'forgot-step'}>2. Código e nova senha</span>
        </div>

        {step === 1 ? (
          <form className="auth-form forgot-form" onSubmit={handleSendCode}>
            <label className="auth-field">
              <span>E-mail ou CPF</span>
              <input
                value={emailOrCpf}
                onChange={(e) => setEmailOrCpf(e.target.value)}
                placeholder="Digite seu e-mail ou CPF"
                autoComplete="username"
                required
              />
            </label>

            {error ? <div className="error-box">{error}</div> : null}
            {info ? <div className="info-box">{info}</div> : null}

            <div className="forgot-actions">
              <button type="button" className="ghost-auth-button" onClick={resetStateAndClose}>Cancelar</button>
              <button type="submit" disabled={isSubmitting || !emailOrCpf.trim()}>
                {isSubmitting ? 'Enviando...' : 'Enviar código'}
              </button>
            </div>
          </form>
        ) : (
          <form className="auth-form forgot-form" onSubmit={handleResetPassword}>
            <label className="auth-field">
              <span>E-mail ou CPF</span>
              <input value={emailOrCpf} onChange={(e) => setEmailOrCpf(e.target.value)} required />
            </label>
            <div className="auth-grid-two">
              <label className="auth-field">
                <span>Código de 6 dígitos</span>
                <input
                  ref={codeInputRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  required
                />
              </label>
              <div className="info-box forgot-code-hint">Confira a caixa de entrada do e-mail cadastrado.</div>
            </div>

            <div className="auth-grid-two">
              <label className="auth-field">
                <span>Nova senha</span>
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </label>
              <label className="auth-field">
                <span>Confirmar nova senha</span>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </label>
            </div>

            {error ? <div className="error-box">{error}</div> : null}
            {info ? <div className="info-box">{info}</div> : null}

            <div className="forgot-actions">
              <button type="button" className="ghost-auth-button" onClick={() => setStep(1)}>Voltar</button>
              <button type="submit" disabled={isSubmitting || !canSubmitStep2}>
                {isSubmitting ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
