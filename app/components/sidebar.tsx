'use client'

import {
  Check,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  Pencil,
  Plus,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'

interface Session {
  id: string
  name: string
  created_at: string
}

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  isCollapsed: boolean
  onCollapse: () => void
  currentSessionId: string
  onSelect: (id: string) => void
  onNew: (id: string) => void
}

const Sidebar = forwardRef((
  { isOpen, onToggle, isCollapsed, onCollapse, currentSessionId, onSelect, onNew }: SidebarProps,
  ref,
) => {
  const { logout } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [newSessionName, setNewSessionName] = useState('')

  async function fetchSessions() {
    try {
      const res = await fetch('/api/chat/sessions')
      const data = await res.json()
      if (Array.isArray(data.sessions)) {
        setSessions(data.sessions)
      }
    }
    catch {
      // ignore
    }
  }

  useImperativeHandle(ref, () => ({ fetchSessions }), [])

  useEffect(() => {
    fetchSessions()
  }, [])

  async function handleNew() {
    const res = await fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })
    const data = await res.json()
    if (data.id) {
      onNew(data.id)
      fetchSessions()
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()

    await fetch('/api/chat/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    const remainingSessions = sessions.filter(session => session.id !== id)
    if (remainingSessions.length > 0) {
      onSelect(remainingSessions[0].id)
    }
    else {
      handleNew()
    }

    fetchSessions()
  }

  async function startRename(id: string, currentName: string, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingSessionId(id)
    setNewSessionName(currentName)
  }

  async function saveRename(id: string) {
    if (!newSessionName.trim()) {
      setEditingSessionId(null)
      return
    }
    await fetch('/api/chat/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: newSessionName.trim() }),
    })
    setEditingSessionId(null)
    setNewSessionName('')
    fetchSessions()
  }

  // 主题状态
  const [isDark, setIsDark] = useState<boolean>(false)

  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
    setIsDark(initialDark)
    document.documentElement.classList.toggle('dark', initialDark)
  }, [])

  // 切换主题
  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    document.documentElement.classList.toggle('dark', newIsDark)
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light')
  }

  return (
    <>
      {/* 移动端遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
          onClick={onToggle}
        />
      )}

      {/* 侧边栏 */}
      <div
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out md:relative md:translate-x-0 md:my-3 md:ml-3 md:mr-3 md:h-[calc(100vh-1.5rem)] md:rounded-2xl md:border md:border-sidebar-border md:overflow-hidden md:shadow-sm ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'md:w-16' : 'w-64'}`}
      >
        <div className="border-b border-sidebar-border px-4 py-4">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <span className="text-base font-semibold text-sidebar-foreground">
                对话
              </span>
            )}
            <div className="flex items-center gap-1">
              <button
                className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground"
                onClick={onCollapse}
                name={isCollapsed ? '展开侧边栏' : '收起侧边栏'}
              >
                {isCollapsed
                  ? (
                      <ChevronRight className="h-4 w-4" />
                    )
                  : (
                      <ChevronLeft className="h-4 w-4" />
                    )}
              </button>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors md:hidden text-muted-foreground"
                onClick={onToggle}
              >
                <Menu className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 新建对话按钮 */}
        <div className="px-3 py-3">
          <button
            className={`group flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] ${isCollapsed ? 'w-10 h-10 p-0 mx-auto' : 'w-full'
            }`}
            onClick={handleNew}
            name="新建对话"
          >
            <Plus className="h-4 w-4" />
            {!isCollapsed && <span>新建对话</span>}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="space-y-1">
            {sessions.map(conv => (
              <div
                key={conv.id}
                className={`group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${currentSessionId === conv.id ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/50'
                }`}
                onClick={() => onSelect(conv.id)}
              >
                {!isCollapsed
                  ? (
                      <>
                        {editingSessionId === conv.id
                          ? (
                              <div className="flex flex-1 items-center gap-1" onClick={e => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={newSessionName}
                                  onChange={e => setNewSessionName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter')
                                      saveRename(conv.id)
                                    if (e.key === 'Escape')
                                      setEditingSessionId(null)
                                  }}
                                  onBlur={() => saveRename(conv.id)}
                                  className="w-full rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
                                  autoFocus
                                />
                                <button
                                  className="p-1 text-primary hover:text-primary/80"
                                  onClick={() => saveRename(conv.id)}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  className="p-1 text-muted-foreground hover:text-destructive"
                                  onClick={() => setEditingSessionId(null)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )
                          : (
                              <>
                                <div className="flex-1 overflow-hidden group/item">
                                  <p className="truncate text-sm text-sidebar-foreground">
                                    {conv.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {conv.created_at}
                                  </p>
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                  <button
                                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-primary hover:shadow-sm transition-all"
                                    onClick={e => startRename(conv.id, conv.name, e)}
                                    title="重命名"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-destructive hover:shadow-sm transition-all"
                                    onClick={(e) => {
                                      handleDelete(conv.id, e)
                                    }}
                                    title="删除对话"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                      </>
                    )
                  : (
                      <div className="relative mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground font-medium text-xs">
                        {conv.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
              </div>
            ))}
          </div>
        </div>

        {/* 底部设置与主题切换 */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <button
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-sidebar-accent transition-colors ${isCollapsed ? 'w-10 h-10 p-0 justify-center mx-auto' : 'w-full'
            }`}
            onClick={logout}
            name="退出登录"
            title="退出登录"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
            {!isCollapsed && (
              <span className="text-muted-foreground">
                退出登录
              </span>
            )}
          </button>
          <button
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-sidebar-accent transition-colors ${isCollapsed ? 'w-10 h-10 p-0 justify-center mx-auto' : 'w-full'
            }`}
            onClick={toggleTheme}
            name={isDark ? '切换到亮色模式' : '切换到暗黑模式'}
            title={isDark ? '切换到亮色模式' : '切换到暗黑模式'}
          >
            {isDark
              ? (
                  <Sun className="h-4 w-4 text-foreground" />
                )
              : (
                  <Moon className="h-4 w-4 text-muted-foreground" />
                )}
            {!isCollapsed && (
              <span className="text-muted-foreground">
                {isDark ? '亮色模式' : '暗黑模式'}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  )
})

Sidebar.displayName = 'Sidebar'

export default Sidebar
