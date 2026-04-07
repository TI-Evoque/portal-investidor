import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  // Adicionamos o logout para garantir que não haja token antigo interferindo
  const { requestPasswordResetCode, resetPasswordWithCode, logout } = useAuth()
  
  const [step, setStep] = useState<1 | 2>(1)
  const [emailOrCpf, setEmailOrCpf] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false) // Novo estado para travar a tela no sucesso
  
  const codeInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (isOpen && step === 2) {
      const timer = window.setTimeout(() => codeInputRef.current?.focus(), 40)
      return () => window.clearTimeout(timer)
    }
  }, [isOpen, step])

  const canSubmitStep2 = useMemo(() => 
    code.trim().length === 6 && 
    newPassword.length >= 8 && 
    confirmPassword.length >= 8 &&
    !isSuccess
  , [code, newPassword, confirmPassword, isSuccess])

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
    setIsSuccess(false)
    onClose()
  }

  async function handleSendCode(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setInfo('')
    setIsSubmitting(true)

    // IMPORTANTE: Limpa qualquer login residual antes de começar
    logout()

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
      // 1. Envia para o backend (que não deve retornar token, apenas mensagem)
      const message = await resetPasswordWithCode(emailOrCpf, code, newPassword)
      
      // 2. Trava o formulário e exibe sucesso
      setIsSuccess(true)
      setInfo(message + ' Sua senha foi alterada com sucesso! Você já pode entrar.')

      // 3. Limpa campos sensíveis
      setCode('')
      setNewPassword('')
      setConfirmPassword('')

      // 4. Aguarda 4 segundos para o usuário ler e então fecha
      // Isso dá tempo de ver a mensagem antes de qualquer redirecionamento da LoginPage
      setTimeout(() => {
        resetStateAndClose()
      }, 4000)

    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || 'Não foi possível redefinir a senha.')
      } else {
        setError('Não foi possível redefinir a senha.')
      }
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay forgot-password-overlay" onClick={isSuccess ? undefined : resetStateAndClose}>
      <div 
        className="modal-card auth-forgot-modal forgot-password-card" 
        onClick={(event) => event.stopPropagation()} 
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3>Esqueci minha senha</h3>
            <p className="modal-subtitle">Siga os passos para recuperar o acesso à sua conta.</p>
          </div>
          {!isSuccess && (
            <button className="modal-close-btn" type="button" onClick={resetStateAndClose}>×</button>
          )}
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
                disabled={isSubmitting}
              />
            </label>

            {error ? <div className="error-box">{error}</div> : null}
            {info ? <div className="info-box">{info}</div> : null}

            <div className="forgot-actions">
              <button type="button" className="ghost-auth-button" onClick={resetStateAndClose} disabled={isSubmitting}>
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting || !emailOrCpf.trim()}>
                {isSubmitting ? 'Enviando...' : 'Enviar código'}
              </button>
            </div>
          </form>
        ) : (
          <form className="auth-form forgot-form" onSubmit={handleResetPassword}>
            <label className="auth-field">
              <span>E-mail ou CPF</span>
              <input value={emailOrCpf} readOnly className="input-readonly" />
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
                  disabled={isSubmitting || isSuccess}
                />
              </label>
              <div className="info-box forgot-code-hint">Código enviado ao seu e-mail.</div>
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
                  disabled={isSubmitting || isSuccess}
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
                  disabled={isSubmitting || isSuccess}
                />
              </label>
            </div>

            {error ? <div className="error-box">{error}</div> : null}
            {info ? <div className="info-box success-highlight">{info}</div> : null}

            <div className="forgot-actions">
              {!isSuccess && (
                <>
                  <button type="button" className="ghost-auth-button" onClick={() => setStep(1)} disabled={isSubmitting}>
                    Voltar
                  </button>
                  <button type="submit" disabled={isSubmitting || !canSubmitStep2}>
                    {isSubmitting ? 'Salvando...' : 'Redefinir senha'}
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}