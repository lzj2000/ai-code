'use client'

import { Menu, PanelLeft, PanelLeftClose } from 'lucide-react'

interface ChatHeaderProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  sidebarCollapsed: boolean
  onToggleCollapse: () => void
}

export default function ChatHeader({ onToggleSidebar, sidebarCollapsed, onToggleCollapse }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
      <div className="flex items-center gap-3">
        {/* 移动端菜单按钮 */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors md:hidden text-muted-foreground"
          onClick={onToggleSidebar}
          title="打开菜单"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          onClick={onToggleCollapse}
          title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
        <h2 className="text-sm font-medium text-foreground">新对话</h2>
      </div>
    </header>
  )
}
