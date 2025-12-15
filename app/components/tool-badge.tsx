import { X } from 'lucide-react'

interface ToolBadgeProps {
  name: string
  icon: string
  onRemove: () => void
}

export function ToolBadge({ name, icon, onRemove }: ToolBadgeProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10">
      <span>{icon}</span>
      <span>{name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 text-primary/60 hover:bg-primary/10 hover:text-primary"
      >
        <X className="h-3 w-3" />
        <span className="sr-only">
          移除
          {name}
        </span>
      </button>
    </div>
  )
}
