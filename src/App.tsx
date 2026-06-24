import { ThemeProvider } from 'next-themes'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { AppProvider } from '@/contexts/AppContext'
import { LoadingScreen } from '@/components/LoadingScreen'
import { SetupGuide } from '@/components/SetupGuide'
import EditorPage from '@/pages/EditorPage'
import { Button } from '@/components/ui/button'
import { Github, BookOpen, Sparkles, ArrowRight } from 'lucide-react'
import { signInWithGitHub, isSupabaseConfigured } from '@/lib/supabase'
import { Toaster } from '@/components/ui/sonner'

function LandingPage() {
  const handleLogin = async () => {
    await signInWithGitHub()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">MF</span>
            </div>
            <span className="font-bold text-lg tracking-tight">MarkFlow</span>
          </div>
          <Button onClick={handleLogin} className="gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            使用 GitHub 登录
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              基于 GitHub 的文档管理
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight">
              用 Markdown 书写
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                向世界发布
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              MarkFlow 是一个优雅的 Markdown 文档编辑器，集成 GitHub 仓库与 GitHub Pages，
              让你轻松管理、发布文档，每个文档都有独立的网页。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={handleLogin} size="lg" className="gap-2 px-8">
              <Github className="h-5 w-5" />
              开始使用
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Markdown 编辑</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                支持代码高亮、数学公式、表格、图片等丰富的 Markdown 语法
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </div>
              <h3 className="font-semibold">GitHub 集成</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                文档自动同步到 GitHub 仓库，版本控制与协作一步到位
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">一键发布</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                通过 GitHub Pages 自动发布静态网页，每个文档拥有独立 URL
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>MarkFlow — 用 Markdown 书写，向世界发布</p>
      </footer>

      <Toaster />
    </div>
  )
}

function AppContent() {
  const { user, loading, isConfigured, authError } = useAuth()

  const handleLogin = async () => {
    await signInWithGitHub()
  }

  if (!isConfigured) return <SetupGuide />

  if (loading) return <LoadingScreen />

  // If we have a user (even a fallback from session), proceed normally
  // The Onboarding flow will detect existing repos and handle them
  if (!user) {
    // Only show error if there's no session at all
    if (authError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md space-y-4">
            <h2 className="text-lg font-semibold">会话已过期</h2>
            <p className="text-sm text-muted-foreground">{authError}</p>
            <Button onClick={handleLogin} className="gap-2">
              <Github className="h-4 w-4" />
              重新登录
            </Button>
          </div>
        </div>
      )
    }
    return <LandingPage />
  }

  return <EditorPage />
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
