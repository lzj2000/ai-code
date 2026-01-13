import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface ArtifactRow {
  id: string
  title: string
  type: string
  language: string
  code: string
  user_id: string
  share_id?: string | null
  source_artifact_id?: string | null
  created_at: string
}

export interface CreateArtifactInput {
  id: string
  title: string
  type: string
  language: string
  code: string
  userId: string
  shareId?: string
  sourceArtifactId?: string
}

export async function createArtifact(input: CreateArtifactInput, client?: SupabaseClient): Promise<void> {
  const db = client || supabase
  const { error } = await db
    .from('artifacts')
    .insert({
      id: input.id,
      title: input.title,
      type: input.type,
      language: input.language,
      code: input.code,
      user_id: input.userId,
      share_id: input.shareId ?? null,
      source_artifact_id: input.sourceArtifactId ?? null,
    })

  if (error) {
    throw new Error(`创建 artifact 失败: ${error.message}`)
  }
}

export async function getArtifactById(id: string, userId: string, client?: SupabaseClient): Promise<ArtifactRow | null> {
  const db = client || supabase
  const { data, error } = await db
    .from('artifacts')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(`获取 artifact 失败: ${error.message}`)
  }

  return data || null
}
