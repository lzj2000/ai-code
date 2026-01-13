-- Supabase 初始化 SQL（Sessions + Artifacts + 分享链接无需登录 + Checkpoints Bucket）
-- 使用方式：把本文件整段粘贴到 Supabase SQL Editor 执行即可
--
-- 说明：
-- - sessions：会话表 + RLS（用户只能访问自己的会话）
-- - artifacts：代码产物持久化表 + RLS（用户只能访问自己的产物）
-- - share：通过 share_id + RPC 支持“无需登录”的分享链接访问（不开放表级 anon select，避免被枚举）
-- - storage：checkpoints bucket 访问策略（用于检查点/存储相关能力）

-- =========================================================
-- 01. sessions 表（会话）
-- =========================================================

create table if not exists public.sessions (
  id uuid primary key,
  name text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_user_id
  on public.sessions (user_id);

create index if not exists idx_sessions_created_at
  on public.sessions (created_at desc);

alter table public.sessions enable row level security;

drop policy if exists "Users can access their own sessions" on public.sessions;
create policy "Users can access their own sessions"
  on public.sessions
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =========================================================
-- 02. artifacts 表（产物持久化存储）
-- =========================================================

create table if not exists public.artifacts (
  id uuid primary key,
  title text not null,
  type text not null,
  language text not null default 'jsx',
  code text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  share_id uuid null,
  source_artifact_id text null,
  created_at timestamptz not null default now()
);

create index if not exists artifacts_user_id_created_at_idx
  on public.artifacts (user_id, created_at desc);

create index if not exists artifacts_source_artifact_id_idx
  on public.artifacts (source_artifact_id);

create index if not exists artifacts_share_id_idx
  on public.artifacts (share_id);

alter table public.artifacts enable row level security;

drop policy if exists "artifacts_select_own" on public.artifacts;
create policy "artifacts_select_own"
  on public.artifacts
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "artifacts_insert_own" on public.artifacts;
create policy "artifacts_insert_own"
  on public.artifacts
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- share_id 唯一：避免多个记录共用一个分享链接
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'artifacts_share_id_key'
  ) then
    alter table public.artifacts
      add constraint artifacts_share_id_key unique (share_id);
  end if;
end$$;

-- =========================================================
-- 03. 分享能力（无需登录访问）
-- =========================================================
-- 关键点：
-- - 不要给 anon 增加 artifacts 表的 select 权限/策略（否则容易被遍历/枚举）
-- - 匿名访问只允许通过 RPC 按 share_id 精确查询

create or replace function public.get_artifact_by_share_id(p_share_id uuid)
returns table (
  id uuid,
  title text,
  type text,
  language text,
  code text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    a.title,
    a.type,
    a.language,
    a.code,
    a.created_at
  from public.artifacts a
  where a.share_id = p_share_id
  limit 1;
$$;

grant execute on function public.get_artifact_by_share_id(uuid) to anon;
grant execute on function public.get_artifact_by_share_id(uuid) to authenticated;

-- =========================================================
-- 04. storage（checkpoints bucket 访问策略）
-- =========================================================
-- 注意：这里的策略针对 storage.objects（Supabase Storage 的元数据表）

drop policy if exists "Checkpoints bucket access" on storage.objects;
create policy "Checkpoints bucket access"
  on storage.objects
  for all
  using (bucket_id = 'checkpoints')
  with check (bucket_id = 'checkpoints');
