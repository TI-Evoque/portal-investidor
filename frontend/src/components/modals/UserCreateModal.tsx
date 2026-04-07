import { useMemo, useState } from 'react'
import { Unit } from '../../types'
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown'
import { useCep } from '../../lib/useCep'
import { formatPhone, isValidCellPhone } from '../../lib/phone'

export type CreateUserPayload = {
  nome: string
  sobrenome: string
  email: string
  telefone: string
  must_change_password: boolean
  role: 'admin' | 'investor'
  is_authorized: boolean
  unit_ids: number[]
}

interface UserCreateModalProps {
  units: Unit[]
  onClose: () => void
  onSubmit: (data: CreateUserPayload) => Promise<void>
}

export function UserCreateModal({ units, onClose, onSubmit }: UserCreateModalProps) {
  const [formData, setFormData] = useState<CreateUserPayload>({
    nome: '',
    sobrenome: '',
    email: '',
    telefone: '',
    must_change_password: true,
    role: 'investor',
    is_authorized: true,
    unit_ids: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { fetchCep, formatCep, loadingCep, cepError } = useCep((data) => {
    console.log('CEP localizado:', data)
  })

  void fetchCep
  void formatCep
  void loadingCep
  void cepError

  const unitOptions = useMemo(
    () => units.map((unit) => ({ id: unit.id, label: unit.nome, hint: [unit.cidade, unit.estado].filter(Boolean).join(' • ') })),
    [units]
  )

  const handleChange = (field: keyof CreateUserPayload, value: string | boolean | number[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidCellPhone(formData.telefone)) {
      setError('Informe um celular com DDD no formato (11) 99999-9999.')
      return
    }
    setLoading(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao criar usuário')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-xl modal-card-user-create" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Novo usuário</h2>
            <p className="modal-subtitle">Cadastre acessos e defina as unidades liberadas para este investidor.</p>
          </div>
          <button onClick={onClose} className="modal-close-btn">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form modal-form-user-create">
          <div className="modal-section">
            <h3>Unidades associadas</h3>
            <MultiSelectDropdown
              label="Selecionar unidades"
              options={unitOptions}
              selected={formData.unit_ids}
              onChange={(next) => handleChange('unit_ids', next)}
              placeholder="Clique para selecionar múltiplas unidades"
            />
          </div>

          <div className="modal-section">
            <h3>Dados de acesso</h3>
            <div className="form-grid two-columns">
              <div className="form-group">
                <label>Nome</label>
                <input value={formData.nome} onChange={(e) => handleChange('nome', e.target.value)} placeholder="Ex: Luis" required />
              </div>
              <div className="form-group">
                <label>Sobrenome</label>
                <input value={formData.sobrenome} onChange={(e) => handleChange('sobrenome', e.target.value)} placeholder="Ex: Felipe" required />
              </div>
              <div className="form-group">
                <label>E-mail</label>
                <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="investidor@exemplo.com" required />
              </div>
              <div className="form-group">
                <label>Telefone / WhatsApp</label>
                <input
                  value={formData.telefone}
                  onChange={(e) => handleChange('telefone', formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  inputMode="numeric"
                  maxLength={15}
                  required
                />
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3>Permissões</h3>
            <div className="toggle-grid">
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={formData.role === 'admin'}
                  onChange={(e) => handleChange('role', e.target.checked ? 'admin' : 'investor')}
                />
                <div>
                  <strong>Administrador</strong>
                  <span>Pode gerenciar usuários, unidades e arquivos.</span>
                </div>
              </label>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={formData.is_authorized}
                  onChange={(e) => handleChange('is_authorized', e.target.checked)}
                />
                <div>
                  <strong>Liberar acesso imediatamente</strong>
                  <span>Quando desmarcado, o usuário fica pendente.</span>
                </div>
              </label>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={formData.must_change_password}
                  onChange={(e) => handleChange('must_change_password', e.target.checked)}
                />
                <div>
                  <strong>Trocar senha no primeiro acesso</strong>
                  <span>Solicita alteração de senha logo após o login.</span>
                </div>
              </label>
            </div>
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Criando...' : 'Criar usuário'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
