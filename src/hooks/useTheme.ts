import { useState, useEffect } from 'react'
import { useTheme as useNextTheme } from 'next-themes'

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return {
    theme,
    setTheme,
    resolvedTheme,
    mounted,
    isDark: resolvedTheme === 'dark',
  }
}
