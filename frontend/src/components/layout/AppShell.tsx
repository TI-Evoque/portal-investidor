import { LayoutDashboard, LogOut, Building2, Users, FolderOpen, House, Radar } from 'lucide-react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import evoqueMark from '../../assets/evoque-mark.svg'

export function AppShell() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const adminItems = [
    ['/dashboard', 'Dashboard', LayoutDashboard],
    ['/usuarios', 'Usuarios', Users],
    ['/unidades', 'Unidades', Building2],
    ['/arquivos', 'Arquivos', FolderOpen],
    ['/visibilidade-acessos', 'Acessos', Radar],
  ] as const

  const investorItems = [['/investidor', 'Minhas Unidades', House]] as const

  const items =
    user?.role === 'super_admin'
      ? adminItems
      : user?.role === 'admin'
        ? adminItems.filter(([to]) => to !== '/visibilidade-acessos')
        : investorItems

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userInitial = user?.nome ? user.nome.split(' ')[0][0].toUpperCase() : '?'
  const userName = user?.nome ? user.nome.split(' ')[0] : 'Usuario'
  const roleLabel = user?.role === 'super_admin' ? 'Super admin' : user?.role === 'admin' ? 'Administrador' : 'Investidor'
  const accessLabel = user?.role === 'investor' ? (user?.is_authorized ? 'Acesso liberado' : 'Aguardando aprovacao') : 'Acesso interno'
  const accessTone = user?.role === 'investor' ? (user?.is_authorized ? 'ok' : 'warn') : 'dark'

  return (
    <div className="portal-layout">
      <aside className="sidebar">
        <div className="brand-block">
          <img src={evoqueMark} alt="Logomarca Evoque Academia" className="brand-mark" />
          <div className="brand-name">EVOQUE ACADEMIA</div>
        </div>
        <nav className="sidebar-nav">
          {items.map(([to, label, Icon]) => (
            <NavLink key={label} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} strokeWidth={2.2} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="dark-pill" onClick={handleLogout}>
          <LogOut size={18} />
          Sair
        </button>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div />
          <div className="topbar-user-card">
            <div className="topbar-user-copy">
              <span className="topbar-user-kicker">Sessao atual</span>
              <strong>Bem-vindo, {userName}</strong>
              <div className="topbar-user-badges">
                <span className="topbar-role-badge">{roleLabel}</span>
                <span className={`topbar-access-badge ${accessTone}`}>{accessLabel}</span>
              </div>
            </div>
            <div className="topbar-avatar">{userInitial}</div>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
