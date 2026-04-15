import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AdminNoticeModal } from '../components/modals/AdminNoticeModal'
import { InvestorWelcomeModal } from '../components/modals/InvestorWelcomeModal'
import api from '../lib/api'

export interface User {
  id: number
  nome: string
  sobrenome?: string | null
  email: string
  telefone?: string | null
  role: 'super_admin' | 'admin' | 'investor'
  is_authorized: boolean
  must_change_password?: boolean
  admin_message?: string | null
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ mustChangePassword: boolean }>
  logout: () => void
  checkAuth: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  requestPasswordResetCode: (emailOrCpf: string) => Promise<string>
  resetPasswordWithCode: (emailOrCpf: string, code: string, newPassword: string) => Promise<string>
  register: (nome: string, cpf: string, email: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000
const HEARTBEAT_INTERVAL_MS = 60 * 1000
const INVESTOR_FEATURES_NOTICE_VERSION = 'v1'
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']

const getInvestorFeaturesNoticeKey = (userId: number) => `portal_investor_features_notice_${INVESTOR_FEATURES_NOTICE_VERSION}_${userId}`

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [adminNotice, setAdminNotice] = useState('')
  const [showInvestorWelcome, setShowInvestorWelcome] = useState(false)
  const [isAcknowledgingNotice, setIsAcknowledgingNotice] = useState(false)
  const inactivityTimeoutRef = useRef<number | null>(null)
  const heartbeatIntervalRef = useRef<number | null>(null)

  const clearSession = () => {
    localStorage.removeItem('portal_token')
    localStorage.removeItem('portal_user')
    setUser(null)
    setAdminNotice('')
    setShowInvestorWelcome(false)
  }

  const clearInactivityTimer = () => {
    if (inactivityTimeoutRef.current !== null) {
      window.clearTimeout(inactivityTimeoutRef.current)
      inactivityTimeoutRef.current = null
    }
  }

  const clearHeartbeatInterval = () => {
    if (heartbeatIntervalRef.current !== null) {
      window.clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
  }

  const sendHeartbeat = async () => {
    if (!localStorage.getItem('portal_token')) return
    if (document.visibilityState === 'hidden') return
    try {
      const { data } = await api.post<{ ok: boolean; admin_message?: string | null }>('/auth/heartbeat')
      setAdminNotice(data.admin_message || '')
    } catch {
      // O interceptor global ja trata 401 e limpeza de sessao.
    }
  }

  const logout = () => {
    clearInactivityTimer()
    clearHeartbeatInterval()
    clearSession()
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }

  const resetInactivityTimer = () => {
    clearInactivityTimer()
    if (!localStorage.getItem('portal_token')) return
    inactivityTimeoutRef.current = window.setTimeout(() => {
      logout()
    }, INACTIVITY_TIMEOUT_MS)
  }

  const checkAuth = async () => {
    const token = localStorage.getItem('portal_token')

    if (!token) {
      clearSession()
      setIsLoading(false)
      return
    }

    try {
      const { data } = await api.get<User>('/auth/me')
      localStorage.setItem('portal_user', JSON.stringify(data))
      setUser(data)
      setAdminNotice(data.admin_message || '')
    } catch {
      clearSession()
    } finally {
      setIsLoading(false)
    }
  }

  const acknowledgeAdminNotice = async () => {
    setIsAcknowledgingNotice(true)
    try {
      await api.post('/auth/acknowledge-message')
      setAdminNotice('')
    } finally {
      setIsAcknowledgingNotice(false)
    }
  }

  const acknowledgeInvestorWelcome = () => {
    if (user) {
      localStorage.setItem(getInvestorFeaturesNoticeKey(user.id), 'acknowledged')
    }
    setShowInvestorWelcome(false)
  }

  useEffect(() => {
    void checkAuth()
  }, [])

  useEffect(() => {
    const handleAdminMessage = (event: Event) => {
      const customEvent = event as CustomEvent<string>
      if (typeof customEvent.detail === 'string' && customEvent.detail.trim()) {
        setAdminNotice(customEvent.detail.trim())
      }
    }

    window.addEventListener('portal-admin-message', handleAdminMessage as EventListener)
    return () => {
      window.removeEventListener('portal-admin-message', handleAdminMessage as EventListener)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      clearInactivityTimer()
      clearHeartbeatInterval()
      return
    }

    resetInactivityTimer()
    void sendHeartbeat()
    clearHeartbeatInterval()
    heartbeatIntervalRef.current = window.setInterval(() => {
      void sendHeartbeat()
    }, HEARTBEAT_INTERVAL_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void sendHeartbeat()
      }
    }

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true })
    })
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetInactivityTimer)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInactivityTimer()
      clearHeartbeatInterval()
    }
  }, [user])

  useEffect(() => {
    if (!user || user.role !== 'investor') {
      setShowInvestorWelcome(false)
      return
    }

    setShowInvestorWelcome(localStorage.getItem(getInvestorFeaturesNoticeKey(user.id)) !== 'acknowledged')
  }, [user])

  const login = async (email: string, password: string) => {
    const { data } = await api.post<{
      access_token: string
      token_type: string
      must_change_password?: boolean
      user: User
    }>('/auth/login', { email, password })

    localStorage.setItem('portal_token', data.access_token)
    localStorage.setItem('portal_user', JSON.stringify(data.user))
    setUser(data.user)
    setAdminNotice(data.user.admin_message || '')
    resetInactivityTimer()

    return {
      mustChangePassword: Boolean(data.must_change_password),
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })

    const { data } = await api.get<User>('/auth/me')
    localStorage.setItem('portal_user', JSON.stringify(data))
    setUser(data)
    setAdminNotice(data.admin_message || '')
    resetInactivityTimer()
  }

  const requestPasswordResetCode = async (emailOrCpf: string) => {
    const { data } = await api.post<{ message: string }>('/auth/forgot-password', {
      email_or_cpf: emailOrCpf,
    })
    return data.message
  }

  async function resetPasswordWithCode(emailOrCpf: string, code: string, newPassword: string): Promise<string> {
    const response = await api.post('/auth/reset-password-with-code', {
      email_or_cpf: emailOrCpf,
      code,
      new_password: newPassword,
    })

    return response.data.message || 'Senha redefinida com sucesso!'
  }

  const register = async () => {
    throw new Error('Cadastro publico desativado')
  }

  const value = useMemo<AuthContextType>(() => ({
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    logout,
    checkAuth,
    changePassword,
    requestPasswordResetCode,
    resetPasswordWithCode,
    register,
  }), [user, isLoading])

  return (
    <AuthContext.Provider value={value}>
      {children}
      {adminNotice ? (
        <AdminNoticeModal
          message={adminNotice}
          loading={isAcknowledgingNotice}
          onConfirm={acknowledgeAdminNotice}
        />
      ) : null}
      {!adminNotice && showInvestorWelcome && user?.role === 'investor' ? (
        <InvestorWelcomeModal onConfirm={acknowledgeInvestorWelcome} />
      ) : null}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }

  return context
}
