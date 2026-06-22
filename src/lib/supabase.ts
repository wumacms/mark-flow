import { createClient } from '@supabase/supabase-js'
import type { User } from '@/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export async function signInWithGitHub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      scopes: 'repo',
      redirectTo: window.location.origin,
    },
  })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get GitHub token from session
  const { data: { session } } = await supabase.auth.getSession()
  const providerToken = session?.provider_token || ''

  // Check if user profile exists in DB
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile) {
    // Update GitHub token if we have a fresh one from session
    if (providerToken && providerToken !== profile.github_token) {
      await supabase
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
  const newProfile = {
    id: user.id,
    github_username,
    github_token: providerToken,
    repo_name: '',
    repo_initialized: false,
  }

  await supabase.from('profiles').upsert(newProfile)

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
  const updateData: Record<string, any> = {}
  if (updates.github_username !== undefined) updateData.github_username = updates.github_username
  if (updates.github_token !== undefined) updateData.github_token = updates.github_token
  if (updates.repo_name !== undefined) updateData.repo_name = updates.repo_name
  if (updates.repo_initialized !== undefined) updateData.repo_initialized = updates.repo_initialized

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
  return { error }
}
