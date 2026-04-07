import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Unit } from '../../types'
import { useCep } from '../../lib/useCep'
import { formatPhone, isValidCellPhone } from '../../lib/phone'
import { useAuth } from '../../contexts/AuthContext'

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

type CreateTab = 'dados' | 'unidades'

interface UserCreateModalProps {
  units: Unit[]
  onClose: () => void
  onSubmit: (data: CreateUserPayload) => Promise<void>
}

export function UserCreateModal({ units, onClose, onSubmit }: UserCreateModalProps) {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const [activeTab, setActiveTab] = useState<CreateTab>('dados')
  const [pendingUnitId, setPendingUnitId] = useState<string>('')
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

  const availableUnits = useMemo(
    () => units.filter((unit) => !formData.unit_ids.includes(unit.id)),
    [units, formData.unit_ids]
  )

  const selectedUnits = useMemo(
    () => units.filter((unit) => formData.unit_ids.includes(unit.id)),
    [units, formData.unit_ids]
  )

  const handleChange = (field: keyof CreateUserPayload, value: string | boolean | number[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const addSelectedUnit = () => {
    if (!pendingUnitId) return
    const unitId = Number(pendingUnitId)
    if (!formData.unit_ids.includes(unitId)) {
      handleChange('unit_ids', [...formData.unit_ids, unitId])
    }
    setPendingUnitId('')
  }

  const removeUnit = (unitId: number) => {
    handleChange('unit_ids', formData.unit_ids.filter((id) => id !== unitId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidCellPhone(formData.telefone)) {
      setError('Informe um celular com DDD no formato (11) 99999-9999.')
      setActiveTab('dados')
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

  const tabClassName = (tab: CreateTab) => `modal-tab-btn ${activeTab === tab ? 'active' : ''}`

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

        <div className="modal-tabs" role="tablist" aria-label="Novo usuário">
          <button type="button" className={tabClassName('dados')} onClick={() => setActiveTab('dados')}>Dados e permissões</button>
          <button type="button" className={tabClassName('unidades')} onClick={() => setActiveTab('unidades')}>Unidades</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form modal-form-user-create">
          {activeTab === 'dados' ? (
            <>
              <div className="modal-section modal-tab-panel">
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

              <div className="modal-section modal-tab-panel">
                <h3>Permissões</h3>
                <div className="toggle-grid">
                  {isSuperAdmin ? (
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
                  ) : null}
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
            </>
          ) : (
            <div className="modal-section modal-tab-panel">
              <div className="modal-panel-intro">
                <h3>Unidades associadas</h3>
                <p className="modal-subtitle">Selecione uma unidade e clique em OK para ir adicionando aos cards abaixo.</p>
              </div>

              <div className="user-unit-picker">
                <div className="form-group user-unit-picker-field">
                  <label>Selecionar unidade</label>
                  <select value={pendingUnitId} onChange={(e) => setPendingUnitId(e.target.value)}>
                    <option value="">Escolha uma unidade</option>
                    {availableUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" className="btn-primary user-unit-add-btn" onClick={addSelectedUnit} disabled={!pendingUnitId}>
                  <Plus size={16} /> Adicionar
                </button>
              </div>

              <div className="user-unit-card-list">
                {selectedUnits.length === 0 ? (
                  <div className="empty-users-state compact">Nenhuma unidade adicionada ainda.</div>
                ) : (
                  selectedUnits.map((unit) => (
                    <div key={unit.id} className="user-unit-card">
                      <div className="user-unit-card-copy">
                        <strong>{unit.nome}</strong>
                        <span>{[unit.cidade, unit.estado].filter(Boolean).join(' • ') || unit.endereco || 'Unidade associada'}</span>
                      </div>
                      <button type="button" className="user-unit-card-remove" onClick={() => removeUnit(unit.id)} aria-label={`Remover ${unit.nome}`}>
                        <X size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {error ? <div className="form-error">{error}</div> : null}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>Cancelar</button>
            {activeTab === 'dados' ? (
              <button type="button" className="btn-primary" onClick={() => setActiveTab('unidades')}>
                Ir para unidades
              </button>
            ) : (
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Criando...' : 'Criar usuário'}</button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
