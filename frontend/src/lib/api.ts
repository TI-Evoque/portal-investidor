import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { beginApiRequest, endApiRequest } from './apiLoading'

type RetryableAxiosConfig = InternalAxiosRequestConfig & {
  __baseUrlFallbackIndex?: number
}

function normalizeBaseUrl(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function buildBaseUrlCandidates() {
  const candidates = new Set<string>()
  const envBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim()

  if (envBaseUrl) {
    candidates.add(normalizeBaseUrl(envBaseUrl))
  }

  candidates.add('/api/v1')

  if (typeof window === 'undefined') {
    return Array.from(candidates)
  }

  const { origin, hostname, protocol } = window.location
  candidates.add(normalizeBaseUrl(`${origin}/api/v1`))

  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    const hostnameParts = hostname.split('.')
    if (hostnameParts.length >= 3) {
      const rootDomain = hostnameParts.slice(-2).join('.')
      candidates.add(normalizeBaseUrl(`${protocol}//api.${rootDomain}/api/v1`))
    }

    candidates.add(normalizeBaseUrl(`${protocol}//${hostname}:8000/api/v1`))
  }

  return Array.from(candidates)
}

const baseUrlCandidates = buildBaseUrlCandidates()

const api = axios.create({
  baseURL: baseUrlCandidates[0] || '/api/v1',
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
  const nextConfig = config as RetryableAxiosConfig
  if (typeof nextConfig.__baseUrlFallbackIndex !== 'number') {
    nextConfig.__baseUrlFallbackIndex = 0
  }
  nextConfig.baseURL = baseUrlCandidates[nextConfig.__baseUrlFallbackIndex] || api.defaults.baseURL
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
    const requestConfig = error.config as RetryableAxiosConfig | undefined
    const method = requestConfig?.method?.toLowerCase()
    const currentFallbackIndex = requestConfig?.__baseUrlFallbackIndex ?? 0
    const canRetryWithAnotherBaseUrl = (
      method === 'get'
      && currentFallbackIndex < baseUrlCandidates.length - 1
      && (!error.response || error.response.status === 404)
    )

    if (canRetryWithAnotherBaseUrl && requestConfig) {
      if (requestConfig.headers?.['X-Skip-Global-Loading'] !== 'true') {
        endApiRequest()
      }
      requestConfig.__baseUrlFallbackIndex = currentFallbackIndex + 1
      return api.request(requestConfig)
    }

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
