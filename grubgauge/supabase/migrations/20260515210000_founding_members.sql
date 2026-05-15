-- Run in Supabase SQL Editor (or via CLI) once per project.
-- Founding Member program: the first 100 users who post 3 qualifying ratings
-- (distinct place, photo attached, on 3 separate UTC calendar days, all on or
-- after the program launch timestamp) earn a numbered slot 1-100.
--
-- Slot assignment is server-side only via a SECURITY DEFINER trigger on
-- `public.ratings`; clients cannot insert / update / delete `founding_members`
-- directly. Slot ordering is a Postgres sequence so two simultaneous third-
-- qualifier inserts get monotonically-increasing slot numbers without an
-- explicit lock.
--
-- The single-tenant `app_config` row holds the program launch timestamp so
-- ratings made before launch never qualify, and the timestamp is queryable
-- from the client (the live counter / progress card surface "X spots left"
-- copy). The Founder (singular) is identified by env var at the application
-- layer, not by a row in `founding_members` — they're a separate kind of
-- badge and do not consume a numbered slot.

-- ─── app_config (singleton) ───────────────────────────────────────────────

create table if not exists public.app_config (
  id int primary key default 1 check (id = 1),
  founder_program_starts_at timestamptz not null default now()
);

insert into public.app_config (id)
values (1)
on conflict (id) do nothing;

alter table public.app_config enable row level security;

drop policy if exists "Public read app_config" on public.app_config;

create policy "Public read app_config"
  on public.app_config for select
  to public
  using (true);

-- No insert/update/delete policy — config is operator-managed via SQL only.

-- ─── founding_members ─────────────────────────────────────────────────────

create sequence if not exists public.founding_members_slot_seq
  start with 1
  increment by 1
  minvalue 1
  maxvalue 100
  no cycle;

create table if not exists public.founding_members (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  slot_number int  not null unique check (slot_number between 1 and 100),
  qualified_at timestamptz not null default now()
);

create index if not exists founding_members_slot_number_idx
  on public.founding_members (slot_number);

alter table public.founding_members enable row level security;

drop policy if exists "Public read founding_members" on public.founding_members;

create policy "Public read founding_members"
  on public.founding_members for select
  to public
  using (true);

-- No client-facing insert/update/delete policies. Assignment happens via
-- the SECURITY DEFINER trigger below; removals happen via the cascade
-- from auth.users (account deletion → slot retires forever, per spec).

-- ─── Slot-award trigger ───────────────────────────────────────────────────
--
-- Fires AFTER INSERT OR UPDATE on public.ratings. Cheap early exits keep
-- the post-100 / already-awarded paths at two index lookups; only the
-- pre-qualification path runs the more expensive distinct-day count.
--
-- "Qualifying day" = a calendar day (UTC) on which the user's first rating
-- for a previously-unrated place was posted with a photo, on or after the
-- program launch. We count distinct days from the user's set of {earliest
-- post per distinct place} so a single day with three new places only
-- contributes one qualifying day. The 3-day floor enforces the "not more
-- than one per day" rule without rejecting same-day extra ratings outright.
--
-- UPDATE OF meal_photo_url is included so a user can earn a slot by going
-- back and adding a photo to a previously-photo-less rating — common
-- real-world flow.

create or replace function public.maybe_award_founding_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  launch_at timestamptz;
  current_slot_count int;
  qualifying_days int;
  awarded_slot int;
begin
  -- Guard: guest ratings (no user_id) never qualify.
  if new.user_id is null then
    return new;
  end if;

  -- Fast exit: user is already a Founding Member. PK lookup, ~O(1).
  if exists (select 1 from public.founding_members where user_id = new.user_id) then
    return new;
  end if;

  -- Fast exit: all 100 slots already filled.
  select count(*) into current_slot_count from public.founding_members;
  if current_slot_count >= 100 then
    return new;
  end if;

  -- Program launch gate.
  select founder_program_starts_at into launch_at from public.app_config where id = 1;
  if launch_at is null then
    return new;
  end if;

  -- Count qualifying days for this user: distinct UTC days on which their
  -- earliest rating-with-photo for a never-before-rated place landed at or
  -- after launch.
  with eligible as (
    select place_id,
           min(created_at) as first_at
    from public.ratings
    where user_id = new.user_id
      and meal_photo_url is not null
      and place_id is not null
      and created_at >= launch_at
    group by place_id
  )
  select count(distinct (first_at at time zone 'UTC')::date)
    into qualifying_days
  from eligible;

  if qualifying_days >= 3 then
    -- Atomic slot allocation. The sequence is capped at MAXVALUE 100; if
    -- two qualifiers race here past the count() check above, the second
    -- will hit nextval() and raise sequence-exhausted, which we collapse
    -- to a silent skip — the slot count is already accurate.
    begin
      awarded_slot := nextval('public.founding_members_slot_seq');
    exception when sqlstate '2200H' then
      -- "sequence generates values outside its range" — race with another
      -- transaction. The other tx got the final slot; we don't.
      return new;
    end;

    insert into public.founding_members (user_id, slot_number)
    values (new.user_id, awarded_slot)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_rating_maybe_award_founding_member on public.ratings;

create trigger on_rating_maybe_award_founding_member
  after insert or update of meal_photo_url on public.ratings
  for each row execute function public.maybe_award_founding_member();

-- ─── Helper RPC: remaining slots (callable by anyone, used by counter UI) ─

create or replace function public.available_founder_slots()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select greatest(0, 100 - (select count(*)::int from public.founding_members));
$$;

grant execute on function public.available_founder_slots() to anon, authenticated;

-- ─── Backfill: existing users may already meet criteria post-launch ───────
--
-- Per spec, no grandfathering of pre-launch ratings. Because the trigger
-- gates on `created_at >= launch_at` and the launch timestamp is set to
-- now() at migration time, no existing rating qualifies on its own. The
-- backfill loop still walks current users so that any with photo edits
-- happening during the migration window are evaluated once — defensive,
-- not strictly necessary.

do $$
declare
  rec record;
begin
  for rec in select distinct user_id from public.ratings where user_id is not null
  loop
    -- Reuse the trigger's logic by faking an UPDATE on the user's most
    -- recent rating. The trigger early-exits if they already have a slot
    -- or if 100 slots are filled, so this is safe to call broadly.
    perform 1; -- placeholder to keep the loop body well-formed; the trigger
               -- will not fire from a SELECT, and we intentionally avoid a
               -- mass UPDATE here (would churn updated_at-like fields on
               -- every row). Backfill is a no-op for the launch-time use
               -- case; left as documentation of the design intent.
  end loop;
end;
$$;
