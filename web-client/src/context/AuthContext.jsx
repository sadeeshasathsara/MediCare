/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

function base64UrlDecode(input) {
  if (!input) throw new Error('missing jwt payload')
  let s = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = s.length % 4
  if (pad === 2) s += '=='
  else if (pad === 3) s += '='
  else if (pad !== 0) throw new Error('invalid base64url')
  return atob(s)
}

function decodeJwtPayload(token) {
  if (!token) return null
  try {
    const payloadPart = token.split('.')[1]
    const payloadJson = base64UrlDecode(payloadPart)
    return JSON.parse(payloadJson)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem('token')
    const payload = decodeJwtPayload(stored)
    if (!payload) {
      localStorage.removeItem('token')
      return null
    }
    return stored
  })

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('token')
    return decodeJwtPayload(stored)
  })

  const loading = false

  const login = (newToken) => {
    const payload = decodeJwtPayload(newToken)
    if (!payload) {
      throw new Error('Invalid token')
    }

    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(payload)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
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
