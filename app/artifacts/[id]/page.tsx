'use client'

import type { CanvasArtifact } from '@/app/canvas/canvas-types'
import { use, useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '@/app/components/auth/ProtectedRoute'
import { CodePreviewPanel } from '@/app/components/canvas/CodePreviewPanel'

type Viewport = 'desktop' | 'tablet' | 'phone'

interface PersistedArtifact {
  id: string
  title: string
  type: string
  language: string
  code: string
  created_at: string
}

export default function PersistedArtifactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [artifact, setArtifact] = useState<PersistedArtifact | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [executionError, setExecutionError] = useState('')
  const [_consoleOutput, setConsoleOutput] = useState<string[]>([])
  const [viewport, setViewport] = useState<Viewport>('desktop')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    setArtifact(null)

    fetch(`/api/artifacts?id=${encodeURIComponent(id)}`, { method: 'GET' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error || `请求失败(${res.status})`)
        }
        return data
      })
      .then((data) => {
        if (cancelled)
          return
        setArtifact(data.artifact || null)
      })
      .catch((e) => {
        if (cancelled)
          return
        setLoadError(String(e?.message || e))
      })
      .finally(() => {
        if (cancelled)
          return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const canvasArtifact = useMemo<CanvasArtifact | null>(() => {
    if (!artifact)
      return null

    const createdAt = new Date(artifact.created_at)

    return {
      id: artifact.id,
      type: (artifact.type === 'component' ? 'component' : 'react'),
      title: artifact.title || '未命名组件',
      code: {
        language: (artifact.language === 'jsx' ? 'jsx' : 'jsx'),
        content: artifact.code,
      },
      status: 'ready',
      isStreaming: false,
      messageId: '',
      sessionId: '',
      currentVersion: 1,
      createdAt,
      updatedAt: createdAt,
    }
  }, [artifact])

  return (
    <ProtectedRoute>
      <div className="h-screen w-full bg-[#0B1220] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-100 truncate">
              {artifact?.title || '预览'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={viewport}
              onChange={e => setViewport(e.target.value as Viewport)}
              className="h-8 rounded-md border border-slate-800 bg-transparent px-2 text-xs text-slate-200 outline-none hover:bg-slate-900"
              aria-label="切换视口"
            >
              <option value="desktop">Desktop</option>
              <option value="tablet">Tablet</option>
              <option value="phone">Phone</option>
            </select>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {loadError
            ? (
                <div className="h-full flex items-center justify-center px-4">
                  <div className="max-w-[720px] w-full rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">
                    {loadError}
                  </div>
                </div>
              )
            : loading || !canvasArtifact
              ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )
              : (
                  <div className="h-full flex flex-col bg-[#020617]">
                    <div className="flex-1 min-h-0 flex items-stretch justify-center">
                      <CodePreviewPanel
                        code={canvasArtifact.code.content}
                        artifact={canvasArtifact}
                        activeTab="preview"
                        viewport={viewport}
                        executionError={executionError}
                        onStatusChange={() => {}}
                        onConsoleOutput={setConsoleOutput}
                        onError={setExecutionError}
                      />
                    </div>
                  </div>
                )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
