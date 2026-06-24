import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

interface MermaidProps {
  chart: string
  isDark?: boolean
}

export function Mermaid({ chart, isDark = false }: MermaidProps) {
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  
  // Create a unique container ID for rendering
  const elementId = useRef(`mermaid-${Math.random().toString(36).slice(2, 9)}`)

  useEffect(() => {
    let isMounted = true

    // Initialize mermaid configuration for this render
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose',
        themeVariables: {
          background: isDark ? '#1e293b' : '#f8fafc',
          primaryColor: isDark ? '#38bdf8' : '#0284c7',
        }
      })
    } catch (e) {
      console.error('Failed to initialize mermaid', e)
    }

    const renderChart = async () => {
      try {
        setError(null)
        // Clean up any trailing newlines
        const cleanChart = chart.trim()
        if (!cleanChart) return

        // In mermaid v10+, mermaid.render returns an object with { svg }
        const { svg: renderedSvg } = await mermaid.render(elementId.current, cleanChart)
        
        if (isMounted) {
          setSvg(renderedSvg)
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err)
        if (isMounted) {
          setError(err.message || '图表语法错误，无法解析')
        }
        
        // Clean up the broken SVG elements that mermaid sometimes inserts in the document body
        const badEl = document.getElementById(elementId.current)
        if (badEl) {
          badEl.remove()
        }
        const bindEl = document.getElementById(`d${elementId.current}`)
        if (bindEl) {
          bindEl.remove()
        }
      }
    }

    renderChart()

    return () => {
      isMounted = false
    }
  }, [chart, isDark])

  if (error) {
    return (
      <div className="my-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm overflow-x-auto font-mono">
        <div className="font-semibold text-destructive mb-2 flex items-center gap-2">
          <span>⚠️</span> Mermaid 渲染错误:
        </div>
        <div className="text-muted-foreground whitespace-pre-wrap mb-3">{error}</div>
        <details className="cursor-pointer text-xs">
          <summary className="text-muted-foreground hover:text-foreground transition-colors font-sans">
            查看源码
          </summary>
          <pre className="mt-2 p-2 rounded bg-muted/50 border border-border/30 text-muted-foreground">
            {chart}
          </pre>
        </details>
      </div>
    )
  }

  return (
    <div
      className="mermaid-container flex justify-center items-center py-4 my-2 overflow-x-auto"
      dangerouslySetInnerHTML={{
        __html: svg || '<div class="text-sm text-muted-foreground animate-pulse">正在渲染图表...</div>'
      }}
    />
  )
}
