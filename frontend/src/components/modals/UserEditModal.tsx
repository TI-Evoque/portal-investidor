import { useMemo, useState } from 'react'
import { PermissionGroupOption, User, Unit } from '../../types'
import { formatCpf, isValidCpf } from '../../lib/cpf'
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown'
import { formatPhone, isValidCellPhone } from '../../lib/phone'

type EditTab = 'dados' | 'permissoes' | 'unidades' | 'seguranca'

interface UserEditModalProps {
  user: User
  units: Unit[]
  permissionGroups?: PermissionGroupOption[]
  currentUserPermissions?: Record<string, boolean>
  currentUserRole?: 'super_admin' | 'admin' | 'investor'
  onClose: () => void
  onSubmit: (data: Partial<User>) => Promise<void>
  onResetPassword: (mustChangePassword: boolean) => Promise<void>
}

export function UserEditModal({ user, units, permissionGroups = [], currentUserPermissions, currentUserRole, onClose, onSubmit, onResetPassword }: UserEditModalProps) {
  const canEditUser = !currentUserPermissions || currentUserPermissions.edit === true
  const canManageUnits = !currentUserPermissions || currentUserPermissions.assign_units === true
  const canResetPassword = !currentUserPermissions || currentUserPermissions.reset_password === true
  const [activeTab, setActiveTab] = useState<EditTab>(() => (!canEditUser && canManageUnits ? 'unidades' : 'dados'))
  const [formData, setFormData] = useState<Partial<User>>({
    email: user.email,
    is_authorized: user.is_authorized,
    role: user.role,
    permission_group_id: user.permission_group_id ?? null,
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
  const isSuperAdmin = currentUserRole === 'super_admin'

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

    setLoading(true)
    try {
      const payload: Partial<User> = { ...formData }

      if (payload.email === user.email) delete payload.email
      if ((payload.sobrenome || '') === (user.sobrenome || '')) delete payload.sobrenome
      if ((payload.telefone || '') === (user.telefone || '')) delete payload.telefone
      if ((payload.cpf || '') === formatCpf(user.cpf || '')) delete payload.cpf
      if (payload.is_authorized === user.is_authorized) delete payload.is_authorized
      if (payload.is_active === user.is_active) delete payload.is_active
      if (payload.must_change_password === user.must_change_password) delete payload.must_change_password
      if (payload.role === user.role) delete payload.role
      if (payload.permission_group_id === (user.permission_group_id ?? null)) delete payload.permission_group_id

      const currentUnitIds = JSON.stringify([...(user.unit_ids || [])].sort((a, b) => a - b))
      const nextUnitIds = JSON.stringify([...(payload.unit_ids || [])].sort((a, b) => a - b))
      if (currentUnitIds === nextUnitIds) delete payload.unit_ids

      if (!isSuperAdmin) {
        delete payload.role
        delete payload.permission_group_id
        delete payload.sobrenome
        delete payload.cpf
        delete payload.must_change_password
      }

      if (payload.telefone !== undefined && !isValidCellPhone(payload.telefone)) {
        setError('Informe um celular com DDD no formato (11) 99999-9999.')
        return
      }

      if (payload.cpf !== undefined && !isValidCpf(payload.cpf || '')) {
        setError('Informe um CPF valido no formato 000.000.000-00.')
        return
      }

      await onSubmit(payload)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao atualizar usuario')
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

        <div className="modal-tabs" role="tablist" aria-label="Editar usuario">
          {canEditUser ? <button type="button" className={tabClassName('dados')} onClick={() => setActiveTab('dados')}>Dados</button> : null}
          {canEditUser ? <button type="button" className={tabClassName('permissoes')} onClick={() => setActiveTab('permissoes')}>Permissoes</button> : null}
          {canManageUnits ? <button type="button" className={tabClassName('unidades')} onClick={() => setActiveTab('unidades')}>Unidades</button> : null}
          {canResetPassword ? <button type="button" className={tabClassName('seguranca')} onClick={() => setActiveTab('seguranca')}>Seguranca</button> : null}
        </div>

        <form onSubmit={handleSubmit} className="modal-form modal-form-spacious">
          {activeTab === 'dados' ? (
            <div className="modal-section modal-tab-panel">
              <div className="modal-panel-intro">
                <h3>Informacoes do usuario</h3>
                <p className="modal-subtitle">Edite apenas os campos cadastrais necessarios.</p>
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
          ) : null}

          {activeTab === 'permissoes' ? (
            <div className="modal-section modal-tab-panel">
              <div className="modal-panel-intro">
                <h3>Permissoes e status</h3>
                <p className="modal-subtitle">Controle acesso, perfil administrativo e disponibilidade do usuario.</p>
              </div>
              <div className="toggle-grid">
                <label className="setting-toggle setting-toggle-rich">
                  <input type="checkbox" checked={formData.is_active || false} onChange={(e) => handleChange('is_active', e.target.checked)} disabled={loading} />
                  <div><strong>Usuario ativo</strong><span>Permite login e navegacao no portal.</span></div>
                </label>
                <label className="setting-toggle setting-toggle-rich">
                  <input type="checkbox" checked={formData.is_authorized || false} onChange={(e) => handleChange('is_authorized', e.target.checked)} disabled={loading} />
                  <div><strong>Acesso autorizado</strong><span>Libera unidades e arquivos do investidor.</span></div>
                </label>
                {user.role === 'super_admin' ? (
                  <label className="setting-toggle setting-toggle-rich">
                    <input type="checkbox" checked disabled />
                    <div><strong>Super admin</strong><span>Esse usuario possui o nivel maximo de permissao.</span></div>
                  </label>
                ) : (
                  <label className="setting-toggle setting-toggle-rich">
                    <input type="checkbox" checked={formData.role === 'admin'} onChange={(e) => handleChange('role', e.target.checked ? 'admin' : 'investor')} disabled={loading} />
                    <div><strong>Administrador</strong><span>Concede permissoes administrativas completas.</span></div>
                  </label>
                )}
                <label className="setting-toggle setting-toggle-rich">
                  <input type="checkbox" checked={formData.must_change_password || false} onChange={(e) => handleChange('must_change_password', e.target.checked)} disabled={loading || resetLoading} />
                  <div><strong>Trocar senha no proximo login</strong><span>Usado tambem no reset de senha abaixo.</span></div>
                </label>
                {isSuperAdmin ? (
                  <label className="setting-toggle setting-toggle-rich">
                    <div>
                      <strong>Grupo de permissao</strong>
                      <span>As regras da aba Grupos serao aplicadas no proximo login do usuario.</span>
                      <select
                        value={formData.permission_group_id ?? ''}
                        onChange={(e) => handleChange('permission_group_id', e.target.value ? Number(e.target.value) : null)}
                        disabled={loading}
                      >
                        <option value="">Usar grupo padrao do perfil</option>
                        {permissionGroups.map((group) => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                      </select>
                    </div>
                  </label>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTab === 'unidades' ? (
            <div className="modal-section modal-tab-panel">
              <div className="modal-panel-intro">
                <h3>Unidades de socio investidor</h3>
                <p className="modal-subtitle">Adicione ou remova as unidades vinculadas ao usuario.</p>
              </div>
              <MultiSelectDropdown
                label="Selecionar unidades"
                options={unitOptions}
                selected={formData.unit_ids || []}
                onChange={(next) => handleChange('unit_ids', next)}
                placeholder="Clique para selecionar multiplas unidades"
              />
            </div>
          ) : null}

          {activeTab === 'seguranca' ? (
            <div className="modal-section modal-tab-panel">
              <div className="modal-panel-intro">
                <h3>Reset de senha</h3>
                <p className="modal-subtitle">Gera uma nova senha temporaria de 6 caracteres e obriga a troca da senha no proximo login.</p>
              </div>
              <div className="security-panel-card">
                <div>
                  <strong>Resetar senha do usuario</strong>
                  <p className="modal-subtitle">Ao confirmar, o usuario recebera uma senha temporaria e sera levado primeiro para a tela de nova senha antes de entrar no portal.</p>
                </div>
                <button type="button" className="btn-secondary" onClick={handleResetPassword} disabled={resetLoading}>
                  {resetLoading ? 'Resetando...' : 'Resetar senha'}
                </button>
              </div>
            </div>
          ) : null}

          {error ? <div className="form-error">{error}</div> : null}

          <div className="modal-actions modal-actions-sticky">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading || resetLoading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading || resetLoading}>
              {loading ? 'Salvando...' : 'Salvar alteracoes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
