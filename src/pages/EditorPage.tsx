import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useApp } from '@/contexts/AppContext'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { Onboarding } from '@/components/Onboarding'
import { LoadingScreen } from '@/components/LoadingScreen'
import { slugify } from '@/lib/utils'
import {
  getDocuments,
  getFolders,
  createDocument,
  updateDocument,
  deleteDocument,
  createFolder,
  deleteFolder,
} from '@/lib/db'
import { getFile, createOrUpdateFile, getPagesInfo, generateHtmlFromMarkdown, generateBlogIndexHtml, type BlogArticle } from '@/lib/github'
import { toast } from 'sonner'
import type { Document } from '@/types'
import { Toaster } from '@/components/ui/sonner'
import { PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function EditorPage() {
  const { user, refreshUser } = useAuth()
  const {
    sidebarCollapsed,
    activeDocument,
    panelState,
    editorMode,
    setDocuments,
    setFolders,
    setActiveDocument,
    setPanelState,
    setEditorMode,
  } = useApp()

  const [editorContent, setEditorContent] = useState('')
  const [editorTitle, setEditorTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pagesUrl, setPagesUrl] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Load initial data
  useEffect(() => {
    if (!user?.repo_initialized) {
      setLoading(false)
      return
    }
    loadAllData()
  }, [user?.id, user?.repo_initialized])

  // Load pages URL
  useEffect(() => {
    if (user?.repo_initialized && user?.github_token && user?.github_username && user?.repo_name) {
      getPagesInfo(user.github_token, user.github_username, user.repo_name).then(info => {
        if (info?.html_url) {
          setPagesUrl(info.html_url)
        }
      })
    }
  }, [user?.repo_initialized])

  const loadAllData = async () => {
    if (!user) return
    try {
      const [docs, flds] = await Promise.all([getDocuments(user.id), getFolders(user.id)])
      setDocuments(docs)
      setFolders(flds)

      if (docs.length > 0 && !activeDocument) {
        setActiveDocument(docs[0])
        setEditorContent(docs[0].content)
        setEditorTitle(docs[0].title)
      }
    } catch (err: any) {
      toast.error('加载数据失败: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Sync content when active document changes
  useEffect(() => {
    if (activeDocument) {
      setEditorContent(activeDocument.content)
      setEditorTitle(activeDocument.title)
      setHasUnsavedChanges(false)
    }
  }, [activeDocument?.id])

  // Track unsaved changes
  useEffect(() => {
    if (activeDocument) {
      setHasUnsavedChanges(
        editorContent !== activeDocument.content || editorTitle !== activeDocument.title
      )
    }
  }, [editorContent, editorTitle, activeDocument])

  const handleCreateDocument = async (title: string, folderPath: string) => {
    if (!user) return
    const slug = slugify(title)
    try {
      const doc = await createDocument(user.id, title, slug, folderPath)
      if (doc) {
        const docs = await getDocuments(user.id)
        setDocuments(docs)
        setActiveDocument(doc)
        setEditorContent('')
        setEditorTitle(title)
        toast.success('文档创建成功')
      }
    } catch (err: any) {
      toast.error('创建文档失败: ' + err.message)
    }
  }

  const handleCreateFolder = async (name: string, parentPath: string | null) => {
    if (!user) return
    try {
      const folder = await createFolder(user.id, name, parentPath)
      if (folder) {
        const flds = await getFolders(user.id)
        setFolders(flds)
        toast.success('文件夹创建成功')
      }
    } catch (err: any) {
      toast.error('创建文件夹失败: ' + err.message)
    }
  }

  const handleDeleteDocument = async (id: string) => {
    try {
      await deleteDocument(id)
      const docs = await getDocuments(user!.id)
      setDocuments(docs)
      if (activeDocument?.id === id) {
        if (docs.length > 0) {
          setActiveDocument(docs[0])
          setEditorContent(docs[0].content)
          setEditorTitle(docs[0].title)
        } else {
          setActiveDocument(null)
          setEditorContent('')
          setEditorTitle('')
        }
      }
      toast.success('文档已删除')
    } catch (err: any) {
      toast.error('删除文档失败: ' + err.message)
    }
  }

  const handleDeleteFolder = async (id: string) => {
    try {
      await deleteFolder(id)
      const flds = await getFolders(user!.id)
      setFolders(flds)
      toast.success('文件夹已删除')
    } catch (err: any) {
      toast.error('删除文件夹失败: ' + err.message)
    }
  }

  const handleSelectDocument = (doc: Document) => {
    setActiveDocument(doc)
  }

  const handleSave = async () => {
    if (!activeDocument || !user?.github_token || !user?.github_username || !user?.repo_name) {
      toast.error('无法保存：缺少必要信息')
      return
    }

    setIsSaving(true)
    try {
      const slug = slugify(editorTitle || activeDocument.title)
      const updated = await updateDocument(activeDocument.id, {
        title: editorTitle || activeDocument.title,
        content: editorContent,
        slug,
      })

      // Save to GitHub
      const docPath = activeDocument.folder_path
        ? `${activeDocument.folder_path}/${slug}/index.md`
        : `${slug}/index.md`

      const existingFile = await getFile(
        user.github_token,
        user.github_username,
        user.repo_name,
        docPath
      )

      await createOrUpdateFile(
        user.github_token,
        user.github_username,
        user.repo_name,
        docPath,
        editorContent,
        `docs: update ${slug}`,
        existingFile?.sha
      )

      if (updated) {
        setActiveDocument(updated)
        const docs = await getDocuments(user.id)
        setDocuments(docs)
      }

      setHasUnsavedChanges(false)
      toast.success('文档已保存到 GitHub')
    } catch (err: any) {
      toast.error('保存失败: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!activeDocument || !user?.github_token || !user?.github_username || !user?.repo_name) {
      toast.error('无法发布：缺少必要信息')
      return
    }

    setIsPublishing(true)
    try {
      await handleSave()

      const slug = slugify(editorTitle || activeDocument.title)
      const docDir = activeDocument.folder_path
        ? `${activeDocument.folder_path}/${slug}`
        : slug

      const htmlContent = simpleMarkdownToHtml(editorContent)
      const fullHtml = generateHtmlFromMarkdown(editorTitle || activeDocument.title, htmlContent)

      const existingHtml = await getFile(
        user.github_token,
        user.github_username,
        user.repo_name,
        `${docDir}/index.html`,
        'gh-pages'
      )

      await createOrUpdateFile(
        user.github_token,
        user.github_username,
        user.repo_name,
        `${docDir}/index.html`,
        fullHtml,
        `publish: ${slug}`,
        existingHtml?.sha,
        'gh-pages'
      )

      const updated = await updateDocument(activeDocument.id, {
        published: true,
        published_at: new Date().toISOString(),
      })

      let freshDocs: Document[] = []
      if (updated) {
        setActiveDocument(updated)
        freshDocs = await getDocuments(user.id)
        setDocuments(freshDocs)
      } else {
        freshDocs = await getDocuments(user.id)
      }

      // Generate blog index page with all published articles
      const publishedDocs = freshDocs.filter(d => d.published)
      const blogArticles: BlogArticle[] = publishedDocs.map(d => {
        const dSlug = d.slug || slugify(d.title)
        const dDir = d.folder_path ? `${d.folder_path}/${dSlug}` : dSlug
        // Generate excerpt: first 120 chars of content, stripped of markdown
        const rawText = d.content
          .replace(/```[\s\S]*?```/g, '')
          .replace(/#{1,6}\s/g, '')
          .replace(/\*\*|__|\*|_|~~|`/g, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
          .replace(/^- /gm, '')
          .replace(/>\s/gm, '')
          .replace(/\n+/g, ' ')
          .trim()
        return {
          title: d.title,
          slug: dSlug,
          folder_path: d.folder_path,
          published_at: d.published_at || new Date().toISOString(),
          url: `./${dDir}/`,
          excerpt: rawText.length > 120 ? rawText.slice(0, 120) + '...' : rawText,
        }
      })

      const blogIndexHtml = generateBlogIndexHtml(blogArticles, user.repo_name)
      const existingIndex = await getFile(
        user.github_token,
        user.github_username,
        user.repo_name,
        'index.html',
        'gh-pages'
      )

      await createOrUpdateFile(
        user.github_token,
        user.github_username,
        user.repo_name,
        'index.html',
        blogIndexHtml,
        'publish: update blog index',
        existingIndex?.sha,
        'gh-pages'
      )

      const pageUrl = `https://${user.github_username}.github.io/${user.repo_name}/${docDir}/`
      const siteUrl = `https://${user.github_username}.github.io/${user.repo_name}/`
      toast.success('发布成功！', {
        description: (
          <div className="mt-1 space-y-1">
            <p className="text-xs text-muted-foreground">文章地址：</p>
            <a
              href={pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline break-all block"
            >
              {pageUrl}
            </a>
            <p className="text-xs text-muted-foreground mt-2">博客首页：</p>
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline break-all block"
            >
              {siteUrl}
            </a>
          </div>
        ) as any,
        duration: 12000,
      })
    } catch (err: any) {
      toast.error('发布失败: ' + err.message)
    } finally {
      setIsPublishing(false)
    }
  }

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  // Simple markdown to HTML conversion for publishing
  const simpleMarkdownToHtml = (md: string): string => {
    let html = md

    // Code blocks (process first to avoid interference)
    // IMPORTANT: Do NOT add 'hljs' class — highlight.js adds it automatically.
    // If we add it here, highlight.js will skip these elements thinking they're already highlighted.
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
      const langClass = lang ? ` language-${lang}` : ''
      return `<pre><code class="${langClass}">${escapeHtml(code.trim())}</code></pre>`
    })

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

    // Headers
    html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>')
    html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>')
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')

    // Images (before links)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

    // Blockquote
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote><p>$1</p></blockquote>')

    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr />')

    // Task lists
    html = html.replace(/^- \[x\] (.+)$/gm, '<li><input type="checkbox" checked disabled /> $1</li>')
    html = html.replace(/^- \[ \] (.+)$/gm, '<li><input type="checkbox" disabled /> $1</li>')

    // Unordered list items
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>')

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')

    // Paragraphs for remaining plain text lines
    html = html.replace(/^(?!<[a-z/])((?!<\/?[a-z]).+)$/gm, '<p>$1</p>')

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '')

    return html
  }

  // Onboarding flow
  if (!user?.repo_initialized) {
    return (
      <>
        <Onboarding onComplete={() => {
          refreshUser()
          loadAllData()
        }} />
        <Toaster />
      </>
    )
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header pagesUrl={pagesUrl} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          onCreateDocument={handleCreateDocument}
          onCreateFolder={handleCreateFolder}
          onDeleteDocument={handleDeleteDocument}
          onDeleteFolder={handleDeleteFolder}
          onSelectDocument={handleSelectDocument}
        />

        {/* Main editor area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 left-2 z-10 w-8 h-8"
              onClick={() => {}}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          )}

          {activeDocument ? (
            <MarkdownEditor
              value={editorContent}
              onChange={setEditorContent}
              onSave={handleSave}
              onPublish={handlePublish}
              isSaving={isSaving}
              isPublishing={isPublishing}
              panelState={panelState}
              onPanelStateChange={setPanelState}
              editorMode={editorMode}
              onEditorModeChange={setEditorMode}
              title={editorTitle}
              onTitleChange={setEditorTitle}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="text-center text-muted-foreground">
                <p className="text-lg font-medium mb-2">选择一个文档开始编辑</p>
                <p className="text-sm">或在侧边栏创建新文档</p>
              </div>
            </div>
          )}

          {/* Status bar */}
          <div className="h-7 border-t border-border bg-muted/30 flex items-center justify-between px-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <span className="text-amber-500">● 未保存</span>
              )}
              {activeDocument && (
                <span>
                  {editorContent.split(/\s+/).filter(Boolean).length} 词 |{' '}
                  {editorContent.length} 字符
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {activeDocument?.published && (
                <span className="text-emerald-500">已发布</span>
              )}
              <span>Markdown</span>
            </div>
          </div>
        </div>
      </div>

      <Toaster />
    </div>
  )
}
