import { useState } from 'react'
import { Building2, FolderOpen, House, LayoutDashboard, LogOut, Menu, Radar, ShieldCheck, X, Users } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import evoqueMark from '../../assets/evoque-mark.svg'
import { useAuth } from '../../contexts/AuthContext'

export function AppShell() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const isSuperAdmin = user?.role === 'super_admin'

  const adminItems = [
    ['/inicio', 'Inicio', House],
    ['/dashboard', 'Dashboard', LayoutDashboard],
    ['/usuarios', 'Usuarios', Users],
    ['/unidades', 'Unidades', Building2],
    ['/arquivos', 'Arquivos', FolderOpen],
  ] as const

  const superAdminItems = [
    ['/visibilidade-acessos', 'Acessos', Radar],
  ] as const

  const investorItems = [
    ['/dashboard', 'Dashboard', LayoutDashboard],
    ['/investidor', 'Minhas Unidades', House],
  ] as const

  const moduleByPath: Record<string, string> = {
    '/inicio': 'home',
    '/dashboard': 'dashboard',
    '/usuarios': 'users',
    '/unidades': 'units',
    '/arquivos': 'files',
    '/visibilidade-acessos': 'access_visibility',
    '/grupos': 'profiles',
    '/investidor': 'investor_portal',
  }

  const canViewPath = (path: string) => {
    if (user?.role === 'super_admin') return true
    const moduleKey = moduleByPath[path]
    if (!moduleKey) return true
    if (!user?.permissions) return true
    return user.permissions[moduleKey]?.view !== false
  }

  const items =
    isSuperAdmin
      ? [...adminItems, ...superAdminItems]
      : user?.role === 'admin'
        ? adminItems.filter(([to]) => canViewPath(to))
        : investorItems.filter(([to]) => canViewPath(to))

  const handleLogout = () => {
    setIsMobileMenuOpen(false)
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
        <button
          type="button"
          className="mobile-menu-toggle"
          aria-expanded={isMobileMenuOpen}
          aria-controls="portal-mobile-menu"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          <span>Menu</span>
        </button>
        <nav id="portal-mobile-menu" className={`sidebar-nav ${isMobileMenuOpen ? 'open' : ''}`}>
          {items.map(([to, label, Icon]) => (
            <NavLink
              key={label}
              to={to}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} strokeWidth={2.2} />
              {label}
            </NavLink>
          ))}
          {isSuperAdmin ? (
            <NavLink
              to="/grupos"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <ShieldCheck size={18} strokeWidth={2.2} />
              Grupos
            </NavLink>
          ) : null}
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
