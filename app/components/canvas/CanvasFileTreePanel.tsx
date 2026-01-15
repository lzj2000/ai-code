'use client'

import type { ReactNode } from 'react'
import type { CanvasFile } from '@/app/canvas/canvas-types'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

type TreeNode
  = { kind: 'dir', name: string, path: string, children: TreeNode[] }
    | { kind: 'file', name: string, path: string }

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

function buildTree(files: CanvasFile[]): TreeNode {
  const root: TreeNode = { kind: 'dir', name: '', path: '', children: [] }

  const ensureDir = (parent: Extract<TreeNode, { kind: 'dir' }>, name: string, path: string) => {
    const found = parent.children.find(
      n => n.kind === 'dir' && n.name === name,
    ) as Extract<TreeNode, { kind: 'dir' }> | undefined
    if (found)
      return found
    const next: Extract<TreeNode, { kind: 'dir' }> = { kind: 'dir', name, path, children: [] }
    parent.children.push(next)
    return next
  }

  for (const f of files) {
    const filePath = normalizePath(f.path)
    if (!filePath)
      continue
    const parts = filePath.split('/').filter(Boolean)
    let dir = root as Extract<TreeNode, { kind: 'dir' }>
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]
      const isLast = i === parts.length - 1
      const nodePath = parts.slice(0, i + 1).join('/')
      if (isLast) {
        if (!dir.children.some(n => n.kind === 'file' && n.path === nodePath)) {
          dir.children.push({ kind: 'file', name, path: nodePath })
        }
      }
      else {
        dir = ensureDir(dir, name, nodePath)
      }
    }
  }

  const sortNode = (node: TreeNode) => {
    if (node.kind === 'dir') {
      node.children.forEach(sortNode)
      node.children.sort((a, b) => {
        if (a.kind !== b.kind)
          return a.kind === 'dir' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    }
  }
  sortNode(root)

  return root
}

function inferLanguageBadge(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith('.tsx'))
    return 'tsx'
  if (lower.endsWith('.ts'))
    return 'ts'
  if (lower.endsWith('.jsx'))
    return 'jsx'
  if (lower.endsWith('.js'))
    return 'js'
  if (lower.endsWith('.css'))
    return 'css'
  if (lower.endsWith('.json'))
    return 'json'
  if (lower.endsWith('.md'))
    return 'md'
  return ''
}

export interface CanvasFileTreePanelProps {
  files: CanvasFile[]
  activePath: string | null
  onSelect: (path: string) => void
}

export function CanvasFileTreePanel({ files, activePath, onSelect }: CanvasFileTreePanelProps) {
  const tree = useMemo(() => buildTree(files), [files])
  const [openDirs, setOpenDirs] = useState<Record<string, boolean>>({})

  const isOpen = useCallback((path: string) => {
    if (!path)
      return true
    return openDirs[path] !== false
  }, [openDirs])

  const toggleDir = useCallback((path: string) => {
    setOpenDirs(prev => ({ ...prev, [path]: !(prev[path] !== false) }))
  }, [])

  const renderNode = (node: TreeNode, depth: number): ReactNode => {
    if (node.kind === 'dir') {
      if (!node.path) {
        return node.children.map(child => renderNode(child, 0))
      }

      const open = isOpen(node.path)
      return (
        <div key={node.path}>
          <button
            type="button"
            className="w-full flex items-center gap-1 px-2 py-1 text-left text-xs text-foreground hover:bg-accent rounded"
            style={{ paddingLeft: 8 + depth * 12 }}
            onClick={() => toggleDir(node.path)}
            aria-label={open ? `折叠 ${node.name}` : `展开 ${node.name}`}
            title={node.name}
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <span className="truncate">{node.name}</span>
          </button>
          {open && (
            <div>
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    const active = activePath === node.path
    const badge = inferLanguageBadge(node.path)
    return (
      <button
        key={node.path}
        type="button"
        className={`w-full flex items-center gap-2 px-2 py-1 text-left text-xs rounded ${active ? 'bg-accent text-foreground' : 'text-foreground hover:bg-accent'}`}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => onSelect(node.path)}
        title={node.path}
        aria-label={`打开 ${node.path}`}
      >
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="truncate flex-1">{node.name}</span>
        {badge && (
          <span className="text-[10px] text-muted-foreground border border-border rounded px-1 py-0.5">
            {badge}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden flex flex-col">
      <div className="h-10 px-3 flex items-center justify-between border-b border-border">
        <div className="text-sm font-medium text-foreground">文件</div>
        <div className="text-[11px] text-muted-foreground">{files.length}</div>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {files.length === 0
          ? (
              <div className="text-xs text-muted-foreground px-2 py-2">
                暂无文件
              </div>
            )
          : (
              <div className="space-y-0.5">
                {renderNode(tree, 0)}
              </div>
            )}
      </div>
    </div>
  )
}
