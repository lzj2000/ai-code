import { NextResponse } from 'next/server'
import { createSSRClient } from '@/app/database/supabase-server'

function sanitizeNextPath(nextParam: string | null): string {
  if (!nextParam)
    return '/'

  if (!nextParam.startsWith('/'))
    return '/'

  if (nextParam.startsWith('//'))
    return '/'

  return nextParam
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = url.origin
  const next = sanitizeNextPath(url.searchParams.get('next'))

  const supabase = await createSSRClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}`)
  }

  return NextResponse.redirect(data.url)
}

