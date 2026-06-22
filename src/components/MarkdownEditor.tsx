import { useState, useCallback, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Link,
  Image,
  Minus,
  Table,
  CheckSquare,
  Maximize2,
  Minimize2,
  Eye,
  Pencil,
  Columns,
  Save,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onPublish: () => void
  isSaving: boolean
  isPublishing: boolean
  panelState: 'normal' | 'editor-maximized' | 'preview-maximized'
  onPanelStateChange: (state: 'normal' | 'editor-maximized' | 'preview-maximized') => void
  editorMode: 'edit' | 'preview' | 'split'
  onEditorModeChange: (mode: 'edit' | 'preview' | 'split') => void
  title: string
  onTitleChange: (title: string) => void
}

interface ToolbarButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
}

function ToolbarButton({ icon, label, onClick, active }: ToolbarButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-8 w-8 p-0', active && 'bg-accent')}
            onClick={onClick}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function MarkdownEditor({
  value,
  onChange,
  onSave,
  onPublish,
  isSaving,
  isPublishing,
  panelState,
  onPanelStateChange,
  editorMode,
  onEditorModeChange,
  title,
  onTitleChange,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const insertText = useCallback((before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const insertion = before + (selectedText || placeholder) + after

    const newValue = value.substring(0, start) + insertion + value.substring(end)
    onChange(newValue)

    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + (selectedText ? selectedText.length : placeholder.length)
      textarea.setSelectionRange(
        start + before.length,
        selectedText ? newCursorPos : start + before.length + placeholder.length
      )
    }, 0)
  }, [value, onChange])

  const toolbarActions = [
    { icon: <Bold className="h-4 w-4" />, label: '粗体', action: () => insertText('**', '**', '粗体文本') },
    { icon: <Italic className="h-4 w-4" />, label: '斜体', action: () => insertText('*', '*', '斜体文本') },
    { icon: <Heading1 className="h-4 w-4" />, label: '标题1', action: () => insertText('# ', '', '标题') },
    { icon: <Heading2 className="h-4 w-4" />, label: '标题2', action: () => insertText('## ', '', '标题') },
    { icon: <Heading3 className="h-4 w-4" />, label: '标题3', action: () => insertText('### ', '', '标题') },
    { icon: <List className="h-4 w-4" />, label: '无序列表', action: () => insertText('- ', '', '列表项') },
    { icon: <ListOrdered className="h-4 w-4" />, label: '有序列表', action: () => insertText('1. ', '', '列表项') },
    { icon: <CheckSquare className="h-4 w-4" />, label: '任务列表', action: () => insertText('- [ ] ', '', '待办事项') },
    { icon: <Code className="h-4 w-4" />, label: '代码', action: () => insertText('`', '`', '代码') },
    { icon: <Quote className="h-4 w-4" />, label: '引用', action: () => insertText('> ', '', '引用文本') },
    { icon: <Link className="h-4 w-4" />, label: '链接', action: () => insertText('[', '](url)', '链接文本') },
    { icon: <Image className="h-4 w-4" />, label: '图片', action: () => insertText('![', '](image-url)', 'alt') },
    { icon: <Table className="h-4 w-4" />, label: '表格', action: () => insertText('| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |') },
    { icon: <Minus className="h-4 w-4" />, label: '分割线', action: () => insertText('\n---\n') },
  ]

  // Sync scroll between editor and preview
  useEffect(() => {
    const textarea = textareaRef.current
    const preview = previewRef.current
    if (!textarea || !preview) return

    const handleScroll = () => {
      const ratio = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight || 1)
      preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight)
    }

    textarea.addEventListener('scroll', handleScroll)
    return () => textarea.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background">
        <input
          type="text"
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="文档标题"
          className="flex-1 text-lg font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
        />
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={onSave}
            disabled={isSaving}
          >
            <Save className="h-3 w-3" />
            {isSaving ? '保存中...' : '保存'}
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
            onClick={onPublish}
            disabled={isPublishing}
          >
            <Upload className="h-3 w-3" />
            {isPublishing ? '发布中...' : '发布'}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border bg-muted/30 flex-wrap">
        {toolbarActions.map((action, i) => (
          <ToolbarButton
            key={i}
            icon={action.icon}
            label={action.label}
            onClick={action.action}
          />
        ))}

        <div className="w-px h-5 bg-border mx-1" />

        {/* Editor mode toggle */}
        <ToolbarButton
          icon={<Pencil className="h-4 w-4" />}
          label="编辑模式"
          onClick={() => onEditorModeChange('edit')}
          active={editorMode === 'edit'}
        />
        <ToolbarButton
          icon={<Columns className="h-4 w-4" />}
          label="分屏模式"
          onClick={() => onEditorModeChange('split')}
          active={editorMode === 'split'}
        />
        <ToolbarButton
          icon={<Eye className="h-4 w-4" />}
          label="预览模式"
          onClick={() => onEditorModeChange('preview')}
          active={editorMode === 'preview'}
        />

        <div className="w-px h-5 bg-border mx-1" />

        {/* Panel maximize/minimize */}
        <ToolbarButton
          icon={
            panelState === 'normal' ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )
          }
          label={panelState === 'normal' ? '最大化编辑器' : '恢复'}
          onClick={() =>
            onPanelStateChange(panelState === 'editor-maximized' ? 'normal' : 'editor-maximized')
          }
        />
      </div>

      {/* Editor + Preview area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        {editorMode !== 'preview' && (
          <div
            className={cn(
              'flex flex-col overflow-hidden',
              editorMode === 'split' ? 'w-1/2' : 'w-full',
              editorMode === 'split' && 'border-r border-border'
            )}
          >
            <textarea
              ref={textareaRef}
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder="开始编写 Markdown..."
              className="flex-1 w-full p-4 resize-none outline-none bg-background font-mono text-sm leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview */}
        {editorMode !== 'edit' && (
          <div
            ref={previewRef}
            className={cn(
              'flex-1 overflow-y-auto p-6 bg-background',
              editorMode === 'preview' ? 'w-full' : 'w-1/2'
            )}
          >
            <div className="markdown-preview prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
              >
                {value || '*暂无内容，开始编写吧...*'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
