'use client'

import type React from 'react'
import type { Tool } from './tool-selector'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { ToolBadge } from './tool-badge'
import { ToolSelector } from './tool-selector'

interface ChatInputProps {
  onSendMessage: (message: string, selectedTools?: string[]) => void
  isLoading: boolean
  availableTools?: Tool[]
}

export default function ChatInput({ onSendMessage, isLoading, availableTools = [] }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [selectedTools, setSelectedTools] = useState<string[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSendMessage(input, selectedTools)
      setInput('')
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

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-background px-4 py-4">
      <div className="mx-auto w-full">
        <div className="relative flex flex-col gap-2 rounded-xl border border-input bg-card p-4 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题..."
            disabled={isLoading}
            rows={3}
            className="w-full resize-none bg-transparent text-sm leading-6 text-foreground placeholder-muted-foreground outline-none disabled:opacity-50"
          />

          <div className="flex items-center justify-between mt-2">
            {/* 左侧：工具栏 */}
            <div className="flex flex-wrap items-center gap-2">
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
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow transition-all hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
