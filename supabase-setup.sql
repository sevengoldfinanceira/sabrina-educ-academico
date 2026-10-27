create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;
revoke all on table public.app_state from anon, authenticated;
grant select, insert, update on table public.app_state to authenticated;

drop policy if exists "Users read own app state" on public.app_state;
create policy "Users read own app state" on public.app_state
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own app state" on public.app_state;
create policy "Users insert own app state" on public.app_state
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own app state" on public.app_state;
create policy "Users update own app state" on public.app_state
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
