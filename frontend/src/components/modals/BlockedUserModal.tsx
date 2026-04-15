interface BlockedUserModalProps {
  isOpen: boolean
  message: string
  onClose: () => void
}

export function BlockedUserModal({ isOpen, message, onClose }: BlockedUserModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay forgot-password-overlay" onClick={onClose}>
      <div
        className="modal-card forgot-password-card"
        style={{
          width: 'min(420px, calc(100vw - 32px))',
          borderRadius: '22px',
          padding: '28px 24px',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ícone */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#fff4ed',
            border: '1px solid #ffd4c1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'var(--orange-dark)',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Título */}
        <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: '#2f2f2f' }}>
          Acesso bloqueado
        </h2>

        {/* Mensagem */}
        <p style={{ margin: '0 0 24px', color: '#666', fontSize: 15, lineHeight: 1.6 }}>
          {message}
        </p>

        {/* Botão */}
        <button
          className="btn-primary"
          style={{ width: '100%', borderRadius: 14, padding: '14px 20px', fontSize: 15 }}
          onClick={onClose}
        >
          Entendido
        </button>
      </div>
    </div>
  )
}
