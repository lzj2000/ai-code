'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const { login, register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (isLogin) {
        const res = await login(email, password)
        if (!res.success) {
          setError(res.error || '登录失败')
        }
      }
      else {
        if (password !== confirmPassword) {
          setError('两次输入的密码不一致')
          return
        }
        const res = await register(email, password, name)
        if (res.success) {
          setMessage('注册成功，请检查邮箱进行验证，然后登录。')
          setIsLogin(true)
          setConfirmPassword('')
        }
        else {
          setError(res.error || '注册失败')
        }
      }
    }
    catch {
      setError('发生错误')
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-zinc-200/50 dark:shadow-black/50 border border-white/20 dark:border-zinc-800 ring-1 ring-zinc-900/5 transition-all duration-300">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {isLogin ? '欢迎回来' : '创建账号'}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isLogin ? '输入您的凭据以访问账户' : '填写下方信息开始您的旅程'}
          </p>
        </div>

        {error && (
          <div className="p-4 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/10 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/20 animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {message && (
          <div className="p-4 text-sm font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900/20 animate-in fade-in slide-in-from-top-2">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className={`space-y-5 transition-all duration-300 ease-in-out ${!isLogin ? 'opacity-100 max-h-96' : 'opacity-100'}`}>
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">
                  姓名
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-0 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all duration-200"
                  placeholder="请输入您的姓名"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-0 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all duration-200"
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-zinc-50 dark:bg-zinc-800/50 border-0 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all duration-200"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-2 my-auto flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showPassword ? '隐藏密码' : '显示密码'}</span>
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">
                  确认密码
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-0 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all duration-200"
                  placeholder="••••••••"
                  required
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-sm font-semibold text-white bg-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98] shadow-lg shadow-zinc-900/10"
          >
            {loading
              ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    处理中...
                  </span>
                )
              : (isLogin ? '登录' : '创建账号')}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-500">或者</span>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
              setMessage('')
              setPassword('')
              setConfirmPassword('')
              setShowPassword(false)
            }}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors duration-200 hover:underline underline-offset-4"
          >
            {isLogin ? '还没有账号？立即注册' : '已有账号？直接登录'}
          </button>
        </div>
      </div>
    </div>
  )
}
