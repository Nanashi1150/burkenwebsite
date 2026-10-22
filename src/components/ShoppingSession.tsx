"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export type ShoppingUser = { id: string; name: string; role: 'customer' | 'staff' | 'admin' | 'rider' }
export type ShoppingSession = { status: 'checking' | 'authenticated' | 'guest' | 'error'; user: ShoppingUser | null }
type SessionContext = { session: ShoppingSession; verifySession: () => Promise<ShoppingSession>; clearSession: () => void }
const Context = createContext<SessionContext | null>(null)

export function ShoppingSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ShoppingSession>({ status: 'checking', user: null })
  const version = useRef(0)
  const pathname = usePathname()
  const clearSession = useCallback(() => {
    version.current++
    setSession({ status: 'guest', user: null })
  }, [])
  const verifySession = useCallback(async (): Promise<ShoppingSession> => {
    const requestVersion = ++version.current
    let next: ShoppingSession
    try {
      const response = await fetch('/api/app/session', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error('Session verification unavailable')
      const result = await response.json()
      next = result.authenticated === true && typeof result.user?.id === 'string'
        ? { status: 'authenticated', user: result.user }
        : { status: 'guest', user: null }
    } catch { next = { status: 'error', user: null } }
    if (version.current === requestVersion) setSession(next)
    else return { status: 'guest', user: null }
    return next
  }, [])

  useEffect(() => {
    void verifySession()
    const refresh = () => { if (!document.hidden) void verifySession() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { version.current++; window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [pathname, verifySession])
  return <Context.Provider value={{ session, verifySession, clearSession }}>{children}</Context.Provider>
}

export function useShoppingSession() {
  const context = useContext(Context)
  if (!context) throw new Error('ShoppingSessionProvider is required')
  return context
}
