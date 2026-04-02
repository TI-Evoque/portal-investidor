import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import api from '../lib/api'

export interface User {
  id: number
  nome: string
  sobrenome?: string | null
  email: string
  telefone?: string | null
  role: 'admin' | 'investor'
  is_authorized: boolean
  must_change_password?: boolean
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearSession = () => {
    localStorage.removeItem('portal_token')
    localStorage.removeItem('portal_user')
    setUser(null)
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
    } catch {
      clearSession()
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void checkAuth()
  }, [])

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

    return {
      mustChangePassword: Boolean(data.must_change_password),
    }
  }

  const logout = () => {
    clearSession()
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })

    const { data } = await api.get<User>('/auth/me')
    localStorage.setItem('portal_user', JSON.stringify(data))
    setUser(data)
  }

  const requestPasswordResetCode = async (emailOrCpf: string) => {
    const { data } = await api.post<{ message: string }>('/auth/forgot-password', {
      email_or_cpf: emailOrCpf,
    })
    return data.message
  }

  const resetPasswordWithCode = async (emailOrCpf: string, code: string, newPassword: string) => {
    const { data } = await api.post<{ message: string }>('/auth/reset-password-with-code', {
      email_or_cpf: emailOrCpf,
      code,
      new_password: newPassword,
    })
    return data.message
  }

  const register = async () => {
    throw new Error('Cadastro público desativado')
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }

  return context
}
