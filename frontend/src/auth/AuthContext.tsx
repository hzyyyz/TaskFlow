import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getCurrentUser, loginUser } from '../api/auth'
import { errorMessage, setAuthNotice, tokenStore, UNAUTHORIZED_EVENT } from '../api/client'
import type { User } from '../types/api'

interface AuthValue {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(tokenStore.get()))

  useEffect(() => {
    const controller = new AbortController()
    if (tokenStore.get()) {
      getCurrentUser(controller.signal)
        .then((current) => setUser(current))
        .catch((failure) => {
          if (!controller.signal.aborted) {
            if (!tokenStore.get()) return
            setAuthNotice(errorMessage(failure, '无法验证登录状态，请重新登录'))
            tokenStore.clear()
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }
    const expire = () => {
      setUser(null)
      setLoading(false)
    }
    window.addEventListener(UNAUTHORIZED_EVENT, expire)
    return () => {
      controller.abort()
      window.removeEventListener(UNAUTHORIZED_EVENT, expire)
    }
  }, [])

  const login = async (username: string, password: string) => {
    const token = await loginUser(username, password)
    tokenStore.set(token)
    try {
      const current = await getCurrentUser()
      setUser(current)
    } catch (error) {
      tokenStore.clear()
      throw error
    }
  }

  const logout = () => {
    tokenStore.clear()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is missing')
  return context
}
