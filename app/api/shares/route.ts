import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { artifactService } from '@/app/services'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shareId = searchParams.get('shareId')

    if (!shareId) {
      return NextResponse.json({ error: '缺少 shareId' }, { status: 400 })
    }

    const artifact = await artifactService.getSharedByShareId(shareId)
    if (!artifact) {
      return NextResponse.json({ error: '未找到分享内容' }, { status: 404 })
    }

    return NextResponse.json({ artifact })
  }
  catch (e) {
    return NextResponse.json(
      { error: '获取分享失败', detail: String(e) },
      { status: 500 },
    )
  }
}
