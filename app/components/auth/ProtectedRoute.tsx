'use client'

import { useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import AuthForm from './AuthForm'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  // 全局清理 URL 参数逻辑：即使用户已登录，也要清理 URL 中的错误信息或 token
  useEffect(() => {

  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm />
  }

  return <>{children}</>
}
