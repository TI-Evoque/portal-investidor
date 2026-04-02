import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, KeyRound, Lock, LockOpen, PencilLine, Shield, ShieldOff, Trash2, UsersRound } from 'lucide-react'
import api from '../../lib/api'
import { User, Unit } from '../../types'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Pagination } from '../../components/ui/Pagination'
import { UserEditModal } from '../../components/modals/UserEditModal'
import { CreateUserPayload, UserCreateModal } from '../../components/modals/UserCreateModal'
import { UserCreatedModal } from '../../components/modals/UserCreatedModal'

const ITEMS_PER_PAGE = 10

type CreatedUserState = {
  email: string
  password: string
  mustChangePassword: boolean
  title?: string
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingUser, setEditingUser] = useState<User | undefined>()
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [createdUser, setCreatedUser] = useState<CreatedUserState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadUsers = async () => {
    setLoadError('')
    try {
      const res = await api.get('/users')
      const payload = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.items) ? res.data.items : []
      setUsers(payload)
    } catch (error: any) {
      console.error('Erro ao carregar usuários', error)
      setUsers([])
      setLoadError(error.response?.data?.detail || 'Não foi possível carregar os usuários.')
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

  useEffect(() => {
    void Promise.all([loadUsers(), loadUnits()])
  }, [])

  const filteredUsers = useMemo(() => users.filter((user) => {
    const fullName = `${user.nome} ${user.sobrenome || ''}`.trim()
    const normalizedSearch = searchTerm.toLowerCase().trim()
    if (!normalizedSearch) return true

    return fullName.toLowerCase().includes(normalizedSearch) ||
      user.email.toLowerCase().includes(normalizedSearch) ||
      (user.telefone || '').toLowerCase().includes(normalizedSearch)
  }), [users, searchTerm])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE))
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [filteredUsers.length, currentPage])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE))
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const updateUserOnList = (updatedUser: User) => {
    setUsers((prev) => prev.map((user) => user.id === updatedUser.id ? updatedUser : user))
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
      title: 'Usuário criado',
    })
    setCurrentPage(1)
    await loadUsers()
  }

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return
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

  return (
    <div className="users-page-wrap">
      <SectionHeader title="Usuários" action={<button className="outline-soft" onClick={() => setIsCreatingUser(true)}>Novo usuário</button>} />

      <div className="search-bar user-search">
        <input
          placeholder="Pesquisar por nome, e-mail ou telefone"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
        />
        <button type="button">⌕</button>
      </div>

      <div className="users-summary-bar">
        <span>{users.length} cadastrado(s)</span>
        <span>{users.filter((user) => user.is_active).length} ativo(s)</span>
        <span>{users.filter((user) => user.role === 'admin').length} admin(s)</span>
      </div>

      <div className="list-stack">
        {isLoading ? <div className="empty-users-state">Carregando usuários...</div> : null}
        {!isLoading && loadError ? <div className="form-error">{loadError}</div> : null}
        {!isLoading && !loadError && paginatedUsers.length === 0 ? (
          <div className="empty-users-state">{searchTerm ? 'Nenhum usuário encontrado com esse filtro.' : 'Nenhum usuário cadastrado ainda.'}</div>
        ) : null}

        {paginatedUsers.map((user) => {
          const linkedUnits = units.filter((unit) => (user.unit_ids || []).includes(unit.id))
          return (
            <div className="user-card user-card-rich" key={user.id}>
              <div className="unit-photo user-avatar-badge">{user.nome.slice(0, 1).toUpperCase()}</div>
              <div>
                <div className="user-name">{user.nome} {user.sobrenome || ''}</div>
                <div className="user-mail">{user.email}</div>
                <div className="user-mail">{user.telefone || 'Sem telefone cadastrado'}</div>
                <div className="user-units-inline">
                  <UsersRound size={14} />
                  <strong>{linkedUnits.length}</strong> unidade(s)
                  {linkedUnits.length > 0 ? ` • ${linkedUnits.slice(0, 2).map((unit) => unit.nome).join(', ')}${linkedUnits.length > 2 ? '…' : ''}` : ' • Nenhuma unidade vinculada'}
                </div>
              </div>
              <div className="user-role-stack">
                <div className="user-role">{user.role === 'admin' ? 'Administrador' : 'Investidor'}</div>
                <div className={`pill-status ${user.is_authorized ? 'ok' : 'warn'}`}>{user.is_authorized ? 'Acesso liberado' : 'Acesso pendente'}</div>
              </div>
              <div className="user-role-stack">
                <div className={`pill-status ${user.is_active ? 'ok' : 'mute'}`}>{user.is_active ? 'Ativo' : 'Bloqueado'}</div>
                <div className={`pill-status ${user.must_change_password ? 'warn' : 'ok'}`}>{user.must_change_password ? 'Troca de senha pendente' : 'Senha regular'}</div>
              </div>
              <div className="user-actions-grid">
                <button onClick={() => setEditingUser(user)} className="action-chip primary icon-action-chip"><PencilLine size={15} /> Editar</button>
                <button onClick={() => quickPatchUser(user, { role: user.role === 'admin' ? 'investor' : 'admin' }).catch(() => undefined)} className="action-chip icon-action-chip"><Shield size={15} /> {user.role === 'admin' ? 'Remover admin' : 'Dar admin'}</button>
                <button onClick={() => quickPatchUser(user, { is_authorized: !user.is_authorized }).catch(() => undefined)} className="action-chip icon-action-chip"><BadgeCheck size={15} /> {user.is_authorized ? 'Revogar acesso' : 'Liberar acesso'}</button>
                <button onClick={() => quickPatchUser(user, { is_active: !user.is_active }).catch(() => undefined)} className="action-chip icon-action-chip">{user.is_active ? <Lock size={15} /> : <LockOpen size={15} />} {user.is_active ? 'Bloquear' : 'Desbloquear'}</button>
                <button onClick={() => handleResetPassword(user, !!user.must_change_password)} className="action-chip icon-action-chip"><KeyRound size={15} /> Resetar senha</button>
                <button onClick={() => handleDeleteUser(user.id)} className="action-chip danger icon-action-chip"><Trash2 size={15} /> Excluir</button>
              </div>
            </div>
          )
        })}
      </div>

      {filteredUsers.length > 0 ? (
        <>
          <div style={{ textAlign: 'center', fontSize: '13px', color: '#666', marginTop: '16px' }}>
            Mostrando {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredUsers.length)} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} de {filteredUsers.length} usuário(s)
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      ) : null}

      {editingUser ? <UserEditModal user={editingUser} units={units} onClose={() => setEditingUser(undefined)} onSubmit={handleSubmitUser} onResetPassword={(mustChangePassword) => handleResetPassword(editingUser, mustChangePassword)} /> : null}
      {isCreatingUser ? <UserCreateModal units={units} onClose={() => setIsCreatingUser(false)} onSubmit={handleCreateUser} /> : null}
      {createdUser ? <UserCreatedModal email={createdUser.email} password={createdUser.password} mustChangePassword={createdUser.mustChangePassword} title={createdUser.title} onClose={() => setCreatedUser(null)} /> : null}
    </div>
  )
}
