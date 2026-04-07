interface AdminNoticeModalProps {
  message: string
  loading?: boolean
  onConfirm: () => Promise<void> | void
}

export function AdminNoticeModal({ message, loading = false, onConfirm }: AdminNoticeModalProps) {
  return (
    <div className="modal-overlay" onClick={(event) => event.stopPropagation()}>
      <div className="modal-card admin-notice-modal" onClick={(event) => event.stopPropagation()}>
        <div className="admin-notice-icon">!</div>
        <h2>Mensagem do sistema</h2>
        <p>{message}</p>
        <button type="button" className="btn-primary" onClick={() => void onConfirm()} disabled={loading}>
          {loading ? 'Confirmando...' : 'OK'}
        </button>
      </div>
    </div>
  )
}
