import { getSupabase } from '@/lib/supabase'
import type { Document, Folder } from '@/types'

// Documents CRUD
export async function getDocuments(userId: string): Promise<Document[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getDocument(id: string): Promise<Document | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createDocument(
  userId: string,
  title: string,
  slug: string,
  folderPath: string = ''
): Promise<Document | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      title,
      slug,
      content: '',
      folder_path: folderPath,
      published: false,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDocument(
  id: string,
  updates: Partial<Pick<Document, 'title' | 'content' | 'slug' | 'published' | 'published_at'>>
): Promise<Document | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteDocument(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) throw error
}

// Folders CRUD
export async function getFolders(userId: string): Promise<Folder[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createFolder(
  userId: string,
  name: string,
  parentPath: string | null = null
): Promise<Folder | null> {
  const supabase = getSupabase()
  const path = parentPath ? `${parentPath}/${name}` : name
  const { data, error } = await supabase
    .from('folders')
    .insert({ user_id: userId, name, path, parent_path: parentPath })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFolder(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('folders').delete().eq('id', id)
  if (error) throw error
}
