import { useState, useEffect } from 'react'
import {
  Github,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Key,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { signInWithGitHub } from '@/lib/supabase'
import {
  createRepository,
  enableGitHubPages,
  createOrUpdateFile,
  getFile,
  getFileWithRetry,
  checkRepoExists,
  verifyGitHubToken,
} from '@/lib/github'
import { updateUserProfile } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface OnboardingProps {
  onComplete: () => void
}

type Step = 'login' | 'create-repo' | 'initializing' | 'complete'

export function Onboarding({ onComplete }: OnboardingProps) {
  const { user, refreshUser, isTokenValid } = useAuth()
  const [step, setStep] = useState<Step>('login')
  const [repoName, setRepoName] = useState('my-docs')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pagesUrl, setPagesUrl] = useState('')
  const [initProgress, setInitProgress] = useState('')

  // PAT authentication states
  const [patToken, setPatToken] = useState('')
  const [verifyingPat, setVerifyingPat] = useState(false)
  const [patError, setPatError] = useState('')

  // Sync step with token validity
  useEffect(() => {
    if (isTokenValid === true) {
      setStep('create-repo')
    } else if (isTokenValid === false) {
      setStep('login')
    }
  }, [isTokenValid])

  const handleGitHubLogin = async () => {
    const { error: loginError } = await signInWithGitHub()
    if (loginError) {
      toast.error('GitHub 登录失败: ' + loginError.message)
    }
  }

  const handlePatSubmit = async () => {
    if (!patToken.trim()) {
      setPatError('请输入 GitHub 个人访问令牌 (PAT)')
      return
    }
    if (!user) {
      setPatError('用户会话未加载，请刷新页面')
      return
    }

    setVerifyingPat(true)
    setPatError('')

    try {
      const verified = await verifyGitHubToken(patToken)
      if (!verified) {
        setPatError('令牌无效，或缺少 "repo" 权限范围。请检查您的令牌配置。')
        return
      }

      // Save token and username to profiles table in Supabase
      const { error: updateError } = await updateUserProfile(user.id, {
        github_token: patToken,
        github_username: verified.username,
      })

      if (updateError) {
        throw new Error('保存配置失败: ' + updateError.message)
      }

      toast.success(`GitHub 账号 @${verified.username} 绑定成功！`)
      await refreshUser()
    } catch (err: any) {
      setPatError(err.message || '绑定失败，请稍后重试')
    } finally {
      setVerifyingPat(false)
    }
  }

  const handleCreateRepo = async () => {
    if (!repoName.trim()) {
      setError('请输入仓库名称')
      return
    }
    if (!user?.github_token) {
      setError('请先登录 GitHub')
      return
    }

    setLoading(true)
    setError('')
    setStep('initializing')

    try {
      const githubUsername = user.github_username

      // Step 1: Check if repo already exists
      setInitProgress('检查仓库是否存在...')
      const existingRepo = await checkRepoExists(user.github_token, githubUsername, repoName)

      let isNewRepo = false
      if (existingRepo) {
        setInitProgress(`仓库 "${repoName}" 已存在，将使用现有仓库...`)
        await new Promise(r => setTimeout(r, 800))
      } else {
        // Step 2: Create repository WITHOUT auto_init
        setInitProgress('正在创建 GitHub 仓库...')
        await createRepository(user.github_token, repoName, 'My Markdown Documents', false)
        isNewRepo = true
        // Wait for repo to be ready on GitHub side
        await new Promise(r => setTimeout(r, 2000))

        // Step 3: Create README.md FIRST to initialize the repo with a commit and main branch
        // This MUST happen before enabling GitHub Pages, otherwise we get 409 "Git Repository is empty"
        setInitProgress('正在初始化仓库内容...')
        const readmeContent = '# My Documents\n\nThis repository stores my markdown documents managed by MarkFlow.'

        // Retry creating README in case repo isn't ready yet
        let readmeCreated = false
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            await createOrUpdateFile(
              user.github_token,
              githubUsername,
              repoName,
              'README.md',
              readmeContent,
              'docs: init repository',
              undefined,
              'main'
            )
            readmeCreated = true
            break
          } catch (retryErr: any) {
            if (attempt < 4) {
              await new Promise(r => setTimeout(r, 2000))
            } else {
              throw retryErr
            }
          }
        }
        if (!readmeCreated) {
          throw new Error('无法创建 README 文件')
        }
        // Wait for the commit to propagate so the main branch exists
        await new Promise(r => setTimeout(r, 2000))
      }

      // Step 4: Enable GitHub Pages (repo now has a main branch)
      setInitProgress('正在配置 GitHub Pages...')
      await enableGitHubPages(user.github_token, githubUsername, repoName)
      await new Promise(r => setTimeout(r, 1000))

      // Step 5: For existing repos, update README if needed
      if (!isNewRepo) {
        setInitProgress('更新仓库内容...')
        const existingReadme = await getFileWithRetry(
          user.github_token,
          githubUsername,
          repoName,
          'README.md',
          'main'
        )
        await createOrUpdateFile(
          user.github_token,
          githubUsername,
          repoName,
          'README.md',
          '# My Documents\n\nThis repository stores my markdown documents managed by MarkFlow.',
          'docs: update README',
          existingReadme.sha,
          'main'
        )
      }

      // Step 6: Update user profile
      setInitProgress('保存配置...')
      
      const updateResult = await updateUserProfile(user.id, {
        repo_name: repoName,
        repo_initialized: true,
      })
      
      if (updateResult?.error) {
        throw new Error('无法保存配置: ' + updateResult.error.message)
      }

      setPagesUrl(`https://${githubUsername}.github.io/${repoName}/`)
      await refreshUser()
      
      setStep('complete')
      toast.success('仓库设置完成！')
    } catch (err: any) {
      const message = err.message || '创建仓库失败'
      if (message.includes('already exists') && message.includes('Repository')) {
        setError(`仓库 "${repoName}" 已存在，请换一个名称`)
      } else if (message.includes('sha') || message.includes('SHA')) {
        setError('文件更新冲突，请刷新页面重试')
      } else if (message.includes('empty')) {
        setError('仓库为空，初始化失败，请刷新页面重试')
      } else {
        setError(message)
      }
      setStep('create-repo')
      toast.error('创建仓库失败: ' + message)
    } finally {
      setLoading(false)
      setInitProgress('')
    }
  }

  if (isTokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
            <CardTitle className="text-lg">正在验证 GitHub 授权...</CardTitle>
            <CardDescription className="mt-1">
              请稍候，系统正在验证您的连接状态
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">欢迎使用 MarkFlow</CardTitle>
            <CardDescription>
              请连接您的 GitHub 账号，开始您的文档创作与发布之旅
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="oauth" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="oauth" className="gap-2">
                  <Github className="h-3.5 w-3.5" />
                  GitHub 登录 (推荐)
                </TabsTrigger>
                <TabsTrigger value="pat" className="gap-2">
                  <Key className="h-3.5 w-3.5" />
                  个人访问令牌 (PAT)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="oauth" className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  通过 GitHub 官方 OAuth 授权一键登录。系统会自动获取一个受限的临时凭证（支持读写您的文档仓库）。
                </p>
                <Button
                  onClick={handleGitHubLogin}
                  className="w-full gap-2 py-6 text-base"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  使用 GitHub 一键登录
                </Button>
              </TabsContent>

              <TabsContent value="pat" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Personal Access Token (classic)</label>
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=MarkFlow"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      创建 Token <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                  <Input
                    type="password"
                    value={patToken}
                    onChange={e => {
                      setPatToken(e.target.value)
                      setPatError('')
                    }}
                    placeholder="请输入 ghp_ 开头的 GitHub 令牌..."
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    请确保该 Token 至少具有 <strong>repo</strong> 作用域 (Scopes)，以便 MarkFlow 同步和部署您的文档。
                  </p>
                </div>

                {patError && (
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 rounded-lg p-2.5">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{patError}</span>
                  </div>
                )}

                <Button
                  onClick={handlePatSubmit}
                  disabled={verifyingPat}
                  className="w-full gap-2"
                >
                  {verifyingPat ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在验证并连接...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      验证并连接
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'create-repo') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Github className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">创建 GitHub 仓库</CardTitle>
            <CardDescription>
              我们将为你创建一个 GitHub 仓库来存储你的文档，并自动开启 GitHub Pages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">仓库名称</label>
              <Input
                value={repoName}
                onChange={e => {
                  setRepoName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))
                  setError('')
                }}
                placeholder="my-docs"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                仅支持英文字母、数字、连字符和下划线
              </p>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 rounded-lg p-2.5">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p>• 创建一个公开的 GitHub 仓库</p>
              <p>• 自动开启 GitHub Pages</p>
              <p>• main 分支存储 Markdown 文档</p>
              <p>• gh-pages 分支存储发布的静态网页</p>
            </div>
            <Button onClick={handleCreateRepo} className="w-full gap-2" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Github className="h-4 w-4" />
                  创建仓库
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'initializing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <CardTitle className="text-xl mt-4">正在初始化...</CardTitle>
            <CardDescription>
              {initProgress || '创建仓库并配置 GitHub Pages，请稍候'}
            </CardDescription>
            <div className="mt-4 space-y-2 text-left text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>GitHub 授权完成</span>
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>{initProgress || '创建仓库...'}</span>
              </div>
              <div className="flex items-center gap-2 opacity-40">
                <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />
                <span>配置 GitHub Pages</span>
              </div>
              <div className="flex items-center gap-2 opacity-40">
                <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />
                <span>初始化仓库内容</span>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-2" />
            <CardTitle className="text-2xl">设置完成！</CardTitle>
            <CardDescription>你的文档仓库已经创建成功</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pagesUrl && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">GitHub Pages 地址</p>
                <a
                  href={pagesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {pagesUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <Button onClick={onComplete} className="w-full" size="lg">
              开始创作
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
