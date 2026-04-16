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
  const [error, setError] = useState('')

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

  const toggleModule = (module: PermissionModule, enabled: boolean) => {
    setForm((current) => ({
      ...current,
      rules: {
        ...current.rules,
        [module.key]: module.actions.reduce<Record<string, boolean>>((acc, action) => {
          acc[action.key] = enabled
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
            <p className="modal-subtitle">Escolha o que esse perfil pode visualizar, criar, editar, deletar ou ocultar.</p>
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

          <div className="permission-rule-grid">
            {modules.map((module) => {
              const enabledCount = module.actions.filter((action) => form.rules[module.key]?.[action.key]).length
              const allEnabled = enabledCount === module.actions.length

              return (
                <section className="permission-rule-card" key={module.key}>
                  <div className="permission-rule-card-header">
                    <div>
                      <h3>{module.label}</h3>
                      <p>{module.description}</p>
                    </div>
                    <button type="button" className="outline-soft mini" onClick={() => toggleModule(module, !allEnabled)}>
                      {allEnabled ? 'Limpar' : 'Marcar tudo'}
                    </button>
                  </div>

                  <div className="permission-action-list">
                    {module.actions.map((action) => (
                      <label className="permission-action-toggle" key={action.key}>
                        <input
                          type="checkbox"
                          checked={!!form.rules[module.key]?.[action.key]}
                          onChange={() => toggleRule(module.key, action.key)}
                        />
                        <span>{action.label}</span>
                      </label>
                    ))}
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
