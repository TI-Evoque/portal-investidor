import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, KeyRound, Lock, LockOpen, PencilLine, Shield, Trash2, UsersRound } from 'lucide-react'
import api from '../../lib/api'
import { formatPhone } from '../../lib/phone'
import { PermissionGroupOption, User, Unit } from '../../types'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Pagination } from '../../components/ui/Pagination'
import { UserEditModal } from '../../components/modals/UserEditModal'
import { CreateUserPayload, UserCreateModal } from '../../components/modals/UserCreateModal'
import { UserCreatedModal } from '../../components/modals/UserCreatedModal'
import { ConfirmActionModal } from '../../components/modals/ConfirmActionModal'
import { useAuth } from '../../contexts/AuthContext'

const ITEMS_PER_PAGE = 10

type CreatedUserState = {
  email: string
  password: string
  mustChangePassword: boolean
  title?: string
}

type PendingUserAction = {
  title: string
  message: string
  confirmLabel: string
  tone?: 'default' | 'danger'
  run: () => Promise<void>
}

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.role === 'super_admin'
  const userPermissions = currentUser?.permissions?.users
  const [users, setUsers] = useState<User[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroupOption[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [summaryFilter, setSummaryFilter] = useState<'all' | 'active' | 'inactive' | 'admin' | 'super_admin'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingUser, setEditingUser] = useState<User | undefined>()
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [createdUser, setCreatedUser] = useState<CreatedUserState | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingUserAction | null>(null)
  const [isConfirmingAction, setIsConfirmingAction] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadUsers = async () => {
    setLoadError('')
    try {
      const res = await api.get('/users')
      const payload = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.items) ? res.data.items : []
      setUsers(payload)
    } catch (error: any) {
      console.error('Erro ao carregar usuarios', error)
      setUsers([])
      setLoadError(error.response?.data?.detail || 'Nao foi possivel carregar os usuarios.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadUnits = async () => {
    try {
      const res = await api.get('/units')
      setUnits(Array.isArray(res.data) ? res.data : [])
    } catch {
      setUnits([])
    }
  }

  const loadPermissionGroups = async () => {
    if (!isSuperAdmin) {
      setPermissionGroups([])
      return
    }
    try {
      const res = await api.get('/permission-groups')
      setPermissionGroups(Array.isArray(res.data) ? res.data : [])
    } catch {
      setPermissionGroups([])
    }
  }

  useEffect(() => {
    void Promise.all([loadUsers(), loadUnits(), loadPermissionGroups()])
  }, [isSuperAdmin])

  const visibleUsers = useMemo(
    () => (isSuperAdmin ? users : users.filter((user) => user.role !== 'super_admin')),
    [isSuperAdmin, users]
  )

  const filteredUsers = useMemo(
    () =>
      visibleUsers.filter((user) => {
        if (summaryFilter === 'active' && !user.is_active) return false
        if (summaryFilter === 'inactive' && user.is_active) return false
        if (summaryFilter === 'admin' && user.role !== 'admin') return false
        if (summaryFilter === 'super_admin' && user.role !== 'super_admin') return false

        const fullName = `${user.nome} ${user.sobrenome || ''}`.trim()
        const normalizedSearch = searchTerm.toLowerCase().trim()
        if (!normalizedSearch) return true

        return (
          fullName.toLowerCase().includes(normalizedSearch) ||
          user.email.toLowerCase().includes(normalizedSearch) ||
          (user.telefone || '').toLowerCase().includes(normalizedSearch)
        )
      }),
    [visibleUsers, summaryFilter, searchTerm]
  )

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE))
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [filteredUsers.length, currentPage])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE))
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const updateUserOnList = (updatedUser: User) => {
    setUsers((prev) => prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)))
  }

  const handleSubmitUser = async (data: Partial<User>) => {
    const response = await api.patch(`/users/${editingUser!.id}`, data)
    updateUserOnList(response.data)
    await loadUsers()
  }

  const quickPatchUser = async (user: User, data: Partial<User>) => {
    const response = await api.patch(`/users/${user.id}`, data)
    updateUserOnList(response.data)
    await loadUsers()
  }

  const handleCreateUser = async (data: CreateUserPayload) => {
    const response = await api.post('/users', data)
    const created = response.data.user as User
    setUsers((prev) => [created, ...prev.filter((user) => user.id !== created.id)])
    setCreatedUser({
      email: created.email,
      password: response.data.generated_password,
      mustChangePassword: !!created.must_change_password,
      title: 'Usuario criado',
    })
    setCurrentPage(1)
    await loadUsers()
  }

  const handleDeleteUser = async (userId: number) => {
    await api.delete(`/users/${userId}`)
    setUsers((prev) => prev.filter((user) => user.id !== userId))
    await loadUsers()
  }

  const handleResetPassword = async (user: User, mustChangePassword: boolean) => {
    const response = await api.post(`/users/${user.id}/reset-password`, null, {
      params: { force_change_on_first_access: mustChangePassword },
    })
    updateUserOnList(response.data.user)
    setCreatedUser({
      email: response.data.user.email,
      password: response.data.generated_password,
      mustChangePassword: !!response.data.must_change_password,
      title: 'Senha resetada',
    })
    await loadUsers()
  }

  const summaryItems = [
    { key: 'all' as const, label: `${visibleUsers.length} cadastrado(s)` },
    { key: 'active' as const, label: `${visibleUsers.filter((user) => user.is_active).length} ativo(s)` },
    { key: 'inactive' as const, label: `${visibleUsers.filter((user) => !user.is_active).length} desativado(s)` },
    { key: 'admin' as const, label: `${visibleUsers.filter((user) => user.role === 'admin').length} admin(s)` },
    ...(isSuperAdmin ? [{ key: 'super_admin' as const, label: `${visibleUsers.filter((user) => user.role === 'super_admin').length} super admin(s)` }] : []),
  ]

  const openActionConfirmation = (action: PendingUserAction) => {
    setPendingAction(action)
  }

  const canUseUserAction = (action: string, hideKey?: string) => {
    if (!userPermissions) return true
    if (userPermissions[action] === false) return false
    if (hideKey && userPermissions[hideKey] === true) return false
    return true
  }

  const canOpenUserEditor = canUseUserAction('edit', 'hide_edit_button') || canUseUserAction('assign_units')

  const confirmPendingAction = async () => {
    if (!pendingAction) return
    setIsConfirmingAction(true)
    try {
      await pendingAction.run()
      setPendingAction(null)
    } finally {
      setIsConfirmingAction(false)
    }
  }

  return (
    <div className="users-page-wrap">
      <SectionHeader
        title="Usuarios"
        action={
          canUseUserAction('create', 'hide_create_button') ? (
            <button className="outline-soft" onClick={() => setIsCreatingUser(true)}>Novo usuario</button>
          ) : null
        }
      />

      <div className="search-bar user-search">
        <input
          placeholder="Pesquisar por nome, e-mail ou telefone"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
        />
        <button type="button" aria-label="Buscar usuarios">⌕</button>
      </div>

      <div className="users-summary-bar">
        {summaryItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`users-summary-chip ${summaryFilter === item.key ? 'active' : ''}`}
            onClick={() => {
              setSummaryFilter(item.key)
              setCurrentPage(1)
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="list-stack">
        {isLoading ? <div className="empty-users-state">Carregando usuarios...</div> : null}
        {!isLoading && loadError ? <div className="form-error">{loadError}</div> : null}
        {!isLoading && !loadError && paginatedUsers.length === 0 ? (
          <div className="empty-users-state">
            {searchTerm ? 'Nenhum usuario encontrado com esse filtro.' : 'Nenhum usuario cadastrado ainda.'}
          </div>
        ) : null}

        {paginatedUsers.map((user) => {
          const linkedUnits = units.filter((unit) => (user.unit_ids || []).includes(unit.id))
          const userName = `${user.nome} ${user.sobrenome || ''}`.trim()

          return (
            <div className="user-card user-card-rich" key={user.id}>
              <div className="unit-photo user-avatar-badge">{user.nome.slice(0, 1).toUpperCase()}</div>
              <div>
                <div className="user-name">{userName}</div>
                <div className="user-mail">{user.email}</div>
                <div className="user-mail">{user.telefone ? formatPhone(user.telefone) : 'Sem telefone cadastrado'}</div>
                <div className="user-units-inline">
                  <UsersRound size={14} />
                  <strong>{linkedUnits.length}</strong> unidade(s)
                  {linkedUnits.length > 0 ? ` • ${linkedUnits.slice(0, 2).map((unit) => unit.nome).join(', ')}${linkedUnits.length > 2 ? '…' : ''}` : ' • Nenhuma unidade vinculada'}
                </div>
              </div>
              <div className="user-role-stack">
                <div className="user-role">
                  {user.role === 'super_admin' ? 'Super admin' : user.role === 'admin' ? 'Administrador' : 'Investidor'}
                </div>
                <div className={`pill-status ${user.is_authorized ? 'ok' : 'warn'}`}>{user.is_authorized ? 'Acesso liberado' : 'Acesso pendente'}</div>
              </div>
              <div className="user-role-stack">
                <div className={`pill-status ${user.is_active ? 'ok' : 'mute'}`}>{user.is_active ? 'Ativo' : 'Bloqueado'}</div>
                <div className={`pill-status ${user.must_change_password ? 'warn' : 'ok'}`}>{user.must_change_password ? 'Troca de senha pendente' : 'Senha regular'}</div>
              </div>
              <div className="user-actions-grid">
                {(currentUser?.role === 'admin' || isSuperAdmin) && canOpenUserEditor ? (
                  <button onClick={() => setEditingUser(user)} className="action-chip primary icon-action-chip"><PencilLine size={15} /> Editar</button>
                ) : null}
                {isSuperAdmin && user.role !== 'super_admin' && canUseUserAction('grant_admin', 'hide_grant_admin_button') ? (
                  <button
                    onClick={() =>
                      openActionConfirmation({
                        title: user.role === 'admin' ? 'Remover administrador' : 'Conceder administrador',
                        message: user.role === 'admin'
                          ? `Tem certeza que deseja remover o perfil de administrador de ${userName}?`
                          : `Tem certeza que deseja conceder perfil de administrador para ${userName}?`,
                        confirmLabel: user.role === 'admin' ? 'Remover admin' : 'Dar admin',
                        run: async () => { await quickPatchUser(user, { role: user.role === 'admin' ? 'investor' : 'admin' }) },
                      })
                    }
                    className="action-chip icon-action-chip"
                  ><Shield size={15} /> {user.role === 'admin' ? 'Remover admin' : 'Dar admin'}</button>
                ) : null}
                {canUseUserAction('edit', 'hide_revoke_access_button') ? (
                  <button
                    onClick={() =>
                      openActionConfirmation({
                        title: user.is_authorized ? 'Revogar acesso' : 'Liberar acesso',
                        message: user.is_authorized
                          ? `Tem certeza que deseja revogar o acesso de ${userName} ao portal?`
                          : `Tem certeza que deseja liberar o acesso de ${userName} ao portal?`,
                        confirmLabel: user.is_authorized ? 'Revogar acesso' : 'Liberar acesso',
                        run: async () => { await quickPatchUser(user, { is_authorized: !user.is_authorized }) },
                      })
                    }
                    className="action-chip icon-action-chip"
                  ><BadgeCheck size={15} /> {user.is_authorized ? 'Revogar acesso' : 'Liberar acesso'}</button>
                ) : null}
                {canUseUserAction('edit', 'hide_block_button') ? (
                  <button
                    onClick={() =>
                      openActionConfirmation({
                        title: user.is_active ? 'Bloquear usuario' : 'Desbloquear usuario',
                        message: user.is_active
                          ? `Tem certeza que deseja bloquear ${userName} e impedir novos acessos?`
                          : `Tem certeza que deseja desbloquear ${userName} e permitir novo acesso ao sistema?`,
                        confirmLabel: user.is_active ? 'Bloquear' : 'Desbloquear',
                        run: async () => { await quickPatchUser(user, { is_active: !user.is_active }) },
                      })
                    }
                    className="action-chip icon-action-chip"
                  >{user.is_active ? <Lock size={15} /> : <LockOpen size={15} />} {user.is_active ? 'Bloquear' : 'Desbloquear'}</button>
                ) : null}
                {(currentUser?.role === 'admin' || isSuperAdmin) && canUseUserAction('reset_password', 'hide_reset_password_button') ? (
                  <button
                    onClick={() =>
                      openActionConfirmation({
                        title: 'Resetar senha',
                        message: `Tem certeza que deseja gerar uma nova senha temporaria para ${userName}? No proximo login, ele tera que cadastrar uma nova senha.`,
                        confirmLabel: 'Resetar senha',
                        run: async () => { await handleResetPassword(user, true) },
                      })
                    }
                    className="action-chip icon-action-chip"
                  ><KeyRound size={15} /> Resetar senha</button>
                ) : null}
                {isSuperAdmin && canUseUserAction('delete', 'hide_delete_button') ? (
                  <button
                    onClick={() =>
                      openActionConfirmation({
                        title: 'Excluir usuario',
                        message: `Tem certeza que deseja excluir ${userName}? Essa acao nao podera ser desfeita.`,
                        confirmLabel: 'Excluir usuario',
                        tone: 'danger',
                        run: async () => { await handleDeleteUser(user.id) },
                      })
                    }
                    className="action-chip danger icon-action-chip"
                  ><Trash2 size={15} /> Excluir</button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {filteredUsers.length > 0 ? (
        <>
          <div style={{ textAlign: 'center', fontSize: '13px', color: '#666', marginTop: '16px' }}>
            Mostrando {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredUsers.length)} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} de {filteredUsers.length} usuario(s)
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      ) : null}

      {editingUser ? (
        <UserEditModal
          user={editingUser}
          units={units}
          permissionGroups={permissionGroups}
          currentUserPermissions={userPermissions}
          currentUserRole={currentUser?.role}
          onClose={() => setEditingUser(undefined)}
          onSubmit={handleSubmitUser}
          onResetPassword={(mustChangePassword) => handleResetPassword(editingUser, mustChangePassword)}
        />
      ) : null}
      {isCreatingUser ? <UserCreateModal units={units} permissionGroups={permissionGroups} onClose={() => setIsCreatingUser(false)} onSubmit={handleCreateUser} /> : null}
      {createdUser ? <UserCreatedModal email={createdUser.email} password={createdUser.password} mustChangePassword={createdUser.mustChangePassword} title={createdUser.title} onClose={() => setCreatedUser(null)} /> : null}
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
    </div>
  )
}
