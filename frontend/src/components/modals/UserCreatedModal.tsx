import { useState } from 'react'

interface UserCreatedModalProps {
  email: string
  password: string
  mustChangePassword: boolean
  onClose: () => void
  title?: string
}

export function UserCreatedModal({
  email,
  password,
  mustChangePassword,
  onClose,
  title = 'Usuario criado',
}: UserCreatedModalProps) {
  const [copiedField, setCopiedField] = useState<'email' | 'password' | ''>('')
  const isSpacePassword = password === ' '
  const passwordLabel = isSpacePassword ? 'Use somente a tecla espaco' : password

  const copyValue = async (value: string, field: 'email' | 'password') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      window.setTimeout(() => setCopiedField(''), 1800)
    } catch {
      setCopiedField('')
    }
  }

  return (
    <div className="modal-overlay" onClick={(event) => event.stopPropagation()}>
      <div className="modal-card modal-card-created-user" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
        </div>

        <div className="created-user-stack">
          <div className="credential-box">
            <strong>E-mail</strong>
            <span>{email}</span>
            <button type="button" className="btn-secondary credential-copy-btn" onClick={() => void copyValue(email, 'email')}>
              {copiedField === 'email' ? 'Copiado' : 'Copiar e-mail'}
            </button>
          </div>

          <div className="credential-box credential-box-password">
            <strong>Senha temporaria</strong>
            <span>{passwordLabel}</span>
            <button type="button" className="btn-secondary credential-copy-btn" onClick={() => void copyValue(password, 'password')}>
              {copiedField === 'password' ? 'Copiada' : 'Copiar senha'}
            </button>
          </div>

          <div className="info-box">
            {mustChangePassword
              ? isSpacePassword
                ? 'No primeiro login, o investidor deve digitar apenas a tecla espaco e depois redefinir a senha.'
                : 'No proximo login o sistema vai exigir a troca da senha.'
              : 'A troca de senha no primeiro login ficou desmarcada para este usuario.'}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  )
}
