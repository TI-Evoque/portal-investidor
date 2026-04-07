interface ConfirmActionModalProps {
  title: string
  message: string
  confirmLabel: string
  tone?: 'default' | 'danger'
  loading?: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
}

export function ConfirmActionModal({
  title,
  message,
  confirmLabel,
  tone = 'default',
  loading = false,
  onClose,
  onConfirm,
}: ConfirmActionModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-confirm" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            <p className="modal-subtitle">{message}</p>
          </div>
          <button onClick={onClose} className="modal-close-btn" disabled={loading}>×</button>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            className={tone === 'danger' ? 'btn-danger-solid' : 'btn-primary'}
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
