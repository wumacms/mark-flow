import { useState, useEffect } from 'react'
import {
  Github,
  Key,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  FolderOpen,
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { updateUserProfile, signInWithGitHub } from '@/lib/supabase'
import { verifyGitHubToken, checkRepoExists, createRepository, enableGitHubPages, createOrUpdateFile } from '@/lib/github'
import { toast } from 'sonner'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { user, refreshUser, isTokenValid } = useAuth()
  
  // Token states
  const [showTokenInput, setShowTokenInput] = useState(false)
  const [newToken, setNewToken] = useState('')
  const [verifyingToken, setVerifyingToken] = useState(false)
  const [tokenError, setTokenError] = useState('')
  
  // Repo states
  const [newRepoName, setNewRepoName] = useState(user?.repo_name || '')
  const [savingRepo, setSavingRepo] = useState(false)
  const [repoStatus, setRepoStatus] = useState<'idle' | 'checking' | 'exists' | 'not-found' | 'error'>('idle')
  const [repoError, setRepoError] = useState('')

  // Sync repo name when user changes
  useEffect(() => {
    if (user?.repo_name) {
      setNewRepoName(user.repo_name)
    }
  }, [user?.repo_name])

  // Check repo status
  const handleCheckRepo = async () => {
    if (!newRepoName.trim()) {
      setRepoError('请输入仓库名称')
      return
    }
    if (!user?.github_token || !user?.github_username) {
      setRepoError('GitHub 未授权，请先登录/绑定 Token')
      return
    }

    setRepoStatus('checking')
    setRepoError('')

    try {
      const repoInfo = await checkRepoExists(user.github_token, user.github_username, newRepoName)
      if (repoInfo) {
        setRepoStatus('exists')
        toast.success(`GitHub 仓库 "${newRepoName}" 存在且连接正常！`)
      } else {
        setRepoStatus('not-found')
      }
    } catch (err: any) {
      setRepoStatus('error')
      setRepoError(err.message || '检测仓库失败')
    }
  }

  // Update repository name in DB
  const handleSaveRepoName = async () => {
    if (!newRepoName.trim()) {
      setRepoError('请输入仓库名称')
      return
    }
    if (!user) return

    setSavingRepo(true)
    setRepoError('')

    try {
      const { error: updateError } = await updateUserProfile(user.id, {
        repo_name: newRepoName,
      })

      if (updateError) throw updateError

      toast.success('仓库配置已保存')
      await refreshUser()
    } catch (err: any) {
      setRepoError(err.message || '保存失败')
      toast.error('保存仓库名失败')
    } finally {
      setSavingRepo(false)
    }
  }

  // Create repository and setup GitHub Pages
  const handleCreateAndSetupRepo = async () => {
    if (!user?.github_token || !user?.github_username) return
    
    setSavingRepo(true)
    setRepoError('')
    
    try {
      // 1. Create Repository
      toast.loading('正在创建 GitHub 仓库...', { id: 'repo-setup' })
      await createRepository(user.github_token, newRepoName, 'My Markdown Documents', false)
      
      // Wait a moment for GitHub to initialize
      await new Promise(r => setTimeout(r, 2000))
      
      // 2. Create index/README commit to create main branch
      toast.loading('正在配置仓库初始化内容...', { id: 'repo-setup' })
      const readmeContent = '# My Documents\n\nThis repository stores my markdown documents managed by MarkFlow.'
      await createOrUpdateFile(
        user.github_token,
        user.github_username,
        newRepoName,
        'README.md',
        readmeContent,
        'docs: init repository',
        undefined,
        'main'
      )

      await new Promise(r => setTimeout(r, 2000))

      // 3. Enable Pages
      toast.loading('正在启用 GitHub Pages...', { id: 'repo-setup' })
      await enableGitHubPages(user.github_token, user.github_username, newRepoName)

      // 4. Save to profiles
      const { error: updateError } = await updateUserProfile(user.id, {
        repo_name: newRepoName,
        repo_initialized: true,
      })

      if (updateError) throw updateError

      toast.success('GitHub 仓库创建并配置成功！', { id: 'repo-setup' })
      setRepoStatus('exists')
      await refreshUser()
    } catch (err: any) {
      setRepoError(err.message || '创建仓库失败')
      toast.error('创建或配置仓库失败', { id: 'repo-setup' })
    } finally {
      setSavingRepo(false)
    }
  }

  // Handle Token Update (PAT)
  const handleUpdateToken = async () => {
    if (!newToken.trim()) {
      setTokenError('请输入令牌 Token')
      return
    }
    if (!user) return

    setVerifyingToken(true)
    setTokenError('')

    try {
      const verified = await verifyGitHubToken(newToken)
      if (!verified) {
        setTokenError('验证失败，令牌无效或没有 repo 权限')
        return
      }

      // Save new token to DB
      const { error: updateError } = await updateUserProfile(user.id, {
        github_token: newToken,
        github_username: verified.username,
      })

      if (updateError) throw updateError

      toast.success('GitHub 令牌更新成功！')
      setNewToken('')
      setShowTokenInput(false)
      await refreshUser()
    } catch (err: any) {
      setTokenError(err.message || '更新令牌失败，请重试')
    } finally {
      setVerifyingToken(false)
    }
  }

  const handleOAuthLogin = async () => {
    const { error: loginError } = await signInWithGitHub()
    if (loginError) {
      toast.error('GitHub 重新登录失败: ' + loginError.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub 配置设置
          </DialogTitle>
          <DialogDescription>
            管理您的 GitHub 账户授权连接与 Markdown 存储库的同步设置。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Connection Status Section */}
          <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">连接状态</h4>
              {isTokenValid === true ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> 已连接
                </Badge>
              ) : isTokenValid === false ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" /> 未连接/已失效
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> 正在验证...
                </Badge>
              )}
            </div>

            {user?.github_username && (
              <div className="flex items-center gap-3 pt-1">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {user.github_username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    {user.github_username}
                    <a
                      href={`https://github.com/${user.github_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Token 类型:{' '}
                    {user.github_token?.startsWith('ghp_') ? 'Personal Access Token' : 'OAuth App'}
                  </div>
                </div>
              </div>
            )}

            {/* Token Modification */}
            <div className="pt-2">
              {!showTokenInput ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 flex-1"
                    onClick={() => setShowTokenInput(true)}
                  >
                    <Key className="h-3.5 w-3.5" />
                    修改 Token (PAT)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 flex-1"
                    onClick={handleOAuthLogin}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    OAuth 重新登录
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 border-t border-border pt-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">输入新 GitHub PAT</label>
                    <Input
                      type="password"
                      value={newToken}
                      onChange={e => {
                        setNewToken(e.target.value)
                        setTokenError('')
                      }}
                      placeholder="ghp_ 开头的 Personal Access Token..."
                      className="font-mono text-xs"
                    />
                  </div>
                  {tokenError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {tokenError}
                    </p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setShowTokenInput(false)
                        setNewToken('')
                        setTokenError('')
                      }}
                    >
                      取消
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs"
                      onClick={handleUpdateToken}
                      disabled={verifyingToken}
                    >
                      {verifyingToken && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      测试并保存
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Repository Section */}
          <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/20">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              存储仓库配置
            </h4>

            <div className="space-y-2">
              <label className="text-xs font-medium">同步的 GitHub 仓库名称</label>
              <div className="flex gap-2">
                <Input
                  value={newRepoName}
                  onChange={e => {
                    setNewRepoName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))
                    setRepoStatus('idle')
                    setRepoError('')
                  }}
                  placeholder="请输入仓库名称，例如 my-docs"
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="sm" onClick={handleCheckRepo}>
                  检测
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                所有的 Markdown 都会保存在该仓库的 main 分支，发布的页面会同步部署到 gh-pages 分支。
              </p>
            </div>

            {/* Check results */}
            {repoStatus === 'exists' && (
              <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/5 rounded-lg p-2.5">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>该仓库已在 GitHub 上存在，连接完全正常！</span>
              </div>
            )}

            {repoStatus === 'not-found' && (
              <div className="space-y-3 rounded-lg bg-amber-500/5 p-3 border border-amber-500/10">
                <div className="flex items-start gap-2 text-xs text-amber-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>在 GitHub 上未找到名为 "{newRepoName}" 的仓库。</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs gap-1.5"
                  onClick={handleCreateAndSetupRepo}
                  disabled={savingRepo}
                >
                  {savingRepo ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      创建并配置中...
                    </>
                  ) : (
                    <>创建并配置新仓库</>
                  )}
                </Button>
              </div>
            )}

            {repoError && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-lg p-2.5">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{repoError}</span>
              </div>
            )}

            {/* Save Repo name Button */}
            {repoStatus !== 'not-found' && (
              <Button
                size="sm"
                className="w-full"
                onClick={handleSaveRepoName}
                disabled={savingRepo || newRepoName === user?.repo_name}
              >
                {savingRepo && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                保存仓库名称
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
