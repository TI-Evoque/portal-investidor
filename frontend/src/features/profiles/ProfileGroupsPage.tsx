import { useEffect, useMemo, useState } from 'react'
import { Edit3, Plus, ShieldCheck, Trash2 } from 'lucide-react'

import { ConfirmActionModal } from '../../components/modals/ConfirmActionModal'
import { SectionHeader } from '../../components/ui/SectionHeader'
import api from '../../lib/api'

type PermissionAction = {
  key: string
  label: string
}

type PermissionModule = {
  key: string
  label: string
  description: string
  screen_type: 'admin' | 'user'
  screen_type_label: string
  actions: PermissionAction[]
}

type PermissionGroup = {
  id: number
  name: string
  slug: string
  description?: string | null
  is_system: boolean
  rules: Record<string, Record<string, boolean>>
}

type PermissionGroupFormState = {
  name: string
  description: string
  rules: Record<string, Record<string, boolean>>
}

type GroupModalMode = 'create' | 'edit'

const emptyForm: PermissionGroupFormState = {
  name: '',
  description: '',
  rules: {},
}

function cloneRules(rules: PermissionGroup['rules']) {
  return JSON.parse(JSON.stringify(rules || {})) as PermissionGroup['rules']
}

const isVisibilityRule = (action: PermissionAction) => action.key.startsWith('hide_')

const getVisibilityLabel = (label: string) => {
  const cleanedLabel = label.replace(/^Ocultar botao\s+/i, '').trim()
  return `${cleanedLabel} visivel`
}

function PermissionGroupModal({
  mode,
  group,
  modules,
  loading,
  onClose,
  onSubmit,
}: {
  mode: GroupModalMode
  group?: PermissionGroup
  modules: PermissionModule[]
  loading: boolean
  onClose: () => void
  onSubmit: (payload: PermissionGroupFormState) => Promise<void>
}) {
  const [form, setForm] = useState<PermissionGroupFormState>(() => (
    group
      ? { name: group.name, description: group.description || '', rules: cloneRules(group.rules) }
      : emptyForm
  ))
  const [activeScreenType, setActiveScreenType] = useState<'admin' | 'user'>('admin')
  const [error, setError] = useState('')

  const screenTypeOptions = useMemo(
    () => [
      {
        key: 'admin' as const,
        label: 'Telas de administrador',
        description: 'Admin e super admin: areas que modificam o sistema.',
        count: modules.filter((module) => module.screen_type === 'admin').length,
      },
      {
        key: 'user' as const,
        label: 'Telas de usuario',
        description: 'Investidor: areas de consulta e documentos liberados.',
        count: modules.filter((module) => module.screen_type === 'user').length,
      },
    ],
    [modules]
  )

  const visibleModules = useMemo(
    () => modules.filter((module) => module.screen_type === activeScreenType),
    [activeScreenType, modules]
  )

  const isRuleActive = (moduleKey: string, actionKey: string) => !!form.rules[moduleKey]?.[actionKey]

  const isButtonVisible = (moduleKey: string, actionKey: string) => form.rules[moduleKey]?.[actionKey] !== true

  const toggleRule = (moduleKey: string, actionKey: string) => {
    setForm((current) => ({
      ...current,
      rules: {
        ...current.rules,
        [moduleKey]: {
          ...(current.rules[moduleKey] || {}),
          [actionKey]: !current.rules[moduleKey]?.[actionKey],
        },
      },
    }))
    setError('')
  }

  const toggleVisibilityRule = (moduleKey: string, actionKey: string) => {
    setForm((current) => {
      const currentVisibility = current.rules[moduleKey]?.[actionKey] !== true

      return {
        ...current,
        rules: {
          ...current.rules,
          [moduleKey]: {
            ...(current.rules[moduleKey] || {}),
            [actionKey]: currentVisibility,
          },
        },
      }
    })
    setError('')
  }

  const toggleModule = (module: PermissionModule, enabled: boolean) => {
    setForm((current) => ({
      ...current,
      rules: {
        ...current.rules,
        [module.key]: module.actions.reduce<Record<string, boolean>>((acc, action) => {
          acc[action.key] = isVisibilityRule(action) ? !enabled : enabled
          return acc
        }, {}),
      },
    }))
    setError('')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('Informe o nome do grupo.')
      return
    }

    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        rules: form.rules,
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Nao foi possivel salvar o grupo.')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-xxl modal-card-scrollable profile-group-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header modal-header-sticky">
          <div>
            <h2>{mode === 'create' ? 'Novo grupo de permissao' : 'Editar grupo'}</h2>
            <p className="modal-subtitle">Escolha o tipo de tela e marque cada botao ou acao individualmente.</p>
          </div>
          <button type="button" onClick={onClose} className="modal-close-btn">X</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form modal-form-spacious">
          <div className="form-grid two-columns">
            <div className="form-group">
              <label>Nome do grupo</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex.: Financeiro, Operacao, Auditoria"
              />
            </div>
            <div className="form-group">
              <label>Descricao</label>
              <input
                type="text"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Explique o uso desse perfil"
              />
            </div>
          </div>

          <div className="permission-screen-type-grid">
            {screenTypeOptions.map((option) => (
              <button
                type="button"
                key={option.key}
                className={`permission-screen-type-card ${activeScreenType === option.key ? 'active' : ''}`}
                onClick={() => setActiveScreenType(option.key)}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
                <small>{option.count} tela(s)</small>
              </button>
            ))}
          </div>

          <div className="permission-rule-grid">
            {visibleModules.map((module) => {
              const permissionActions = module.actions.filter((action) => !isVisibilityRule(action))
              const visibilityActions = module.actions.filter(isVisibilityRule)
              const enabledCount = permissionActions.filter((action) => isRuleActive(module.key, action.key)).length
              const visibleButtonCount = visibilityActions.filter((action) => isButtonVisible(module.key, action.key)).length
              const totalControls = permissionActions.length + visibilityActions.length
              const allEnabled = totalControls > 0 && enabledCount + visibleButtonCount === totalControls

              return (
                <section className="permission-rule-card" key={module.key}>
                  <div className="permission-rule-card-header">
                    <div>
                      <h3>{module.label}</h3>
                      <p>{module.description}</p>
                      <span className="permission-screen-chip">{module.screen_type_label}</span>
                    </div>
                    <button type="button" className="outline-soft mini" onClick={() => toggleModule(module, !allEnabled)}>
                      {allEnabled ? 'Limpar' : 'Marcar tudo'}
                    </button>
                  </div>

                  <div className="permission-rule-sections">
                    <div className="permission-rule-section">
                      <div className="permission-rule-section-title">
                        <strong>Permissoes da tela</strong>
                        <span>{enabledCount} de {permissionActions.length} ativa(s)</span>
                      </div>
                      <div className="permission-action-list permission-action-grid">
                        {permissionActions.map((action) => (
                          <label className="permission-action-toggle" key={action.key}>
                            <input
                              type="checkbox"
                              checked={isRuleActive(module.key, action.key)}
                              onChange={() => toggleRule(module.key, action.key)}
                            />
                            <span>{action.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {visibilityActions.length ? (
                      <div className="permission-rule-section permission-visibility-box">
                        <div className="permission-rule-section-title">
                          <strong>Botoes visiveis</strong>
                          <span>{visibleButtonCount} de {visibilityActions.length} visivel(is)</span>
                        </div>
                        <div className="permission-action-list permission-action-grid">
                          {visibilityActions.map((action) => (
                            <label className="permission-action-toggle visibility-toggle" key={action.key}>
                              <input
                                type="checkbox"
                                checked={isButtonVisible(module.key, action.key)}
                                onChange={() => toggleVisibilityRule(module.key, action.key)}
                              />
                              <span>{getVisibilityLabel(action.label)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              )
            })}
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          <div className="modal-actions modal-actions-sticky">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Salvar grupo'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ProfileGroupsPage() {
  const [groups, setGroups] = useState<PermissionGroup[]>([])
  const [modules, setModules] = useState<PermissionModule[]>([])
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState<PermissionGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const loadData = async () => {
    setError('')
    setLoading(true)
    try {
      const [catalogResponse, groupsResponse] = await Promise.all([
        api.get('/permission-groups/catalog'),
        api.get('/permission-groups'),
      ])
      setModules(catalogResponse.data.modules || [])
      setGroups(Array.isArray(groupsResponse.data) ? groupsResponse.data : [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Nao foi possivel carregar os grupos de permissao.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const groupSummary = useMemo(() => {
    return groups.reduce(
      (acc, group) => {
        if (group.is_system) acc.system += 1
        else acc.custom += 1
        return acc
      },
      { system: 0, custom: 0 }
    )
  }, [groups])

  const saveGroup = async (payload: PermissionGroupFormState, group?: PermissionGroup) => {
    setSaving(true)
    try {
      if (group) {
        await api.patch(`/permission-groups/${group.id}`, payload)
      } else {
        await api.post('/permission-groups', payload)
      }
      setIsCreating(false)
      setEditingGroup(null)
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingGroup) return
    setDeleting(true)
    try {
      await api.delete(`/permission-groups/${deletingGroup.id}`)
      setDeletingGroup(null)
      await loadData()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="users-page-wrap profile-groups-page">
      <SectionHeader
        title="Perfis e permissoes"
        action={
          <button type="button" className="outline-soft" onClick={() => setIsCreating(true)}>
            <Plus size={18} />
            Novo grupo
          </button>
        }
      />

      <section className="profile-groups-hero">
        <div>
          <span>Controle exclusivo do super admin</span>
          <h2>Configure grupos, botoes e regras de acesso</h2>
          <p>Crie perfis personalizados usando as mesmas areas e acoes que ja existem no sistema.</p>
        </div>
        <div className="profile-groups-metrics">
          <strong>{groups.length}</strong>
          <span>{groupSummary.system} padrao - {groupSummary.custom} customizado(s)</span>
        </div>
      </section>

      {loading ? <div className="empty-users-state">Carregando grupos...</div> : null}
      {error ? <div className="form-error">{error}</div> : null}

      <div className="profile-group-grid">
        {!loading && !error ? groups.map((group) => {
          const enabledRules = Object.values(group.rules || {}).reduce(
            (total, actions) => total + Object.values(actions).filter(Boolean).length,
            0
          )

          return (
            <article className="profile-group-card" key={group.id}>
              <div className="profile-group-card-top">
                <div className="profile-group-icon"><ShieldCheck size={22} /></div>
                <div>
                  <h3>{group.name}</h3>
                  <p>{group.description || 'Sem descricao cadastrada.'}</p>
                </div>
              </div>
              <div className="profile-group-tags">
                <span className={`pill-status ${group.is_system ? 'warn' : 'ok'}`}>{group.is_system ? 'Padrao do sistema' : 'Customizado'}</span>
                <span className="pill-status mute">{enabledRules} regra(s)</span>
              </div>
              <div className="profile-group-actions">
                <button type="button" className="action-chip primary icon-action-chip" onClick={() => setEditingGroup(group)}>
                  <Edit3 size={15} />
                  Editar
                </button>
                <button
                  type="button"
                  className="action-chip danger icon-action-chip"
                  disabled={group.is_system}
                  title={group.is_system ? 'Grupos padrao nao podem ser excluidos' : 'Excluir grupo'}
                  onClick={() => setDeletingGroup(group)}
                >
                  <Trash2 size={15} />
                  Deletar
                </button>
              </div>
            </article>
          )
        }) : null}
      </div>

      {isCreating ? (
        <PermissionGroupModal
          mode="create"
          modules={modules}
          loading={saving}
          onClose={() => setIsCreating(false)}
          onSubmit={(payload) => saveGroup(payload)}
        />
      ) : null}

      {editingGroup ? (
        <PermissionGroupModal
          mode="edit"
          group={editingGroup}
          modules={modules}
          loading={saving}
          onClose={() => setEditingGroup(null)}
          onSubmit={(payload) => saveGroup(payload, editingGroup)}
        />
      ) : null}

      {deletingGroup ? (
        <ConfirmActionModal
          title="Excluir grupo"
          message={`Tem certeza que deseja excluir o grupo ${deletingGroup.name}? Essa acao nao podera ser desfeita.`}
          confirmLabel="Excluir grupo"
          tone="danger"
          loading={deleting}
          onClose={() => {
            if (deleting) return
            setDeletingGroup(null)
          }}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  )
}
