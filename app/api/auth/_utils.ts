export function buildAuthResponse(result: any) {
  const data = result?.data
  const session = data?.session
  const user = data?.user

  return {
    success: true,
    data: {
      user,
      session: session
        ? {
            expires_at: session.expires_at,
            expires_in: session.expires_in,
            token_type: session.token_type,
          }
        : null,
    },
  }
}

export function buildErrorResponse(error: string) {
  return { success: false, error }
}

/**
 * 获取站点 URL
 * 优先使用环境变量，兜底为 localhost
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return url.replace(/\/$/, '') // 移除末尾的斜杠
}
