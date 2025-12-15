import { Check, ChevronUp, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export interface Tool {
  id: string
  name: string
  description: string
  icon: string
}

interface ToolSelectorProps {
  tools: Tool[]
  selectedTools: string[]
  onToolToggle: (toolId: string) => void
}

export function ToolSelector({ tools, selectedTools, onToolToggle }: ToolSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div
      className="relative"
      ref={menuRef}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${
          isOpen ? 'bg-accent text-foreground' : ''
        }`}
      >
        <Plus className="h-3.5 w-3.5" />
        <span>添加工具</span>
        <ChevronUp className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 z-50 w-64 pb-2 animate-in fade-in zoom-in-95 slide-in-from-bottom-2">
          <div className="origin-bottom-left rounded-lg border border-border bg-popover p-1 shadow-lg">
            <div className="mb-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              选择要使用的工具
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-0.5">
              {tools.map((tool) => {
                const isSelected = selectedTools.includes(tool.id)
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => onToolToggle(tool.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary hover:bg-primary/15'
                        : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center text-base">
                      {tool.icon}
                    </span>
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate font-medium">{tool.name}</span>
                      <span className="truncate text-xs opacity-70">{tool.description}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
