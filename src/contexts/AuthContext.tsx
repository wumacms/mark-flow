import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@/types'
import { getSupabase, getCurrentUser, isSupabaseConfigured } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  refreshUser: () => Promise<void>
  isConfigured: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  refreshUser: async () => {},
  isConfigured: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    const u = await getCurrentUser()
    setUser(u)
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    const supabase = getSupabase()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s) {
        getCurrentUser().then(u => {
          setUser(u)
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s)
        if (s) {
          const u = await getCurrentUser()
          setUser(u)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, refreshUser, isConfigured: isSupabaseConfigured }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
