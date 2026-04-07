import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Search, UserX, UsersRound } from 'lucide-react'
import { SendUserMessageModal } from '../../components/modals/SendUserMessageModal'
import api from '../../lib/api'
import { formatPhone } from '../../lib/phone'
import { ConfirmActionModal } from '../../components/modals/ConfirmActionModal'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAuth } from '../../contexts/AuthContext'
import { Unit, User } from '../../types'

type PendingAccessAction = {
  title: string
  message: string
  confirmLabel: string
  tone?: 'default' | 'danger'
  run: () => Promise<void>
}

export function AccessVisibilityPage() {
  const { user: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.role === 'super_admin'
  const [users, setUsers] = useState<User[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [pendingAction, setPendingAction] = useState<PendingAccessAction | null>(null)
  const [messageTarget, setMessageTarget] = useState<User | null>(null)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isConfirmingAction, setIsConfirmingAction] = useState(false)
  const [successToast, setSuccessToast] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadOnlineUsers = async (showLoading = false) => {
    if (showLoading) setIsLoading(true)
    setLoadError('')

    try {
      const response = await api.get('/users/online')
      const payload = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.items)
          ? response.data.items
          : []
      setUsers(payload)
    } catch (error: any) {
      console.error('Erro ao carregar usuarios online', error)
      setUsers([])
      setLoadError(error.response?.data?.detail || 'Nao foi possivel carregar os usuarios online.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadUnits = async () => {
      try {
        const unitsResponse = await api.get('/units')
        setUnits(Array.isArray(unitsResponse.data) ? unitsResponse.data : [])
      } catch {
        setUnits([])
      }
    }

    void Promise.all([loadUnits(), loadOnlineUsers(true)])
  }, [])

  const visibleUsers = useMemo(
    () =>
      (isSuperAdmin ? users : users.filter((user) => user.role !== 'super_admin')).filter(
        (user) => user.id !== currentUser?.id
      ),
    [currentUser?.id, isSuperAdmin, users]
  )

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase().trim()

    return visibleUsers.filter((user) => {
      const fullName = `${user.nome} ${user.sobrenome || ''}`.trim().toLowerCase()
      if (!normalizedSearch) return true

      return (
        fullName.includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        (user.telefone || '').toLowerCase().includes(normalizedSearch)
      )
    })
  }, [searchTerm, visibleUsers])

  const reloadOnlineUsers = async () => {
    const refreshedUsers = await api.get('/users/online')
    const payload = Array.isArray(refreshedUsers.data)
      ? refreshedUsers.data
      : Array.isArray(refreshedUsers.data?.items)
        ? refreshedUsers.data.items
        : []
    setUsers(payload)
  }

  const confirmPendingAction = async () => {
    if (!pendingAction) return
    setIsConfirmingAction(true)
    try {
      await pendingAction.run()
      setPendingAction(null)
    } catch (error: any) {
      setLoadError(error.response?.data?.detail || 'Nao foi possivel concluir essa acao.')
    } finally {
      setIsConfirmingAction(false)
    }
  }

  useEffect(() => {
    if (!successToast) return
    const timeoutId = window.setTimeout(() => setSuccessToast(''), 3200)
    return () => window.clearTimeout(timeoutId)
  }, [successToast])

  return (
    <div className="users-page-wrap">
      {successToast ? <div className="floating-success-toast">{successToast}</div> : null}
      <SectionHeader
        title="Visibilidade de acessos"
        action={
          <button type="button" className="outline-soft" onClick={() => void loadOnlineUsers(true)}>
            Atualizar
          </button>
        }
      />

      <div className="search-bar user-search">
        <input
          placeholder="Pesquisar por nome, e-mail ou telefone"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <button type="button" aria-label="Buscar acessos">
          <Search size={18} />
        </button>
      </div>

      <section className="user-visibility-section">
        <div className="user-visibility-header">
          <div>
            <h3>Usuarios visiveis no sistema</h3>
            <p>Lista em tempo real de quem esta usando o sistema agora, com acoes rapidas para mandar mensagem e derrubar o acesso.</p>
          </div>
          <div className="user-visibility-counter">
            <strong>{filteredUsers.length}</strong>
            <span>usuarios</span>
          </div>
        </div>

        <div className="user-visibility-grid">
          {isLoading ? <div className="empty-users-state user-visibility-empty">Carregando acessos...</div> : null}
          {!isLoading && loadError ? <div className="form-error">{loadError}</div> : null}
          {!isLoading && !loadError && filteredUsers.length === 0 ? (
            <div className="empty-users-state user-visibility-empty">Nenhum usuario encontrado para essa busca.</div>
          ) : null}

          {!isLoading && !loadError
            ? filteredUsers.map((user) => {
                const linkedUnits = units.filter((unit) => (user.unit_ids || []).includes(unit.id))
                const userName = `${user.nome} ${user.sobrenome || ''}`.trim()
                const roleLabel = user.role === 'super_admin' ? 'Super admin' : user.role === 'admin' ? 'Administrador' : 'Investidor'
                const isCurrentSession = user.id === currentUser?.id

                return (
                  <article key={user.id} className="user-visibility-card">
                    <div className="user-visibility-top">
                      <div className="user-visibility-avatar">{user.nome.slice(0, 1).toUpperCase()}</div>
                      <div className="user-visibility-copy">
                        <strong>{userName}</strong>
                        <span>{roleLabel}</span>
                      </div>
                    </div>

                    <div className="user-visibility-meta">
                      <span className={`pill-status ${user.is_active ? 'ok' : 'mute'}`}>{user.is_active ? 'Ativo' : 'Bloqueado'}</span>
                      <span className={`pill-status ${user.is_authorized ? 'ok' : 'warn'}`}>{user.is_authorized ? 'Acesso liberado' : 'Acesso pendente'}</span>
                    </div>

                    <div className="user-visibility-contact">
                      <div>{user.email}</div>
                      <div>{user.telefone ? formatPhone(user.telefone) : 'Sem telefone cadastrado'}</div>
                      <div className="user-units-inline">
                        <UsersRound size={14} />
                        <strong>{linkedUnits.length}</strong> unidade(s)
                        {linkedUnits.length > 0 ? ` • ${linkedUnits.slice(0, 2).map((unit) => unit.nome).join(', ')}` : ' • Nenhuma unidade vinculada'}
                      </div>
                    </div>

                    <div className="user-visibility-actions">
                      {!isCurrentSession ? (
                        <button
                          type="button"
                          className="action-chip danger icon-action-chip"
                          onClick={() =>
                            setPendingAction({
                              title: user.is_active ? 'Derrubar acesso' : 'Reativar acesso',
                              message: user.is_active
                                ? `Tem certeza que deseja derrubar o acesso de ${userName} agora? O usuario precisara fazer login novamente.`
                                : `Tem certeza que deseja reativar o acesso de ${userName}?`,
                              confirmLabel: user.is_active ? 'Derrubar acesso' : 'Reativar acesso',
                              tone: 'danger',
                              run: async () => {
                                if (user.is_active) {
                                  await api.post(`/users/${user.id}/kick-access`)
                                  setSuccessToast(`Acesso de ${userName} derrubado com sucesso.`)
                                } else {
                                  await api.patch(`/users/${user.id}`, { is_active: true })
                                  setSuccessToast(`Acesso de ${userName} reativado com sucesso.`)
                                }
                                await loadOnlineUsers(false)
                              },
                            })
                          }
                        >
                          <UserX size={15} />
                          {user.is_active ? 'Derrubar acesso' : 'Reativar'}
                        </button>
                      ) : (
                        <button type="button" className="action-chip icon-action-chip" disabled>
                          <UserX size={15} />
                          Sessao atual
                        </button>
                      )}

                      {!isCurrentSession ? (
                        <button
                          type="button"
                          className="action-chip icon-action-chip"
                          onClick={() => setMessageTarget(user)}
                        >
                          <MessageCircle size={15} />
                          Mandar mensagem
                        </button>
                      ) : null}
                    </div>
                  </article>
                )
              })
            : null}
        </div>
      </section>

      {pendingAction ? (
        <ConfirmActionModal
          title={pendingAction.title}
          message={pendingAction.message}
          confirmLabel={pendingAction.confirmLabel}
          tone={pendingAction.tone}
          loading={isConfirmingAction}
          onClose={() => {
            if (isConfirmingAction) return
            setPendingAction(null)
          }}
          onConfirm={confirmPendingAction}
        />
      ) : null}
      {messageTarget ? (
        <SendUserMessageModal
          userName={`${messageTarget.nome} ${messageTarget.sobrenome || ''}`.trim()}
          loading={isSendingMessage}
          onClose={() => {
            if (isSendingMessage) return
            setMessageTarget(null)
          }}
          onSubmit={async (message) => {
            setIsSendingMessage(true)
            try {
              await api.post(`/users/${messageTarget.id}/admin-message`, { message })
              setMessageTarget(null)
            } finally {
              setIsSendingMessage(false)
            }
          }}
        />
      ) : null}
    </div>
  )
}
