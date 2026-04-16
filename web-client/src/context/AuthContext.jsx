/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'
import api from '@/services/api'
import { clearAuthItems, getAuthItem, setAuthItem } from '@/services/authStorage'

const AuthContext = createContext(null)

function safeJsonParse(value) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null

    // JWT uses base64url encoding.
    let s = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = s.length % 4
    if (pad === 2) s += '=='
    else if (pad === 3) s += '='
    else if (pad !== 0) return null

    return JSON.parse(atob(s))
  } catch {
    return null
  }
}

function getValidAccessTokenFromStorage() {
  const token = getAuthItem('accessToken')
  if (!token) return null
  const payload = decodeJwtPayload(token)
  if (!payload) {
    clearAuthItems()
    return null
  }
  return token
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => safeJsonParse(getAuthItem('user')))
  const [accessToken, setAccessToken] = useState(() => getValidAccessTokenFromStorage())
  const [refreshToken, setRefreshToken] = useState(getAuthItem('refreshToken'))

  const effectiveUser = useMemo(() => {
    const existing = user || {}

    if (!accessToken) {
      return existing
    }

    const payload = decodeJwtPayload(accessToken)
    if (!payload) {
      return existing
    }

    const id = existing.id || existing.userId || payload.sub
    const email = payload.email
    const role = payload.role
    const verified = payload.verified
    const name = existing.name || (email ? String(email).split('@')[0] : undefined)

    return {
      ...existing,
      id,
      email: email ?? existing.email,
      role: role ?? existing.role,
      doctorVerified: verified ?? existing.doctorVerified,
      name,
    }
  }, [accessToken, user])

  const loading = false

  const login = ({ accessToken: newAccessToken, refreshToken: newRefreshToken, user: newUser }) => {
    setAuthItem('accessToken', newAccessToken)
    setAuthItem('refreshToken', newRefreshToken)
    setAuthItem('user', JSON.stringify(newUser))

    setAccessToken(newAccessToken)
    setRefreshToken(newRefreshToken)
    setUser(newUser)
  }

  const clearSession = () => {
    clearAuthItems()
    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)
  }

  const logout = async () => {
    const currentRefreshToken = refreshToken || getAuthItem('refreshToken')
    if (currentRefreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken: currentRefreshToken })
      } catch {
        // Ignore logout failures; we still clear local session.
      }
    }
    clearSession()
  }

  return (
    <AuthContext.Provider value={{ user: effectiveUser, accessToken, refreshToken, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
