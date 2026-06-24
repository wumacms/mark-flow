import { createContext, useContext, useEffect, useState, useRef } from 'react'
import type { User } from '@/types'
import { getSupabase, getCurrentUser, isSupabaseConfigured } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  refreshUser: () => Promise<void>
  isConfigured: boolean
  authError: string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  refreshUser: async () => {},
  isConfigured: false,
  authError: null,
})

// Timeout in ms after which loading is considered stuck
const LOADING_TIMEOUT = 10000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Safety net: if loading takes too long, try fallback from local session
  useEffect(() => {
    if (loading) {
      loadingTimeoutRef.current = setTimeout(async () => {
        console.warn('Auth loading timeout reached, attempting fallback from local session')
        try {
          const supabase = getSupabase()
          const { data: { session: localSession } } = await supabase.auth.getSession()
          if (localSession) {
            console.log('Found local session, using fallback user')
            setUser(buildFallbackUser(localSession))
            setSession(localSession)
            setAuthError(null)
          } else {
            setAuthError('加载超时，请刷新页面重试')
          }
        } catch {
          setAuthError('加载超时，请刷新页面重试')
        }
        setLoading(false)
      }, LOADING_TIMEOUT)
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }
    }
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [loading])

  const refreshUser = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    try {
      const u = await getCurrentUser()
      setUser(u)
      setAuthError(null)
    } catch (err: any) {
      console.error('Failed to refresh user:', err)
      setAuthError(err.message || '获取用户信息失败')
    } finally {
      setLoading(false)
    }
  }

  // Build a minimal user from session as fallback
  const buildFallbackUser = (s: Session): User => {
    const githubUser = s.user
    return {
      id: githubUser.id,
      email: githubUser.email || '',
      name: githubUser.user_metadata?.full_name || githubUser.user_metadata?.name || '',
      avatar_url: githubUser.user_metadata?.avatar_url || '',
      github_username: githubUser.user_metadata?.user_name || '',
      github_token: s.provider_token || '',
      repo_name: '',
      repo_initialized: false,
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let cancelled = false
    const supabase = getSupabase()

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        if (cancelled) return
        setSession(s)
        if (s) {
          // Set fallback user immediately so the app can proceed
          // even if getCurrentUser (network call) is slow
          const fallback = buildFallbackUser(s)
          setUser(fallback)
          setAuthError(null)

          // Then try to get the full user profile (network call)
          getCurrentUser()
            .then(u => {
              if (cancelled) return
              if (u) {
                setUser(u)
              }
              // If getCurrentUser returns null (JWT invalid), keep fallback user
              // and let the auth state change listener handle sign-out if needed
              setAuthError(null)
              setLoading(false)
            })
            .catch((err) => {
              if (cancelled) return
              console.error('Failed to get current user, keeping fallback:', err)
              // Fallback user is already set, just stop loading
              setAuthError(null)
              setLoading(false)
            })
        } else {
          setLoading(false)
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Failed to get session:', err)
        setAuthError(err.message || '获取会话失败')
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (cancelled) return
        console.log('Auth state changed:', event, s ? 'session exists' : 'no session')
        setSession(s)
        if (s) {
          try {
            const u = await getCurrentUser()
            if (u) {
              setUser(u)
            } else {
              // Session exists but JWT invalid — sign out happened inside getCurrentUser
              setUser(null)
              setSession(null)
            }
            setAuthError(null)
          } catch {
            // Re-check if session still valid
            const { data: { session: freshS } } = await supabase.auth.getSession()
            if (freshS) {
              setUser(buildFallbackUser(freshS))
            } else {
              setUser(null)
              setSession(null)
            }
            setAuthError(null)
          }
        } else {
          setUser(null)
          setAuthError(null)
        }
        setLoading(false)
      }
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, refreshUser, isConfigured: isSupabaseConfigured, authError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
