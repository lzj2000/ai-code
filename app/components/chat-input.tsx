'use client'

import type React from 'react'
import type { Tool } from './tool-selector'
import { Circle, ImageIcon, Send, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { ModelSelector } from './model-selector'
import { ToolBadge } from './tool-badge'
import { ToolSelector } from './tool-selector'

interface ChatInputProps {
  onSendMessage: (message: string, selectedTools?: string[], images?: File[]) => void
  onStopGenerating: () => void
  isLoading: boolean
  availableTools?: Tool[]
  selectedModelId: string
  onModelChange: (modelId: string) => void
}

export default function ChatInput({
  onSendMessage,
  onStopGenerating,
  isLoading,
  availableTools = [],
  selectedModelId,
  onModelChange,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((input.trim() || selectedImages.length > 0) && !isLoading) {
      onSendMessage(input, selectedTools, selectedImages)
      setInput('')
      setSelectedImages([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleToolToggle = (toolId: string) => {
    setSelectedTools(prev =>
      prev.includes(toolId) ? prev.filter(id => id !== toolId) : [...prev, toolId],
    )
  }

  const handleRemoveTool = (toolId: string) => {
    setSelectedTools(prev => prev.filter(id => id !== toolId))
  }

  const handleFiles = (files: File[]) => {
    // 过滤出图片文件，并确保是有效的 Blob/File 对象
    const imageFiles = files.filter(file =>
      file && file instanceof Blob && file.type.startsWith('image/'),
    )
    if (imageFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...imageFiles])
    }
  }
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      handleFiles(Array.from(files))
    }
    // 重置 input，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.includes('image')) {
        const file = items[i].getAsFile()
        if (file)
          files.push(file)
      }
    }
    if (files.length > 0) {
      e.preventDefault()
      handleFiles(files)
    }
  }

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-background px-4 py-4">
      <div className="mx-auto w-full">
        <div className="relative flex flex-col gap-2 rounded-xl border border-input bg-card p-4 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
          {/* 图片预览区域 */}
          {selectedImages.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-3 px-1">
              {selectedImages.map((image, index) => (
                <div key={index} className="relative group overflow-visible">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`Preview ${index}`}
                    className="h-24 w-24 rounded-xl object-cover border border-border/50 shadow-sm"
                    onLoad={e => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="
                      absolute -top-2 -right-2 flex items-center justify-center rounded-full
                      bg-destructive text-destructive-foreground shadow-md ring-2 ring-background z-10 transition-all
                      /* 移动端 (<768px): 总是显示，调整为更精致的尺寸 */
                      h-6 w-6 opacity-100
                      /* PC端 (>=768px): 悬停显示 */
                      md:h-5 md:w-5 md:opacity-0 md:group-hover:opacity-100 md:group-hover:scale-100 md:scale-90
                    "
                    aria-label="删除图片"
                  >
                    <X className="h-3.5 w-3.5 md:h-3 md:w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="输入你的问题，或粘贴图片..."
            disabled={isLoading}
            rows={3}
            className="w-full resize-none bg-transparent text-sm leading-6 text-foreground placeholder-muted-foreground outline-none disabled:opacity-50"
          />

          <div className="flex items-center justify-between mt-2">
            {/* 左侧：工具栏 */}
            <div className="flex flex-wrap items-center gap-2">
              <ModelSelector
                selectedModelId={selectedModelId}
                onSelectModel={onModelChange}
                disabled={isLoading}
              />

              <div className="h-4 w-px bg-border/50 mx-1" />

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="上传图片"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">图片</span>
              </button>

              {availableTools.length > 0 && (
                <ToolSelector
                  tools={availableTools}
                  selectedTools={selectedTools}
                  onToolToggle={handleToolToggle}
                />
              )}

              {/* 已选工具徽章 */}
              <div className="hidden sm:flex items-center gap-2">
                {selectedTools.map((toolId) => {
                  const tool = availableTools.find(t => t.id === toolId)
                  if (!tool)
                    return null
                  return (
                    <ToolBadge
                      key={toolId}
                      name={tool.name}
                      icon={tool.icon}
                      onRemove={() => handleRemoveTool(toolId)}
                    />
                  )
                })}
              </div>
            </div>

            {/* 右侧：发送按钮和提示 */}
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-muted-foreground sm:inline-block">
                按
                {' '}
                <kbd className="rounded bg-muted px-1 py-0.5 font-mono font-medium text-foreground">Ctrl</kbd>
                {' '}
                +
                {' '}
                <kbd className="rounded bg-muted px-1 py-0.5 font-mono font-medium text-foreground">Enter</kbd>
                {' '}
                发送
              </span>
              {isLoading
                ? (
                    <button
                      type="button"
                      onClick={onStopGenerating}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-all hover:bg-accent hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      aria-label="终止对话"
                      title="终止对话"
                    >
                      <Circle className="h-4 w-4 stroke-2" />
                    </button>
                  )
                : (
                    <button
                      type="submit"
                      disabled={!input.trim() && selectedImages.length === 0}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow transition-all hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="发送"
                      title="发送"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  )}
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
