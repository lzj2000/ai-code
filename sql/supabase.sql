-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.artifacts (
  id uuid NOT NULL,
  title text NOT NULL,
  type text NOT NULL,
  language text NOT NULL DEFAULT 'jsx'::text,
  code text NOT NULL DEFAULT ''::text,
  user_id uuid NOT NULL,
  source_artifact_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  share_id uuid UNIQUE,
  project jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT artifacts_pkey PRIMARY KEY (id),
  CONSTRAINT artifacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.checkpoint_blobs (
  thread_id uuid NOT NULL,
  checkpoint_ns text NOT NULL DEFAULT ''::text,
  channel text NOT NULL,
  version text NOT NULL,
  type text NOT NULL DEFAULT 'json'::text,
  value text,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT checkpoint_blobs_pkey PRIMARY KEY (thread_id, checkpoint_ns, channel, version),
  CONSTRAINT checkpoint_blobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.checkpoint_writes (
  thread_id uuid NOT NULL,
  checkpoint_ns text NOT NULL DEFAULT ''::text,
  checkpoint_id text NOT NULL,
  task_id text NOT NULL,
  idx integer NOT NULL,
  channel text NOT NULL,
  type text NOT NULL DEFAULT 'json'::text,
  value bytea NOT NULL,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT checkpoint_writes_pkey PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx),
  CONSTRAINT checkpoint_writes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.checkpoints (
  thread_id uuid NOT NULL,
  checkpoint_ns text NOT NULL DEFAULT ''::text,
  checkpoint_id text NOT NULL,
  parent_checkpoint_id text,
  checkpoint jsonb NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT checkpoints_pkey PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id),
  CONSTRAINT checkpoints_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.sessions (
  id text NOT NULL,
  name text NOT NULL,
  user_id text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id)
);
