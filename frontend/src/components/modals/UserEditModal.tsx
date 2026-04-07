import { useMemo, useState } from 'react'
import { User, Unit } from '../../types'
import { formatCpf, isValidCpf } from '../../lib/cpf'
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown'
import { formatPhone, isValidCellPhone } from '../../lib/phone'

type EditTab = 'dados' | 'permissoes' | 'unidades' | 'seguranca'

interface UserEditModalProps {
  user: User
  units: Unit[]
  onClose: () => void
  onSubmit: (data: Partial<User>) => Promise<void>
  onResetPassword: (mustChangePassword: boolean) => Promise<void>
}

export function UserEditModal({ user, units, onClose, onSubmit, onResetPassword }: UserEditModalProps) {
  const [activeTab, setActiveTab] = useState<EditTab>('dados')
  const [formData, setFormData] = useState<Partial<User>>({
    email: user.email,
    is_authorized: user.is_authorized,
    role: user.role,
    is_active: user.is_active,
    cpf: formatCpf(user.cpf || ''),
    telefone: user.telefone,
    sobrenome: user.sobrenome,
    must_change_password: user.must_change_password,
    unit_ids: user.unit_ids,
  })
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [error, setError] = useState('')

  const unitOptions = useMemo(
    () => units.map((unit) => ({ id: unit.id, label: unit.nome, hint: [unit.cidade, unit.estado].filter(Boolean).join(' • ') })),
    [units]
  )

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidCellPhone(formData.telefone)) {
      setError('Informe um celular com DDD no formato (11) 99999-9999.')
      return
    }
    if (!isValidCpf(formData.cpf || '')) {
      setError('Informe um CPF valido no formato 000.000.000-00.')
      return
    }
    setLoading(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao atualizar usuário')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    setResetLoading(true)
    setError('')
    try {
      await onResetPassword(true)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao resetar a senha')
    } finally {
      setResetLoading(false)
    }
  }

  const tabClassName = (tab: EditTab) => `modal-tab-btn ${activeTab === tab ? 'active' : ''}`

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-xxl modal-card-scrollable" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header modal-header-sticky">
          <div>
            <h2>Editar investidor</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn">×</button>
        </div>

        <div className="modal-tabs" role="tablist" aria-label="Editar usuário">
          <button type="button" className={tabClassName('dados')} onClick={() => setActiveTab('dados')}>Dados</button>
          <button type="button" className={tabClassName('permissoes')} onClick={() => setActiveTab('permissoes')}>Permissões</button>
          <button type="button" className={tabClassName('unidades')} onClick={() => setActiveTab('unidades')}>Unidades</button>
          <button type="button" className={tabClassName('seguranca')} onClick={() => setActiveTab('seguranca')}>Segurança</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form modal-form-spacious">
          {activeTab === 'dados' && (
            <div className="modal-section modal-tab-panel">
              <div className="modal-panel-intro">
                <h3>Informações do usuário</h3>
                <p className="modal-subtitle">Edite apenas os campos cadastrais necessários.</p>
              </div>
              <div className="form-grid two-columns">
                <div className="form-group">
                  <label>Nome</label>
                  <input type="text" value={user.nome} disabled className="input-disabled" />
                </div>
                <div className="form-group">
                  <label>Sobrenome</label>
                  <input type="text" value={formData.sobrenome || ''} onChange={(e) => handleChange('sobrenome', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>E-mail</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="investidor@exemplo.com"
                  />
                </div>
                <div className="form-group">
                  <label>CPF</label>
                  <input
                    type="text"
                    value={formData.cpf || ''}
                    onChange={(e) => handleChange('cpf', formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    maxLength={14}
                  />
                </div>
                <div className="form-group">
                  <label>Telefone</label>
                  <input
                    type="text"
                    value={formData.telefone || ''}
                    onChange={(e) => handleChange('telefone', formatPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    inputMode="numeric"
                    maxLength={15}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissoes' && (
            <div className="modal-section modal-tab-panel">
              <div className="modal-panel-intro">
                <h3>Permissões e status</h3>
                <p className="modal-subtitle">Controle acesso, perfil administrativo e disponibilidade do usuário.</p>
              </div>
              <div className="toggle-grid">
                <label className="setting-toggle setting-toggle-rich">
                  <input type="checkbox" checked={formData.is_active || false} onChange={(e) => handleChange('is_active', e.target.checked)} disabled={loading} />
                  <div><strong>Usuário ativo</strong><span>Permite login e navegação no portal.</span></div>
                </label>
                <label className="setting-toggle setting-toggle-rich">
                  <input type="checkbox" checked={formData.is_authorized || false} onChange={(e) => handleChange('is_authorized', e.target.checked)} disabled={loading} />
                  <div><strong>Acesso autorizado</strong><span>Libera unidades e arquivos do investidor.</span></div>
                </label>
                {user.role === 'super_admin' ? (
                  <label className="setting-toggle setting-toggle-rich">
                    <input type="checkbox" checked disabled />
                    <div><strong>Super admin</strong><span>Esse usuário possui o nível máximo de permissão.</span></div>
                  </label>
                ) : (
                  <label className="setting-toggle setting-toggle-rich">
                    <input type="checkbox" checked={formData.role === 'admin'} onChange={(e) => handleChange('role', e.target.checked ? 'admin' : 'investor')} disabled={loading} />
                    <div><strong>Administrador</strong><span>Concede permissões administrativas completas.</span></div>
                  </label>
                )}
                <label className="setting-toggle setting-toggle-rich">
                  <input type="checkbox" checked={formData.must_change_password || false} onChange={(e) => handleChange('must_change_password', e.target.checked)} disabled={loading || resetLoading} />
                  <div><strong>Trocar senha no próximo login</strong><span>Usado também no reset de senha abaixo.</span></div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'unidades' && (
            <div className="modal-section modal-tab-panel">
              <div className="modal-panel-intro">
                <h3>Unidades de sócio investidor</h3>
                <p className="modal-subtitle">Adicione ou remova as unidades vinculadas ao usuário.</p>
              </div>
              <MultiSelectDropdown
                label="Selecionar unidades"
                options={unitOptions}
                selected={formData.unit_ids || []}
                onChange={(next) => handleChange('unit_ids', next)}
                placeholder="Clique para selecionar múltiplas unidades"
              />
            </div>
          )}

          {activeTab === 'seguranca' && (
            <div className="modal-section modal-tab-panel">
              <div className="modal-panel-intro">
                <h3>Reset de senha</h3>
                <p className="modal-subtitle">Gera uma nova senha temporária de 6 caracteres e obriga a troca da senha no próximo login.</p>
              </div>
              <div className="security-panel-card">
                <div>
                  <strong>Resetar senha do usuário</strong>
                  <p className="modal-subtitle">Ao confirmar, o usuário receberá uma senha temporária e será levado primeiro para a tela de nova senha antes de entrar no portal.</p>
                </div>
                <button type="button" className="btn-secondary" onClick={handleResetPassword} disabled={resetLoading}>{resetLoading ? 'Resetando...' : 'Resetar senha'}</button>
              </div>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions modal-actions-sticky">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading || resetLoading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading || resetLoading}>{loading ? 'Salvando...' : 'Salvar alterações'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
