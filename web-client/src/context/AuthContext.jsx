/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'
import api from '@/services/api'

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
    return JSON.parse(atob(parts[1]))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => safeJsonParse(localStorage.getItem('user')))
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken'))
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (accessToken) {
      const payload = decodeJwtPayload(accessToken)
      if (payload) {
        const email = payload.email
        const role = payload.role
        const verified = payload.verified

        setUser((prev) => {
          const existing = prev || {}
          const name = existing.name || (email ? String(email).split('@')[0] : undefined)
          return {
            ...existing,
            email: email ?? existing.email,
            role: role ?? existing.role,
            doctorVerified: verified ?? existing.doctorVerified,
            name,
          }
        })
      } else {
        setAccessToken(null)
        localStorage.removeItem('accessToken')
      }
    }
    setLoading(false)
  }, [accessToken])

  const login = ({ accessToken: newAccessToken, refreshToken: newRefreshToken, user: newUser }) => {
    localStorage.setItem('accessToken', newAccessToken)
    localStorage.setItem('refreshToken', newRefreshToken)
    localStorage.setItem('user', JSON.stringify(newUser))

    setAccessToken(newAccessToken)
    setRefreshToken(newRefreshToken)
    setUser(newUser)
  }

  const clearSession = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)
  }

  const logout = async () => {
    const currentRefreshToken = refreshToken || localStorage.getItem('refreshToken')
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
    <AuthContext.Provider value={{ user, accessToken, refreshToken, loading, login, logout }}>
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
