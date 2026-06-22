import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { isDark, setTheme, mounted } = useTheme()

  if (!mounted) return <Button variant="ghost" size="icon" className="w-9 h-9" />

  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-9 h-9"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-4 w-4 transition-all" />
      ) : (
        <Moon className="h-4 w-4 transition-all" />
      )}
    </Button>
  )
}
