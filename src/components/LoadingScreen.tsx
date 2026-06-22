import { Loader2, AlertCircle } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">加载中...</p>
      </div>
    </div>
  )
}

export function ErrorScreen({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <h2 className="text-lg font-semibold mb-2">出错了</h2>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90"
          >
            重试
          </button>
        )}
      </div>
    </div>
  )
}
