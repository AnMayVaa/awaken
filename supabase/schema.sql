-- AWAKEN cloud save schema (run once in Supabase → SQL Editor)
-- One row per player. The whole game state is stored as JSON and
-- protected by Row Level Security: users can only touch their own row.

create table if not exists public.player_states (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  state        jsonb       not null,
  level        integer     not null default 1,
  rank         text        not null default 'E',
  display_name text,
  updated_at   timestamptz not null default now()
);

alter table public.player_states enable row level security;

drop policy if exists "Players can read their own save" on public.player_states;
create policy "Players can read their own save"
  on public.player_states for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Players can create their own save" on public.player_states;
create policy "Players can create their own save"
  on public.player_states for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Players can update their own save" on public.player_states;
create policy "Players can update their own save"
  on public.player_states for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Players can delete their own save" on public.player_states;
create policy "Players can delete their own save"
  on public.player_states for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------
-- v2: AI Quest Director usage log (per-user daily limit)
-- ---------------------------------------------------------------
create table if not exists public.ai_requests (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  model      text,
  created_at timestamptz not null default now()
);

create index if not exists ai_requests_user_time on public.ai_requests (user_id, created_at desc);

alter table public.ai_requests enable row level security;

drop policy if exists "Players can read their own AI usage" on public.ai_requests;
create policy "Players can read their own AI usage"
  on public.ai_requests for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Players can log their own AI usage" on public.ai_requests;
create policy "Players can log their own AI usage"
  on public.ai_requests for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
