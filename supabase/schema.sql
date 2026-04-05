-- Run this in your Supabase SQL Editor (project > SQL Editor > New query)

-- 1. Watchlist table
create table if not exists public.watchlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  symbol      text not null,
  name        text not null default '',
  asset_type  text not null default '',
  created_at  timestamptz not null default now(),
  unique (user_id, symbol)
);

-- 2. Row-Level Security: users can only see/edit their own rows
alter table public.watchlist enable row level security;

create policy "Users can view own watchlist"
  on public.watchlist for select
  using (auth.uid() = user_id);

create policy "Users can insert own watchlist"
  on public.watchlist for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own watchlist"
  on public.watchlist for delete
  using (auth.uid() = user_id);

-- 3. Index for fast lookups
create index if not exists watchlist_user_id_idx on public.watchlist(user_id);
