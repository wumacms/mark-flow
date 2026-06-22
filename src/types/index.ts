export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  github_username: string;
  github_token: string;
  repo_name: string;
  repo_initialized: boolean;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  content: string;
  folder_path: string;
  created_at: string;
  updated_at: string;
  published: boolean;
  published_at: string | null;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  path: string;
  parent_path: string | null;
  created_at: string;
}

export type EditorMode = 'edit' | 'preview' | 'split';
export type PanelState = 'normal' | 'editor-maximized' | 'preview-maximized';
