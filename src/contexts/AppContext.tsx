import { createContext, useContext, useState, useCallback } from 'react'
import type { Document, Folder } from '@/types'

interface AppState {
  sidebarCollapsed: boolean;
  documents: Document[];
  folders: Folder[];
  activeDocument: Document | null;
  panelState: 'normal' | 'editor-maximized' | 'preview-maximized';
  editorMode: 'edit' | 'preview' | 'split';
}

interface AppContextType extends AppState {
  setSidebarCollapsed: (v: boolean) => void;
  setDocuments: (docs: Document[]) => void;
  setFolders: (f: Folder[]) => void;
  setActiveDocument: (doc: Document | null) => void;
  setPanelState: (s: AppState['panelState']) => void;
  setEditorMode: (m: AppState['editorMode']) => void;
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    sidebarCollapsed: false,
    documents: [],
    folders: [],
    activeDocument: null,
    panelState: 'normal',
    editorMode: 'split',
  })

  const setSidebarCollapsed = useCallback((v: boolean) => {
    setState(s => ({ ...s, sidebarCollapsed: v }))
  }, [])

  const setDocuments = useCallback((docs: Document[]) => {
    setState(s => ({ ...s, documents: docs }))
  }, [])

  const setFolders = useCallback((f: Folder[]) => {
    setState(s => ({ ...s, folders: f }))
  }, [])

  const setActiveDocument = useCallback((doc: Document | null) => {
    setState(s => ({ ...s, activeDocument: doc }))
  }, [])

  const setPanelState = useCallback((p: AppState['panelState']) => {
    setState(s => ({ ...s, panelState: p }))
  }, [])

  const setEditorMode = useCallback((m: AppState['editorMode']) => {
    setState(s => ({ ...s, editorMode: m }))
  }, [])

  return (
    <AppContext.Provider value={{
      ...state,
      setSidebarCollapsed,
      setDocuments,
      setFolders,
      setActiveDocument,
      setPanelState,
      setEditorMode,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
