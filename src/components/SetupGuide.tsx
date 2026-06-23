import { Database, ExternalLink, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SetupGuide() {
  const [copied, setCopied] = useState(false)

  const envTemplate = `VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here`

  const handleCopy = () => {
    navigator.clipboard.writeText(envTemplate)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
            <Database className="h-8 w-8 text-amber-500" />
          </div>
          <CardTitle className="text-2xl">需要配置 Supabase</CardTitle>
          <CardDescription>
            请先配置 Supabase 环境变量才能使用 MarkFlow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">1</span>
              创建 Supabase 项目
            </h3>
            <p className="text-sm text-muted-foreground ml-8">
              访问{' '}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Supabase Dashboard
                <ExternalLink className="h-3 w-3" />
              </a>{' '}
              创建一个新的项目。
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">2</span>
              执行数据库 SQL
            </h3>
            <p className="text-sm text-muted-foreground ml-8">
              在 Supabase Dashboard 的 SQL Editor 中执行 <code className="text-xs bg-muted px-1 py-0.5 rounded">SUPABASE_SETUP.md</code> 中的 SQL 语句，创建表结构和 RLS 策略。
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">3</span>
              配置 GitHub OAuth
            </h3>
            <p className="text-sm text-muted-foreground ml-8">
              在 GitHub 创建 OAuth App（
              <a
                href="https://github.com/settings/developers"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                点击这里
                <ExternalLink className="h-3 w-3" />
              </a>
              ），Callback URL 填写{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                https://你的项目.supabase.co/auth/v1/callback
              </code>
              。然后在 Supabase Dashboard → Authentication → Providers → GitHub 中填入 Client ID 和 Secret。
            </p>
          </div>

          {/* Step 4 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">4</span>
              设置环境变量
            </h3>
            <p className="text-sm text-muted-foreground ml-8">
              在项目根目录创建 <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code> 文件，填入以下内容：
            </p>
            <div className="relative ml-8">
              <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto">
                {envTemplate}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground ml-8 mt-1">
              从 Supabase Dashboard → Settings → API 中获取 URL 和 anon key。
            </p>
          </div>

          {/* Step 5 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">5</span>
              重启开发服务器
            </h3>
            <p className="text-sm text-muted-foreground ml-8">
              设置好环境变量后，刷新页面即可正常使用。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
