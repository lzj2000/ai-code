'use client'

import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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
        const res = await register(email, password, name)
        if (res.success) {
          setMessage('注册成功，请检查邮箱进行验证，然后登录。')
          setIsLogin(true)
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
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700">
        <h2 className="text-2xl font-bold text-center text-zinc-900 dark:text-white">
          {isLogin ? '登录' : '注册'}
        </h2>

        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 text-sm text-green-500 bg-green-50 dark:bg-green-900/20 rounded-md">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                姓名
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 mt-1 border rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 mt-1 border rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 border rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
              setMessage('')
            }}
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            {isLogin ? '没有账号？去注册' : '已有账号？去登录'}
          </button>
        </div>
      </div>
    </div>
  )
}
