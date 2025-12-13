"use client"

import type React from "react"
import { useState } from "react"
import { Send } from "lucide-react"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isLoading: boolean
}

export default function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSendMessage(input)
      setInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-background px-4 py-4">
      <div className="mx-auto w-full">
        <div className="flex items-end gap-3 rounded-lg border border-input bg-card p-3 transition-all focus-within:border-foreground/30 focus-within:ring-1 focus-within:ring-foreground/10">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题..."
            disabled={isLoading}
            rows={3}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 text-foreground placeholder-muted-foreground outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">按 Ctrl+Enter 发送消息</p>
      </div>
    </form>
  )
}
