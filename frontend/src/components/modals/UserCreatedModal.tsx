interface UserCreatedModalProps {
  email: string
  password: string
  mustChangePassword: boolean
  onClose: () => void
  title?: string
}

export function UserCreatedModal({ email, password, mustChangePassword, onClose, title = 'Usuário criado' }: UserCreatedModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="modal-close-btn">×</button>
        </div>

        <div className="created-user-stack">
          <div className="credential-box">
            <strong>E-mail</strong>
            <span>{email}</span>
          </div>
          <div className="credential-box credential-box-password">
            <strong>Senha temporária</strong>
            <span>{password}</span>
          </div>
          <div className="info-box">
            {mustChangePassword
              ? 'No próximo login o sistema vai exigir a troca da senha.'
              : 'A troca de senha no primeiro login ficou desmarcada para este usuário.'}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
