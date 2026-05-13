-- Run in Supabase SQL Editor (or via CLI) once per project.
-- Creates public.profiles, migrates username/display_name/avatar_url out of
-- auth.users.raw_user_meta_data, installs a trigger so future signups get a
-- profile row automatically, backfills existing users (with collision
-- handling + NOTICE log of any suffixed usernames), then strips the
-- migrated keys from raw_user_meta_data. food_prefs stays in user_metadata.
--
-- After this migration, every signed-in user has exactly one profile row
-- with a guaranteed-unique username; the app should read/write those
-- fields against public.profiles, never against user_metadata.

-- ─── Table ────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Username searches drive lookups by handle in future /u/[username] pages;
-- the unique constraint already creates an index but we name it explicitly
-- for parity with the other migrations and so EXPLAIN output is readable.
create index if not exists profiles_username_idx on public.profiles (username);

-- ─── RLS ──────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;

drop policy if exists "Public read profiles" on public.profiles;
drop policy if exists "Authenticated insert own profile" on public.profiles;
drop policy if exists "Authenticated update own profile" on public.profiles;

create policy "Public read profiles"
  on public.profiles for select
  to public
  using (true);

create policy "Authenticated insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "Authenticated update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No delete policy by design — profile rows go away via the
-- auth.users → profiles cascade when the underlying account is deleted.

-- ─── Trigger for new signups ──────────────────────────────────────────────
--
-- Runs as security definer so the function can write to public.profiles
-- with the elevated privilege needed when auth.users inserts fire from
-- internal auth flows that may not have user_role permission. search_path
-- is pinned to defeat search-path-injection attacks on definer functions.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seed_username text;
  seed_display_name text;
  seed_avatar_url text;
  final_username text;
  suffix int := 2;
begin
  -- Pull seeds from raw_user_meta_data, treating empty strings as missing.
  seed_username := nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', '')), '');
  seed_display_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  seed_avatar_url := nullif(trim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), '');

  -- Missing username → fallback. Short id suffix is fine here because the
  -- 8-char prefix of a UUID has ~32 bits of entropy; collisions on the
  -- fallback alone are practically impossible.
  if seed_username is null then
    seed_username := 'user_' || substr(new.id::text, 1, 8);
  end if;

  -- Collision retry — append _2, _3, ... until the row inserts. We bound
  -- the loop at a high number to prevent runaway in pathological cases.
  final_username := seed_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    final_username := seed_username || '_' || suffix::text;
    suffix := suffix + 1;
    if suffix > 1000 then
      raise exception 'handle_new_user: could not allocate unique username from seed %', seed_username;
    end if;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (new.id, final_username, seed_display_name, seed_avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Backfill ─────────────────────────────────────────────────────────────
--
-- Walks every existing auth.users row, applies the same fallback +
-- collision rules as the trigger, and inserts into profiles. Uses ON
-- CONFLICT DO NOTHING on the id column so re-running the migration is
-- idempotent (existing rows aren't disturbed). Suffixed usernames are
-- logged via RAISE NOTICE for manual review.

do $$
declare
  rec record;
  seed_username text;
  seed_display_name text;
  seed_avatar_url text;
  final_username text;
  suffix int;
  collision_count int := 0;
  total_inserted int := 0;
begin
  for rec in
    select u.id, u.raw_user_meta_data
    from auth.users u
    where not exists (select 1 from public.profiles p where p.id = u.id)
  loop
    seed_username := nullif(trim(coalesce(rec.raw_user_meta_data ->> 'username', '')), '');
    seed_display_name := nullif(trim(coalesce(rec.raw_user_meta_data ->> 'display_name', '')), '');
    seed_avatar_url := nullif(trim(coalesce(rec.raw_user_meta_data ->> 'avatar_url', '')), '');

    if seed_username is null then
      seed_username := 'user_' || substr(rec.id::text, 1, 8);
    end if;

    final_username := seed_username;
    suffix := 2;
    while exists (select 1 from public.profiles where username = final_username) loop
      final_username := seed_username || '_' || suffix::text;
      suffix := suffix + 1;
      if suffix > 1000 then
        raise exception 'backfill: could not allocate unique username from seed % for user %',
          seed_username, rec.id;
      end if;
    end loop;

    insert into public.profiles (id, username, display_name, avatar_url)
    values (rec.id, final_username, seed_display_name, seed_avatar_url)
    on conflict (id) do nothing;

    total_inserted := total_inserted + 1;

    if final_username <> seed_username then
      collision_count := collision_count + 1;
      raise notice 'profiles backfill collision: user_id=% original=% final=%',
        rec.id, seed_username, final_username;
    end if;
  end loop;

  raise notice 'profiles backfill complete: % rows inserted, % suffixed for collision',
    total_inserted, collision_count;
end;
$$;

-- ─── Strip migrated keys from raw_user_meta_data ──────────────────────────
--
-- Surgical removal of only the three keys we just migrated. food_prefs and
-- any other keys are left intact. The `?` operator probes for key existence
-- so the UPDATE only touches rows that still carry at least one of the
-- migrated keys (avoids unnecessary row rewrites + index churn).

update auth.users
set raw_user_meta_data = raw_user_meta_data - 'username' - 'display_name' - 'avatar_url'
where raw_user_meta_data ? 'username'
   or raw_user_meta_data ? 'display_name'
   or raw_user_meta_data ? 'avatar_url';

-- ─── Verification ─────────────────────────────────────────────────────────
--
-- RAISE NOTICE the final counts: any non-zero `still_has_*` value indicates
-- the strip missed rows and should be investigated before proceeding.

do $$
declare
  still_has_username int;
  still_has_display_name int;
  still_has_avatar_url int;
  profile_rows int;
  user_rows int;
begin
  select count(*) into still_has_username from auth.users where raw_user_meta_data ? 'username';
  select count(*) into still_has_display_name from auth.users where raw_user_meta_data ? 'display_name';
  select count(*) into still_has_avatar_url from auth.users where raw_user_meta_data ? 'avatar_url';
  select count(*) into profile_rows from public.profiles;
  select count(*) into user_rows from auth.users;

  raise notice 'profiles migration verification:';
  raise notice '  auth.users rows               : %', user_rows;
  raise notice '  public.profiles rows          : %', profile_rows;
  raise notice '  user_metadata still has username    : %', still_has_username;
  raise notice '  user_metadata still has display_name: %', still_has_display_name;
  raise notice '  user_metadata still has avatar_url  : %', still_has_avatar_url;

  if still_has_username + still_has_display_name + still_has_avatar_url > 0 then
    raise warning 'profiles migration: stripped-key residue detected — re-run UPDATE block above';
  end if;
end;
$$;
