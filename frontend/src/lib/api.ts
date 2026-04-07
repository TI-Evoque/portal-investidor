import axios from 'axios'
import { beginApiRequest, endApiRequest } from './apiLoading'

const rawBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '/api/v1'
const baseURL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl

const api = axios.create({
  baseURL,
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  beginApiRequest()
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
    endApiRequest()
    return response
  },
  (error) => {
    endApiRequest()
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
