'use client'

import type { CanvasFile } from '@/app/canvas/canvas-types'
import { useMemo } from 'react'

function normalizePath(input: string): string {
  const raw = String(input || '').replace(/\\/g, '/').trim()
  const noPrefix = raw.startsWith('./') ? raw.slice(2) : raw
  const parts = noPrefix.split('/').filter(Boolean)
  const stack: string[] = []
  for (const part of parts) {
    if (part === '.')
      continue
    if (part === '..') {
      stack.pop()
      continue
    }
    stack.push(part)
  }
  return stack.join('/')
}

export interface CanvasCodeFileViewerProps {
  files: CanvasFile[]
  activePath: string | null
  emptyHint?: string
}

export function CanvasCodeFileViewer({ files, activePath, emptyHint }: CanvasCodeFileViewerProps) {
  const normalizedActive = normalizePath(activePath || '')
  const file = useMemo(() => {
    if (!normalizedActive)
      return null
    return files.find(f => normalizePath(f.path) === normalizedActive) || null
  }, [files, normalizedActive])

  if (!file) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
        {emptyHint || '选择一个文件查看内容'}
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden flex flex-col">
      <div className="h-10 px-3 flex items-center justify-between border-b border-border bg-card">
        <div className="text-xs text-foreground truncate">{normalizePath(file.path)}</div>
        <div className="text-[11px] text-muted-foreground">{file.language}</div>
      </div>
      <div className="flex-1 overflow-auto bg-muted p-3">
        <pre className="text-xs text-foreground font-mono whitespace-pre-wrap break-words">
          {file.content}
        </pre>
      </div>
    </div>
  )
}
