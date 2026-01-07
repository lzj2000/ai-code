'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { supabase } from '@/app/database/supabase'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('正在验证身份...')
  const [error, setError] = useState('')
  // 增加一个状态来防止重复处理
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const syncSessionAndRedirect = async (session: any) => {
      if (isProcessing) {
        return
      }

      setIsProcessing(true)
      setStatus('验证成功，正在登录...')

      try {
        const res = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session }),
        })

        if (res.ok) {
          window.location.href = '/'
        }
        else {
          const errorData = await res.json().catch(() => ({}))
          console.error('[AuthCallback] Session 同步失败:', res.status, errorData)
          throw new Error('同步会话失败')
        }
      }
      catch (err) {
        console.error('[AuthCallback] 同步过程发生异常:', err)
        setError('登录过程中发生系统错误')
        setIsProcessing(false)
      }
    }

    // 检查是否已经登录，如果已登录则跳过后续逻辑
    const checkCurrentSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('[AuthCallback] 获取当前 Session 失败:', error)
        return false
      }

      if (session) {
        // 已有 session，直接尝试同步并跳转
        syncSessionAndRedirect(session)
        return true
      }
      return false
    }

    const handleAuth = async () => {
      // 先检查当前状态，避免重复操作
      const hasSession = await checkCurrentSession()
      if (hasSession)
        return

      // 1. 处理服务端 PKCE 返回的 code (Query Param)
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('[AuthCallback] Code 交换失败:', error)
          setError(`验证失败: ${error.message}`)
          return
        }
        // exchangeCodeForSession 成功后会触发 onAuthStateChange，无需在此处手动调用 sync
      }

      // 2. 监听 Auth 状态变化 (自动处理 Hash 中的 access_token)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await syncSessionAndRedirect(session)
        }
      })

      return () => {
        subscription.unsubscribe()
      }
    }

    handleAuth()
  }, [searchParams, router]) // 移除 isProcessing 依赖，使用 ref 或者仅依赖初始挂载

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-red-500">
        <h2 className="text-xl font-bold mb-2">错误</h2>
        <p>{error}</p>
        <button type="button" onClick={() => router.push('/')} className="mt-4 text-blue-500 hover:underline">
          返回登录
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-pulse text-lg text-gray-600 dark:text-gray-300">
        {status}
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthCallbackContent />
    </Suspense>
  )
}
