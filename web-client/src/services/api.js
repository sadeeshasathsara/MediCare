import axios from 'axios'
import { clearAuthItems, getAuthItem, removeAuthItem, setAuthItem } from '@/services/authStorage'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

const refreshClient = axios.create({
  baseURL: api.defaults.baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise = null

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const accessToken = getAuthItem('accessToken')
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const originalRequest = error.config

    const requestUrl = originalRequest?.url || ''
    const isAuthEndpoint =
      requestUrl.startsWith('/auth/login') ||
      requestUrl.startsWith('/auth/register') ||
      requestUrl.startsWith('/auth/refresh')

    // Let auth pages handle their own errors (don’t auto-refresh/redirect on these).
    if (status === 401 && isAuthEndpoint) {
      return Promise.reject(error)
    }

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = getAuthItem('refreshToken')
      if (!refreshToken) {
        clearAuthItems()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        if (!refreshPromise) {
          refreshPromise = refreshClient.post('/auth/refresh', { refreshToken })
        }

        const refreshResponse = await refreshPromise
        const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data || {}

        if (!accessToken || !newRefreshToken) {
          throw new Error('Invalid refresh response')
        }

        setAuthItem('accessToken', accessToken)
        setAuthItem('refreshToken', newRefreshToken)

        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch {
        removeAuthItem('accessToken')
        removeAuthItem('refreshToken')
        removeAuthItem('user')
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        refreshPromise = null
      }
    }

    return Promise.reject(error)
  }
)

export default api
