-- Run in Supabase SQL Editor (or via CLI) once per project.
-- Likes on a rating. Anyone (including unauthenticated visitors) can read
-- the count / like list; only the signed-in owner of a like row can create
-- or remove it. No update policy — a like is immutable once placed.
--
-- The table sits alongside `public.ratings` (PK `id`); deletes cascade so a
-- removed rating or a removed auth user cleans up its likes automatically.

create table if not exists public.rating_likes (
  id uuid primary key default gen_random_uuid(),
  rating_id uuid not null references public.ratings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint rating_likes_rating_id_user_id_key unique (rating_id, user_id)
);

create index if not exists rating_likes_rating_id_idx on public.rating_likes (rating_id);
create index if not exists rating_likes_user_id_idx on public.rating_likes (user_id);

alter table public.rating_likes enable row level security;

drop policy if exists "Public read rating_likes" on public.rating_likes;
drop policy if exists "Authenticated insert own rating_like" on public.rating_likes;
drop policy if exists "Authenticated delete own rating_like" on public.rating_likes;

create policy "Public read rating_likes"
  on public.rating_likes for select
  to public
  using (true);

create policy "Authenticated insert own rating_like"
  on public.rating_likes for insert
  to authenticated
  with check (user_id = auth.uid());

-- Postgres RLS uses USING (not WITH CHECK) for DELETE; same restriction
-- as the spec: only rows owned by the calling user are deletable.
create policy "Authenticated delete own rating_like"
  on public.rating_likes for delete
  to authenticated
  using (user_id = auth.uid());
