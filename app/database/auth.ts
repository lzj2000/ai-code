import { supabase } from './supabase'

// 通过 access_token 获取用户信息
export async function getUserByToken(token: string) {
  return supabase.auth.getUser(token)
}

// 邮箱 + 密码登录
export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

// 邮箱注册并写入用户 metadata
export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
  redirectTo: string,
) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: redirectTo,
    },
  })
}

// 通过 access_token 执行登出
export async function signOutWithToken(token: string) {
  const { error } = await supabase.auth.setSession({
    access_token: token,
    refresh_token: '',
  })

  if (error) {
    return { error }
  }

  return supabase.auth.signOut()
}

// 邮箱验证回调，交换 session
export async function exchangeCodeForSession(code: string) {
  return supabase.auth.exchangeCodeForSession(code)
}
