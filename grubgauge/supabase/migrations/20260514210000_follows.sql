-- Run in Supabase SQL Editor (or via CLI) once per project.
-- Directed follow graph between auth.users. Anyone (including unauthenticated
-- visitors) can read the graph so profile pages can render counts and lists;
-- only the signed-in follower can create or remove their own follow row. No
-- update policy — a follow is either present or absent, edits make no sense.
--
-- The table sits alongside public.profiles (1:1 with auth.users); deletes
-- cascade so a removed account also disappears from every other user's
-- followers/following lists automatically. The CHECK prevents self-follow at
-- the database layer so application bugs can never seed nonsense rows.

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint follows_pkey primary key (follower_id, followee_id),
  constraint follows_no_self_follow check (follower_id <> followee_id)
);

-- Followee-side index powers "who follows X" lookups (followers list +
-- follower count) and is the access path RLS uses when scoping selects.
create index if not exists follows_followee_id_idx on public.follows (followee_id);

-- Follower-side composite index keeps the "people I follow, newest first"
-- query covered without a filesort. follower_id alone is already implied by
-- the PK's left-most column, but the (follower_id, created_at desc) shape
-- matches the future following-feed query as well as the list page.
create index if not exists follows_follower_id_created_at_idx
  on public.follows (follower_id, created_at desc);

-- ─── RLS ──────────────────────────────────────────────────────────────────

alter table public.follows enable row level security;

drop policy if exists "Public read follows" on public.follows;
drop policy if exists "Authenticated insert own follow" on public.follows;
drop policy if exists "Authenticated delete own follow" on public.follows;

create policy "Public read follows"
  on public.follows for select
  to public
  using (true);

create policy "Authenticated insert own follow"
  on public.follows for insert
  to authenticated
  with check (follower_id = auth.uid());

-- Postgres RLS uses USING (not WITH CHECK) for DELETE; same restriction
-- as insert: only rows the calling user authored as follower are deletable.
create policy "Authenticated delete own follow"
  on public.follows for delete
  to authenticated
  using (follower_id = auth.uid());
