'use client'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ModelConfig {
  provider: 'openai' | 'google' | 'qwen'
  modelName: string
  apiKey: string
  baseUrl?: string
}

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [config, setConfig] = useState<ModelConfig>({
    provider: 'openai',
    modelName: '',
    apiKey: '',
    baseUrl: '',
  })

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('modelConfig')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setConfig({
            provider: parsed.provider || 'openai',
            modelName: parsed.modelName || '',
            apiKey: parsed.apiKey || '',
            baseUrl: parsed.baseUrl || '',
          })
        }
        catch {
          // ignore
        }
      }
    }
  }, [isOpen])

  const handleSave = () => {
    localStorage.setItem('modelConfig', JSON.stringify(config))
    onClose()
  }

  if (!isOpen)
    return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg border border-border animate-in fade-in zoom-in duration-200">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">模型设置</h2>
          <button onClick={onClose} className="rounded-sm hover:bg-muted p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">模型提供商</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={config.provider}
              onChange={e => setConfig({ ...config, provider: e.target.value as any })}
            >
              <option value="openai">OpenAI</option>
              <option value="google">Google Gemini</option>
              <option value="qwen">阿里通义千问 (Qwen)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">模型名称</label>
            <input
              type="text"
              placeholder={
                config.provider === 'openai'
                  ? 'gpt-3.5-turbo'
                  : config.provider === 'google' ? 'gemini-pro' : 'qwen-plus'
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={config.modelName}
              onChange={e => setConfig({ ...config, modelName: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              留空则使用默认模型
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <input
              type="password"
              placeholder="请输入对应提供商的 API Key"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={config.apiKey}
              onChange={e => setConfig({ ...config, apiKey: e.target.value })}
            />
          </div>

        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
