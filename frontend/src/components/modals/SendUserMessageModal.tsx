import { useState } from 'react'

interface SendUserMessageModalProps {
  userName: string
  loading?: boolean
  onClose: () => void
  onSubmit: (message: string) => Promise<void> | void
}

export function SendUserMessageModal({ userName, loading = false, onClose, onSubmit }: SendUserMessageModalProps) {
  const [message, setMessage] = useState('')

  const handleSubmit = async () => {
    const trimmed = message.trim()
    if (trimmed.length < 3) return
    await onSubmit(trimmed)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card send-user-message-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Mandar mensagem</h3>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <p className="send-user-message-copy">
          Escreva a mensagem que deve aparecer para <strong>{userName}</strong> dentro do sistema.
        </p>
        <textarea
          className="send-user-message-textarea"
          placeholder="Digite a mensagem para o usuario"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
        />
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={handleSubmit} disabled={loading || message.trim().length < 3}>
            {loading ? 'Enviando...' : 'Enviar mensagem'}
          </button>
        </div>
      </div>
    </div>
  )
}
