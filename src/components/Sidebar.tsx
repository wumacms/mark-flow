import { useState } from 'react'
import {
  FileText,
  Folder,
  Plus,
  ChevronRight,
  ChevronDown,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useApp } from '@/contexts/AppContext'
import type { Document, Folder as FolderType } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SidebarProps {
  onCreateDocument: (title: string, folderPath: string) => void
  onCreateFolder: (name: string, parentPath: string | null) => void
  onDeleteDocument: (id: string) => void
  onDeleteFolder: (id: string) => void
  onSelectDocument: (doc: Document) => void
}

export function Sidebar({
  onCreateDocument,
  onCreateFolder,
  onDeleteDocument,
  onDeleteFolder,
  onSelectDocument,
}: SidebarProps) {
  const { sidebarCollapsed, setSidebarCollapsed, documents, folders, activeDocument } = useApp()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']))
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewDocDialog, setShowNewDocDialog] = useState(false)
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null)

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const rootFolders = folders.filter(f => !f.parent_path)
  const rootDocuments = filteredDocuments.filter(d => !d.folder_path)

  const getSubFolders = (parentPath: string) =>
    folders.filter(f => f.parent_path === parentPath)

  const getFolderDocuments = (folderPath: string) =>
    filteredDocuments.filter(d => d.folder_path === folderPath)

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const handleCreateDocument = () => {
    if (!newDocTitle.trim()) return
    onCreateDocument(newDocTitle.trim(), selectedFolderPath || '')
    setNewDocTitle('')
    setShowNewDocDialog(false)
    setSelectedFolderPath(null)
  }

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return
    onCreateFolder(newFolderName.trim(), selectedFolderPath)
    setNewFolderName('')
    setShowNewFolderDialog(false)
    setSelectedFolderPath(null)
  }

  const renderFolderTree = (folderList: FolderType[], parentPath: string | null) => {
    return folderList.map(folder => {
      const isExpanded = expandedFolders.has(folder.path)
      const subFolders = getSubFolders(folder.path)
      const folderDocs = getFolderDocuments(folder.path)

      return (
        <div key={folder.id}>
          <div className="flex items-center group pr-2">
            <button
              onClick={() => toggleFolder(folder.path)}
              className="p-0.5 hover:bg-sidebar-accent rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/50" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/50" />
              )}
            </button>
            <Folder className="h-4 w-4 text-amber-500 ml-1 mr-1.5 flex-shrink-0" />
            <button
              onClick={() => {
                setSelectedFolderPath(folder.path)
                toggleFolder(folder.path)
              }}
              className="flex-1 text-left text-sm text-sidebar-foreground/80 hover:text-sidebar-foreground truncate py-0.5"
            >
              {folder.name}
            </button>
            <div className="hidden group-hover:flex items-center gap-0.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => {
                        setSelectedFolderPath(folder.path)
                        setShowNewDocDialog(true)
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">新建文档</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>删除文件夹</AlertDialogTitle>
                    <AlertDialogDescription>
                      确定要删除文件夹 "{folder.name}" 吗？此操作不可撤销。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDeleteFolder(folder.id)}>
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          {isExpanded && (
            <div className="ml-4 border-l border-sidebar-border pl-2">
              {renderFolderTree(subFolders, folder.path)}
              {folderDocs.map(doc => renderDocumentItem(doc))}
            </div>
          )}
        </div>
      )
    })
  }

  const renderDocumentItem = (doc: Document) => {
    const isActive = activeDocument?.id === doc.id
    return (
      <div
        key={doc.id}
        className={cn(
          'flex items-center group pr-2 cursor-pointer rounded-md transition-colors',
          isActive ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/50'
        )}
        onClick={() => onSelectDocument(doc)}
      >
        <FileText
          className={cn(
            'h-4 w-4 ml-1 mr-1.5 flex-shrink-0',
            isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/40'
          )}
        />
        <span
          className={cn(
            'flex-1 text-sm truncate py-1',
            isActive ? 'text-sidebar-primary font-medium' : 'text-sidebar-foreground/70'
          )}
        >
          {doc.title}
        </span>
        {doc.published && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mr-1">
            已发布
          </span>
        )}
        <div className="hidden group-hover:flex items-center">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5">
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>删除文档</AlertDialogTitle>
                <AlertDialogDescription>
                  确定要删除文档 "{doc.title}" 吗？此操作不可撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDeleteDocument(doc.id)}>
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    )
  }

  if (sidebarCollapsed) {
    return (
      <div className="w-12 border-r border-sidebar-border bg-sidebar flex flex-col items-center py-3 gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => setSidebarCollapsed(false)}
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-sidebar-border">
        <h2 className="text-sm font-semibold text-sidebar-foreground">文档管理</h2>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={() => setSidebarCollapsed(true)}
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索文档..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 px-3 py-1.5">
        <Dialog open={showNewDocDialog} onOpenChange={setShowNewDocDialog}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs gap-1"
              onClick={() => setSelectedFolderPath(null)}
            >
              <Plus className="h-3 w-3" />
              新建文档
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>创建新文档</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Input
                placeholder="文档标题"
                value={newDocTitle}
                onChange={e => setNewDocTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateDocument()}
                autoFocus
              />
              <Button onClick={handleCreateDocument} className="w-full">
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => setSelectedFolderPath(null)}
            >
              <Folder className="h-3 w-3" />
              文件夹
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>创建新文件夹</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Input
                placeholder="文件夹名称（英文）"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                autoFocus
              />
              <Button onClick={handleCreateFolder} className="w-full">
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {renderFolderTree(rootFolders, null)}
        {rootDocuments.map(doc => renderDocumentItem(doc))}
        {documents.length === 0 && folders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>暂无文档</p>
            <p className="mt-1">点击"新建文档"开始创作</p>
          </div>
        )}
      </div>
    </div>
  )
}
