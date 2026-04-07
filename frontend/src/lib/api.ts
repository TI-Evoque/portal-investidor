import axios from 'axios'
import { beginApiRequest, endApiRequest } from './apiLoading'

const rawBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '/api/v1'
const baseURL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl

const api = axios.create({
  baseURL,
  timeout: 15000,
})

function shouldTrackLoading(url?: string) {
  if (!url) return true

  return !url.includes('/auth/heartbeat') && !url.includes('/auth/acknowledge-message')
}

function emitAdminMessageFromHeaders(headers?: Record<string, unknown>) {
  const headerValue = headers?.['x-admin-message']
  if (typeof headerValue === 'string' && headerValue.trim()) {
    window.dispatchEvent(new CustomEvent('portal-admin-message', { detail: headerValue.trim() }))
  }
}

api.interceptors.request.use((config) => {
  if (shouldTrackLoading(config.url)) {
    beginApiRequest()
    config.headers['X-Skip-Global-Loading'] = 'false'
  } else {
    config.headers['X-Skip-Global-Loading'] = 'true'
  }
  const token = localStorage.getItem('portal_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  endApiRequest()
  return Promise.reject(error)
})

api.interceptors.response.use(
  (response) => {
    emitAdminMessageFromHeaders(response.headers as Record<string, unknown>)
    if (response.config.headers['X-Skip-Global-Loading'] !== 'true') {
      endApiRequest()
    }
    return response
  },
  (error) => {
    emitAdminMessageFromHeaders(error.response?.headers as Record<string, unknown> | undefined)
    if (error.config?.headers?.['X-Skip-Global-Loading'] !== 'true') {
      endApiRequest()
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('portal_token')
      localStorage.removeItem('portal_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
