import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Lazy initialization - only create client if configured
let _supabase: SupabaseClient | null = null

export function getSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.')
  }
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  }
  return _supabase
}

// For backwards compatibility - but will throw if not configured
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

export async function signInWithGitHub() {
  const client = getSupabase()
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: {
      scopes: 'repo',
      redirectTo: window.location.origin,
    },
  })
  return { data, error }
}

export async function signOut() {
  const client = getSupabase()
  const { error } = await client.auth.signOut()
  return { error }
}

export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabase()

  // auth.getUser() validates the JWT against the server.
  // If the session is stale (e.g. after server restart), this will fail.
  let user: any = null
  try {
    const { data, error } = await client.auth.getUser()
    if (error) {
      // Check if this is a definitive auth error vs a transient network error
      const isAuthError = error.message?.includes('invalid') ||
        error.message?.includes('expired') ||
        error.message?.includes('JWT') ||
        error.status === 401 ||
        error.status === 403
      if (isAuthError) {
        console.warn('JWT validation failed, clearing stale session:', error.message)
        await client.auth.signOut()
        return null
      }
      // For transient errors (network issues, timeouts), don't sign out
      // Let the caller use fallback user from local session
      console.warn('auth.getUser() failed (transient), not clearing session:', error.message)
      return null
    }
    user = data.user
  } catch (err: any) {
    // Network-level error — don't destroy the local session
    console.warn('auth.getUser() threw (likely network error), not clearing session:', err.message)
    return null
  }

  if (!user) return null

  // Get GitHub token from session
  const { data: { session } } = await client.auth.getSession()
  const providerToken = session?.provider_token || ''

  // Check if user profile exists in DB (maybeSingle returns null instead of throwing when no row found)
  let profile: any = null
  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (!error) {
      profile = data
    }
  } catch {
    // Table might not exist yet — proceed with fallback
    profile = null
  }

  if (profile) {
    // Update GitHub token if we have a fresh one from session
    if (providerToken && providerToken !== profile.github_token) {
      await client
        .from('profiles')
        .update({ github_token: providerToken })
        .eq('id', user.id)
    }

    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      avatar_url: user.user_metadata?.avatar_url || '',
      github_username: profile.github_username || user.user_metadata?.user_name || '',
      github_token: providerToken || profile.github_token || '',
      repo_name: profile.repo_name || '',
      repo_initialized: profile.repo_initialized || false,
    }
  }

  // Create profile if not exists
  const github_username = user.user_metadata?.user_name || ''
  try {
    await client.from('profiles').upsert({
      id: user.id,
      github_username,
      github_token: providerToken,
      repo_name: '',
      repo_initialized: false,
    })
  } catch {
    // Table might not exist — that's ok, user can still use the app
  }

  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || user.user_metadata?.name || '',
    avatar_url: user.user_metadata?.avatar_url || '',
    github_username,
    github_token: providerToken,
    repo_name: '',
    repo_initialized: false,
  }
}

export async function updateUserProfile(userId: string, updates: Partial<User>) {
  const client = getSupabase()
  const updateData: Record<string, any> = {}
  if (updates.github_username !== undefined) updateData.github_username = updates.github_username
  if (updates.github_token !== undefined) updateData.github_token = updates.github_token
  if (updates.repo_name !== undefined) updateData.repo_name = updates.repo_name
  if (updates.repo_initialized !== undefined) updateData.repo_initialized = updates.repo_initialized

  const { error } = await client
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
  return { error }
}
