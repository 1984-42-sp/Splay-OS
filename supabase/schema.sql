-- Splay OS Cloud Edition Phase 2
-- Run this file in the Supabase Dashboard SQL Editor.
-- It stores one JSONB Splay OS state row per authenticated user.

create extension if not exists pgcrypto;

create table if not exists public.splay_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  state_json jsonb not null,
  revision bigint not null default 1,
  source_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.splay_states is 'Splay OS Cloud State: one JSONB state row per authenticated user.';
comment on column public.splay_states.user_id is 'Owner auth.users.id. Enforced by RLS and a unique constraint.';
comment on column public.splay_states.state_json is 'Persistable Splay OS state JSON. Runtime-only UI/auth/session values are excluded by the client.';
comment on column public.splay_states.revision is 'Monotonic optimistic-lock revision. Client updates include the current revision in the WHERE clause.';

create index if not exists splay_states_updated_at_idx on public.splay_states (updated_at desc);

alter table public.splay_states enable row level security;

drop policy if exists "Users can read own splay state" on public.splay_states;
create policy "Users can read own splay state"
on public.splay_states
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own splay state" on public.splay_states;
create policy "Users can insert own splay state"
on public.splay_states
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own splay state" on public.splay_states;
create policy "Users can update own splay state"
on public.splay_states
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);