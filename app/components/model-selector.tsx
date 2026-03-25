'use client'

import { Check, ChevronDown, ChevronUp, Cpu, Sparkles, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AVAILABLE_MODELS } from '../agent/utils/models'

interface ModelSelectorProps {
  selectedModelId: string
  onSelectModel: (modelId: string) => void
  disabled?: boolean
}

export function ModelSelector({ selectedModelId, onSelectModel, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId) || AVAILABLE_MODELS[0]

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getModelIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return <Sparkles className="w-4 h-4 text-blue-500" />
      case 'glm':
        return <Cpu className="w-4 h-4 text-orange-500" />
      case 'openai':
        return <Zap className="w-4 h-4 text-green-500" />
      default:
        return <Cpu className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent/50 cursor-pointer'}
          bg-card border border-border/50 text-foreground shadow-sm
        `}
      >
        {getModelIcon(selectedModel.provider)}
        <span className="truncate max-w-[150px]">{selectedModel.name}</span>
        {isOpen ? <ChevronUp className="w-3 h-3 opacity-50" /> : <ChevronDown className="w-3 h-3 opacity-50" />}
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-[320px] max-h-[400px] overflow-y-auto rounded-xl border border-border bg-card shadow-lg z-50 p-1 custom-scrollbar">
          <div className="space-y-1">
            {AVAILABLE_MODELS.map(model => (
              <button
                key={model.id}
                onClick={() => {
                  onSelectModel(model.id)
                  setIsOpen(false)
                }}
                className={`
                  w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors group
                  ${selectedModelId === model.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'}
                `}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {getModelIcon(model.provider)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{model.name}</span>
                    {selectedModelId === model.id && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <div className="text-xs opacity-70 line-clamp-2 mt-0.5 font-normal">
                    {model.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
