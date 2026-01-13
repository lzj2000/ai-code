import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { supabase } from '@/app/database'
import { createArtifact as dbCreateArtifact, getArtifactById as dbGetArtifactById } from '@/app/database/artifacts'

export interface CreateArtifactRequest {
  title?: string
  type?: string
  language?: string
  code: string
  sourceArtifactId?: string
}

export interface CreateArtifactResult {
  id: string
  url: string
}

export class ArtifactService {
  async getById(id: string, userId: string, client?: SupabaseClient) {
    if (!id) {
      throw new Error('缺少 id')
    }
    if (!userId) {
      throw new Error('缺少 userId')
    }
    return dbGetArtifactById(id, userId, client)
  }

  async create(input: CreateArtifactRequest, userId: string, client?: SupabaseClient): Promise<CreateArtifactResult> {
    if (!userId) {
      throw new Error('缺少 userId')
    }

    const code = typeof input?.code === 'string' ? input.code : ''
    if (!code.trim()) {
      throw new Error('缺少 code')
    }

    const id = randomUUID()
    const title = typeof input?.title === 'string' && input.title ? input.title : '未命名组件'
    const type = typeof input?.type === 'string' && input.type ? input.type : 'react'
    const language = typeof input?.language === 'string' && input.language ? input.language : 'jsx'
    const sourceArtifactId = typeof input?.sourceArtifactId === 'string' ? input.sourceArtifactId : undefined

    await dbCreateArtifact(
      {
        id,
        title,
        type,
        language,
        code,
        userId,
        sourceArtifactId,
      },
      client,
    )

    return { id, url: `/artifacts/${id}` }
  }

  async createShare(input: CreateArtifactRequest, userId: string, client?: SupabaseClient): Promise<{ shareId: string, url: string }> {
    if (!userId) {
      throw new Error('缺少 userId')
    }

    const code = typeof input?.code === 'string' ? input.code : ''
    if (!code.trim()) {
      throw new Error('缺少 code')
    }

    const id = randomUUID()
    const shareId = randomUUID()
    const title = typeof input?.title === 'string' && input.title ? input.title : '未命名组件'
    const type = typeof input?.type === 'string' && input.type ? input.type : 'react'
    const language = typeof input?.language === 'string' && input.language ? input.language : 'jsx'
    const sourceArtifactId = typeof input?.sourceArtifactId === 'string' ? input.sourceArtifactId : undefined

    await dbCreateArtifact(
      {
        id,
        title,
        type,
        language,
        code,
        userId,
        shareId,
        sourceArtifactId,
      },
      client,
    )

    return { shareId, url: `/share/${shareId}` }
  }

  async getSharedByShareId(shareId: string, client?: SupabaseClient) {
    if (!shareId) {
      throw new Error('缺少 shareId')
    }

    const db = client || supabase
    const { data, error } = await db.rpc('get_artifact_by_share_id', {
      p_share_id: shareId,
    })

    if (error) {
      throw new Error(`获取分享 artifact 失败: ${error.message}`)
    }

    if (Array.isArray(data)) {
      return data[0] || null
    }

    return data || null
  }
}

export const artifactService = new ArtifactService()
