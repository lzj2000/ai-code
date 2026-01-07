'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean, error?: string }>
  register: (email: string, password: string, name: string) => Promise<{ success: boolean, error?: string }>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSession = async () => {
    try {
      const res = await fetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      }
      else {
        setUser(null)
      }
    }
    catch {
      setUser(null)
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshSession()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.success) {
        // Login successful, refresh session to get user info from cookie-based session API
        await refreshSession()
        return { success: true }
      }
      else {
        return { success: false, error: data.error }
      }
    }
    catch {
      return { success: false, error: 'Network error' }
    }
  }

  const register = async (email: string, password: string, name: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 移除 redirectTo 参数，让服务端使用默认的客户端回调地址 /api/auth/callback
        body: JSON.stringify({ email, password, name }),
      })
      const data = await res.json()
      if (data.success) {
        return { success: true }
      }
      else {
        return { success: false, error: data.error }
      }
    }
    catch {
      return { success: false, error: 'Network error' }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
    }
    catch {
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
