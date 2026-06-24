import { createContext, useContext, useEffect, useState, useRef } from 'react'
import type { User } from '@/types'
import { getSupabase, getCurrentUser, isSupabaseConfigured } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { verifyGitHubToken } from '@/lib/github'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  refreshUser: () => Promise<void>
  isConfigured: boolean
  authError: string | null
  isTokenValid: boolean | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  refreshUser: async () => {},
  isConfigured: false,
  authError: null,
  isTokenValid: null,
})

// Timeout in ms after which loading is considered stuck
const LOADING_TIMEOUT = 10000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null)
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Verify token when user or github_token changes
  useEffect(() => {
    let active = true
    const checkToken = async () => {
      if (!user?.github_token) {
        setIsTokenValid(false)
        return
      }
      setIsTokenValid(null)
      const details = await verifyGitHubToken(user.github_token)
      if (active) {
        setIsTokenValid(!!details)
      }
    }
    checkToken()
    return () => {
      active = false
    }
  }, [user?.github_token])

  // Safety net: if loading takes too long, try fallback from local session storage
  useEffect(() => {
    if (loading) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('Auth loading timeout reached, attempting fallback from localStorage')
        try {
          // Read session directly from localStorage to avoid any Supabase lock issues.
          // The Supabase storage key follows the pattern: sb-<project-ref>-auth-token
          const storageKey = `sb-${new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`
          const raw = localStorage.getItem(storageKey)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed?.user) {
              console.log('Found local session in localStorage, using fallback user')
              setUser({
                id: parsed.user.id,
                email: parsed.user.email || '',
                name: parsed.user.user_metadata?.full_name || parsed.user.user_metadata?.name || '',
                avatar_url: parsed.user.user_metadata?.avatar_url || '',
                github_username: parsed.user.user_metadata?.user_name || '',
                github_token: parsed.provider_token || '',
                repo_name: '',
                repo_initialized: false,
              })
              setAuthError(null)
            } else {
              setAuthError('加载超时，请刷新页面重试')
            }
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

    // 1. Register auth state change listener for SUBSEQUENT events only.
    //    Skip INITIAL_SESSION — it fires before the client's PostgREST auth
    //    token is set, so RLS-protected DB queries would fail silently.
    //    Initial profile loading is handled by getSession() below.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (cancelled) return
        console.log('Auth state changed:', event, s ? 'session exists' : 'no session')

        // INITIAL_SESSION is handled by getSession() below
        if (event === 'INITIAL_SESSION') return

        setSession(s)
        if (s) {
          const fallback = buildFallbackUser(s)
          setUser(fallback)
          setAuthError(null)

          // Defer the DB query to prevent deadlocking Supabase's internal lock
          // which is held during onAuthStateChange event broadcasting.
          setTimeout(async () => {
            try {
              const u = await getCurrentUser(s)
              if (!cancelled && u) {
                setUser(u)
              }
            } catch (err) {
              console.error('Failed to get full user profile, using fallback:', err)
            }
          }, 0)
        } else {
          setUser(null)
          setAuthError(null)
        }
        if (!cancelled) {
          setLoading(false)
        }
      }
    )

    // 2. Load initial session and full profile.
    //    getSession() resolves AFTER the client is fully initialised,
    //    so the PostgREST auth token is set and RLS queries work.
    supabase.auth.getSession()
      .then(async ({ data: { session: s } }) => {
        if (cancelled) return
        setSession(s)
        if (s) {
          // Set fallback user immediately
          const fallback = buildFallbackUser(s)
          setUser(fallback)
          setAuthError(null)

          // Load full profile from database
          try {
            const u = await getCurrentUser(s)
            if (!cancelled && u) {
              setUser(u)
            }
          } catch (err) {
            console.error('Failed to get full user profile, using fallback:', err)
          }
        }
        if (!cancelled) {
          setLoading(false)
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Failed to get session:', err)
        setAuthError(err.message || '获取会话失败')
        setLoading(false)
      })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, refreshUser, isConfigured: isSupabaseConfigured, authError, isTokenValid }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
