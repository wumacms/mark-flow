import { signOut } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, Settings, Github, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface HeaderProps {
  pagesUrl: string | null
}

export function Header({ pagesUrl }: HeaderProps) {
  const { user } = useAuth()

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      toast.error('退出登录失败')
    }
  }

  return (
    <header className="h-12 border-b border-border bg-background flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xs">MF</span>
        </div>
        <h1 className="text-sm font-bold tracking-tight">MarkFlow</h1>
      </div>

      <div className="flex items-center gap-2">
        {pagesUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground"
            asChild
          >
            <a href={pagesUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
              访问站点
            </a>
          </Button>
        )}

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.avatar_url} alt={user?.name} />
                <AvatarFallback className="text-xs">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" disabled>
              <Github className="h-4 w-4" />
              <span>{user?.github_username}</span>
            </DropdownMenuItem>
            {user?.repo_name && (
              <DropdownMenuItem className="gap-2" asChild>
                <a
                  href={`https://github.com/${user.github_username}/${user.repo_name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>查看仓库</span>
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive">
              <LogOut className="h-4 w-4" />
              <span>退出登录</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
